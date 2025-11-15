/**
 * Centralized Logging Utility
 * Provides structured logging with levels, context, and performance tracking
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  functionName?: string;
  requestId?: string;
  [key: string]: any;
}

/**
 * Structured logger with automatic context
 */
export class Logger {
  private context: LogContext;
  private startTime: number;

  constructor(context: LogContext = {}) {
    this.context = context;
    this.startTime = Date.now();
  }

  /**
   * Add context to all subsequent logs
   */
  addContext(additionalContext: LogContext): void {
    this.context = { ...this.context, ...additionalContext };
  }

  /**
   * Log with level
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const elapsed = Date.now() - this.startTime;

    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      elapsed: `${elapsed}ms`,
      ...this.context,
      ...(data && { data }),
    };

    const formattedMessage = `[${level.toUpperCase()}] [${
      this.context.functionName || "unknown"
    }] ${message}`;

    switch (level) {
      case "debug":
        console.debug(formattedMessage, logEntry);
        break;
      case "info":
        console.log(formattedMessage, logEntry);
        break;
      case "warn":
        console.warn(formattedMessage, logEntry);
        break;
      case "error":
        console.error(formattedMessage, logEntry);
        break;
    }
  }

  debug(message: string, data?: any): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: any): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: any): void {
    this.log("warn", message, data);
  }

  error(message: string, error?: Error | any): void {
    const errorData = error
      ? {
          message: error.message,
          stack: error.stack,
          code: error.code,
          ...error,
        }
      : undefined;

    this.log("error", message, errorData);
  }

  /**
   * Measure execution time of a function
   */
  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    this.info(`${label} - started`);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`${label} - completed`, { duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} - failed`, {
        duration: `${duration}ms`,
        error,
      });
      throw error;
    }
  }

  /**
   * Log with performance metrics
   */
  performance(label: string, metrics: Record<string, number | string>): void {
    this.info(label, { metrics });
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }
}

/**
 * Create a logger for a Cloud Function
 */
export function createLogger(functionName: string, userId?: string): Logger {
  return new Logger({
    functionName,
    userId,
    requestId: generateRequestId(),
  });
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Global error logger
 */
export function logError(
  context: string,
  error: Error | any,
  metadata?: Record<string, any>
): void {
  console.error(`[ERROR] ${context}`, {
    message: error.message || String(error),
    stack: error.stack,
    code: error.code,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Performance tracker
 */
export class PerformanceTracker {
  private checkpoints: Map<string, number> = new Map();
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Mark a checkpoint
   */
  checkpoint(label: string): void {
    this.checkpoints.set(label, Date.now());
  }

  /**
   * Get duration from start
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get duration between checkpoints
   */
  getDurationBetween(from: string, to: string): number | null {
    const fromTime = this.checkpoints.get(from);
    const toTime = this.checkpoints.get(to);

    if (!fromTime || !toTime) {
      return null;
    }

    return toTime - fromTime;
  }

  /**
   * Get all metrics
   */
  getMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {
      totalDuration: this.getDuration(),
    };

    const checkpointArray = Array.from(this.checkpoints.entries());
    for (let i = 0; i < checkpointArray.length; i++) {
      const [label, time] = checkpointArray[i];
      const prevTime = i === 0 ? this.startTime : checkpointArray[i - 1][1];
      metrics[label] = time - prevTime;
    }

    return metrics;
  }

  /**
   * Log metrics
   */
  logMetrics(logger: Logger): void {
    logger.performance("Function execution metrics", this.getMetrics());
  }
}
