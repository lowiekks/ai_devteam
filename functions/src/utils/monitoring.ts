/**
 * Performance Monitoring and Metrics Utility
 * Tracks function performance, errors, and usage patterns
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";

export interface PerformanceMetric {
  functionName: string;
  userId?: string;
  duration: number;
  success: boolean;
  timestamp: FirebaseFirestore.Timestamp;
  error?: string;
  metadata?: Record<string, any>;
}

export interface UsageMetric {
  userId: string;
  action: string;
  count: number;
  lastUsed: FirebaseFirestore.Timestamp;
}

/**
 * Track function performance metrics
 */
export async function trackPerformance(
  functionName: string,
  duration: number,
  success: boolean,
  userId?: string,
  error?: Error,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const db = getFirestore();

    const metric: Partial<PerformanceMetric> = {
      functionName,
      duration,
      success,
      timestamp: FieldValue.serverTimestamp() as any,
      ...(userId && { userId }),
      ...(error && { error: error.message }),
      ...(metadata && { metadata }),
    };

    // Store in performance_metrics collection (for analytics)
    await db.collection("performance_metrics").add(metric);

    // Also update aggregate stats
    const statsRef = db.collection("function_stats").doc(functionName);
    const statsDoc = await statsRef.get();

    if (statsDoc.exists) {
      const stats = statsDoc.data()!;
      await statsRef.update({
        totalCalls: (stats.totalCalls || 0) + 1,
        successCount: success ? (stats.successCount || 0) + 1 : stats.successCount || 0,
        errorCount: success ? stats.errorCount || 0 : (stats.errorCount || 0) + 1,
        totalDuration: (stats.totalDuration || 0) + duration,
        avgDuration: ((stats.totalDuration || 0) + duration) / ((stats.totalCalls || 0) + 1),
        lastCalled: FieldValue.serverTimestamp(),
      });
    } else {
      await statsRef.set({
        functionName,
        totalCalls: 1,
        successCount: success ? 1 : 0,
        errorCount: success ? 0 : 1,
        totalDuration: duration,
        avgDuration: duration,
        firstCalled: FieldValue.serverTimestamp(),
        lastCalled: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    // Don't let monitoring failures break the main function
    console.error("Failed to track performance:", error);
  }
}

/**
 * Track user action/usage
 */
export async function trackUsage(
  userId: string,
  action: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const db = getFirestore();

    // Increment counter
    const usageRef = db
      .collection("user_usage")
      .doc(userId)
      .collection("actions")
      .doc(action);

    const usageDoc = await usageRef.get();

    if (usageDoc.exists) {
      await usageRef.update({
        count: FieldValue.increment(1),
        lastUsed: FieldValue.serverTimestamp(),
        ...(metadata && { lastMetadata: metadata }),
      });
    } else {
      await usageRef.set({
        userId,
        action,
        count: 1,
        firstUsed: FieldValue.serverTimestamp(),
        lastUsed: FieldValue.serverTimestamp(),
        ...(metadata && { lastMetadata: metadata }),
      });
    }
  } catch (error) {
    console.error("Failed to track usage:", error);
  }
}

/**
 * Track error occurrence
 */
export async function trackError(
  functionName: string,
  error: Error,
  userId?: string,
  context?: Record<string, any>
): Promise<void> {
  try {
    const db = getFirestore();

    await db.collection("error_logs").add({
      functionName,
      errorMessage: error.message,
      errorStack: error.stack,
      errorCode: (error as any).code,
      userId,
      context,
      timestamp: FieldValue.serverTimestamp(),
    });

    // Update error stats
    const errorStatsRef = db
      .collection("error_stats")
      .doc(`${functionName}_${error.message.substring(0, 50)}`);

    const errorStatsDoc = await errorStatsRef.get();

    if (errorStatsDoc.exists) {
      await errorStatsRef.update({
        count: FieldValue.increment(1),
        lastOccurred: FieldValue.serverTimestamp(),
      });
    } else {
      await errorStatsRef.set({
        functionName,
        errorMessage: error.message,
        count: 1,
        firstOccurred: FieldValue.serverTimestamp(),
        lastOccurred: FieldValue.serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("Failed to track error:", err);
  }
}

/**
 * Decorator for automatic performance tracking
 */
export function withMonitoring<T>(
  functionName: string,
  fn: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    const startTime = Date.now();
    let success = false;
    let error: Error | undefined;

    try {
      const result = await fn(...args);
      success = true;
      return result;
    } catch (err: any) {
      error = err;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      await trackPerformance(functionName, duration, success, undefined, error);
    }
  };
}

/**
 * Get function statistics
 */
export async function getFunctionStats(
  functionName: string
): Promise<any> {
  const db = getFirestore();
  const statsDoc = await db.collection("function_stats").doc(functionName).get();

  if (!statsDoc.exists) {
    return null;
  }

  return statsDoc.data();
}

/**
 * Get user usage statistics
 */
export async function getUserUsage(userId: string): Promise<any[]> {
  const db = getFirestore();
  const usageSnapshot = await db
    .collection("user_usage")
    .doc(userId)
    .collection("actions")
    .orderBy("count", "desc")
    .limit(20)
    .get();

  return usageSnapshot.docs.map((doc) => doc.data());
}

/**
 * Alert on high error rate
 */
export async function checkErrorThreshold(
  functionName: string,
  threshold: number = 0.1 // 10% error rate
): Promise<boolean> {
  const stats = await getFunctionStats(functionName);

  if (!stats || stats.totalCalls === 0) {
    return false;
  }

  const errorRate = stats.errorCount / stats.totalCalls;

  if (errorRate > threshold) {
    console.warn(
      `[ALERT] High error rate for ${functionName}: ${(errorRate * 100).toFixed(
        2
      )}% (${stats.errorCount}/${stats.totalCalls})`
    );
    return true;
  }

  return false;
}

/**
 * Lightweight monitoring for Cloud Functions
 * Usage: Wrap your function logic with this
 */
export async function monitoredFunction<T>(
  functionName: string,
  userId: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let error: Error | undefined;

  try {
    const result = await fn();
    success = true;
    return result;
  } catch (err: any) {
    error = err;
    await trackError(functionName, err, userId);
    throw err;
  } finally {
    const duration = Date.now() - startTime;
    await trackPerformance(functionName, duration, success, userId, error);

    if (userId) {
      await trackUsage(userId, functionName);
    }
  }
}
