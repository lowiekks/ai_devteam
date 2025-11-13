/**
 * API Functions for User Settings
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Get user settings
 */
export const getUserSettings = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      // Create default settings if user doesn't exist
      const defaultSettings = {
        uid: userId,
        email: context.auth.token.email || "",
        plan: "free",
        platforms: {},
        settings: {
          auto_replace: false,
          min_supplier_rating: 4.5,
          max_price_variance: 10,
        },
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      await db.collection("users").doc(userId).set(defaultSettings);
      return { success: true, settings: defaultSettings };
    }

    return { success: true, settings: userDoc.data() };
  } catch (error) {
    console.error("Error fetching settings:", error);
    throw new functions.https.HttpsError("internal", "Failed to fetch settings");
  }
});

/**
 * Update user settings
 */
export const updateUserSettings = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    await db
      .collection("users")
      .doc(userId)
      .update({
        ...data,
        updated_at: FieldValue.serverTimestamp(),
      });

    return { success: true };
  } catch (error) {
    console.error("Error updating settings:", error);
    throw new functions.https.HttpsError("internal", "Failed to update settings");
  }
});
