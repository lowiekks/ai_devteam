/**
 * API Functions for Product Management
 * Callable from the dashboard
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Product } from "../../../shared/types/database";

/**
 * Get all monitored products for a user
 */
export const getMonitoredProducts = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    const productsSnapshot = await db.collection("products").where("user_id", "==", userId).get();

    const products: Product[] = [];
    productsSnapshot.forEach((doc) => {
      products.push({
        product_id: doc.id,
        ...doc.data(),
      } as Product);
    });

    // Sort by risk score (highest first)
    products.sort((a, b) => (b.ai_insights?.risk_score || 0) - (a.ai_insights?.risk_score || 0));

    return { success: true, products };
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new functions.https.HttpsError("internal", "Failed to fetch products");
  }
});

/**
 * Add a new product to monitoring
 */
export const addProductToMonitoring = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { platformProductId, platform, supplierUrl, productName, imageUrl } = data;

  if (!platformProductId || !platform || !supplierUrl || !productName || !imageUrl) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    // Create new product document
    const productRef = await db.collection("products").add({
      user_id: userId,
      platform,
      platform_id: platformProductId,
      name: productName,
      original_image_url: imageUrl,
      monitored_supplier: {
        url: supplierUrl,
        status: "ACTIVE",
        current_price: 0, // Will be updated on first scrape
        stock_level: 999,
        last_checked: FieldValue.serverTimestamp(),
      },
      ai_insights: {
        risk_score: 50,
        predicted_removal_date: null,
        last_analyzed: FieldValue.serverTimestamp(),
      },
      automation_log: [],
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    return { success: true, productId: productRef.id };
  } catch (error) {
    console.error("Error adding product:", error);
    throw new functions.https.HttpsError("internal", "Failed to add product");
  }
});
