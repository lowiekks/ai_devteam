/**
 * API Functions for Analytics
 */

import * as functions from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Get analytics for dashboard
 */
export const getAnalytics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const db = getFirestore();
  const userId = context.auth.uid;
  const { timeRange = "7d" } = data; // 7d, 30d, 90d

  try {
    // Calculate date range
    const daysMap: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
    };
    const daysBack = daysMap[timeRange] || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Fetch analytics events
    const eventsSnapshot = await db
      .collection("analytics")
      .where("user_id", "==", userId)
      .where("timestamp", ">=", startDate)
      .orderBy("timestamp", "desc")
      .get();

    const events: any[] = [];
    eventsSnapshot.forEach((doc) => {
      events.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Calculate statistics
    const stats = {
      total_products_removed: events.filter((e) => e.event_type === "product_removed").length,
      auto_heal_success: events.filter((e) => e.event_type === "auto_heal_success").length,
      auto_heal_failed: events.filter((e) => e.event_type === "auto_heal_failed").length,
      price_changes: events.filter((e) => e.event_type === "price_changed").length,
      scrapes_completed: events.filter((e) => e.event_type === "scrape_completed").length,
    };

    return {
      success: true,
      stats,
      events: events.slice(0, 100), // Limit to 100 recent events
    };
  } catch (error) {
    console.error("Error fetching analytics:", error);
    throw new functions.https.HttpsError("internal", "Failed to fetch analytics");
  }
});
