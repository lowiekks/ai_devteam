/**
 * API Functions for Enhanced Products Management
 * Callable from the dashboard
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { EnhancedProduct } from "../../../shared/types/database";

/**
 * Get all enhanced products for a user
 */
export const getEnhancedProducts = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    const enhancedProductsSnapshot = await db
      .collection("enhanced_products")
      .where("user_id", "==", userId)
      .orderBy("created_at", "desc")
      .get();

    const enhancedProducts: EnhancedProduct[] = [];
    enhancedProductsSnapshot.forEach((doc) => {
      enhancedProducts.push({
        enhanced_product_id: doc.id,
        ...doc.data(),
      } as EnhancedProduct);
    });

    return { success: true, enhancedProducts };
  } catch (error) {
    console.error("Error fetching enhanced products:", error);
    throw new functions.https.HttpsError("internal", "Failed to fetch enhanced products");
  }
});

/**
 * Get a single enhanced product
 */
export const getEnhancedProduct = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { enhancedProductId } = data;

  if (!enhancedProductId) {
    throw new functions.https.HttpsError("invalid-argument", "enhancedProductId is required");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    const enhancedProductDoc = await db.collection("enhanced_products").doc(enhancedProductId).get();

    if (!enhancedProductDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Enhanced product not found");
    }

    const enhancedProduct = enhancedProductDoc.data();

    // Verify ownership
    if (enhancedProduct?.user_id !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Not authorized");
    }

    return {
      success: true,
      enhancedProduct: {
        enhanced_product_id: enhancedProductDoc.id,
        ...enhancedProduct,
      } as EnhancedProduct,
    };
  } catch (error: any) {
    console.error("Error fetching enhanced product:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to fetch enhanced product");
  }
});

/**
 * Update enhanced product (for manual edits before publishing)
 */
export const updateEnhancedProduct = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { enhancedProductId, updates } = data;

  if (!enhancedProductId || !updates) {
    throw new functions.https.HttpsError("invalid-argument", "enhancedProductId and updates are required");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    const enhancedProductRef = db.collection("enhanced_products").doc(enhancedProductId);
    const enhancedProductDoc = await enhancedProductRef.get();

    if (!enhancedProductDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Enhanced product not found");
    }

    const enhancedProduct = enhancedProductDoc.data();

    // Verify ownership
    if (enhancedProduct?.user_id !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Not authorized");
    }

    // Update product
    await enhancedProductRef.update({
      ...updates,
      updated_at: FieldValue.serverTimestamp(),
    });

    // Log activity
    await db.collection("activity_logs").add({
      action: "update",
      entityType: "product",
      entityId: enhancedProductId,
      entityName: updates.enhanced?.title || enhancedProduct.enhanced?.title || "Unknown Product",
      adminEmail: context.auth.token.email || "unknown",
      adminId: userId,
      description: `Updated enhanced product: ${updates.enhanced?.title || enhancedProduct.enhanced?.title}`,
      metadata: {
        fields_updated: Object.keys(updates),
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Product updated successfully" };
  } catch (error: any) {
    console.error("Error updating enhanced product:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to update enhanced product");
  }
});

/**
 * Delete enhanced product
 */
export const deleteEnhancedProduct = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { enhancedProductId } = data;

  if (!enhancedProductId) {
    throw new functions.https.HttpsError("invalid-argument", "enhancedProductId is required");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    const enhancedProductRef = db.collection("enhanced_products").doc(enhancedProductId);
    const enhancedProductDoc = await enhancedProductRef.get();

    if (!enhancedProductDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Enhanced product not found");
    }

    const enhancedProduct = enhancedProductDoc.data();

    // Verify ownership
    if (enhancedProduct?.user_id !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Not authorized");
    }

    await enhancedProductRef.delete();

    // Log activity
    await db.collection("activity_logs").add({
      action: "delete",
      entityType: "product",
      entityId: enhancedProductId,
      entityName: enhancedProduct.enhanced?.title || "Unknown Product",
      adminEmail: context.auth.token.email || "unknown",
      adminId: userId,
      description: `Deleted enhanced product: ${enhancedProduct.enhanced?.title}`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Product deleted successfully" };
  } catch (error: any) {
    console.error("Error deleting enhanced product:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to delete enhanced product");
  }
});

/**
 * Mark product as published
 */
export const markAsPublished = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { enhancedProductId, platform, platformProductId } = data;

  if (!enhancedProductId || !platform || !platformProductId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "enhancedProductId, platform, and platformProductId are required"
    );
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    const enhancedProductRef = db.collection("enhanced_products").doc(enhancedProductId);
    const enhancedProductDoc = await enhancedProductRef.get();

    if (!enhancedProductDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Enhanced product not found");
    }

    const enhancedProduct = enhancedProductDoc.data();

    // Verify ownership
    if (enhancedProduct?.user_id !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Not authorized");
    }

    // Update status to PUBLISHED
    await enhancedProductRef.update({
      status: "PUBLISHED",
      published_at: FieldValue.serverTimestamp(),
      platform_data: {
        platform,
        platform_product_id: platformProductId,
      },
      updated_at: FieldValue.serverTimestamp(),
    });

    // Log activity
    await db.collection("activity_logs").add({
      action: "create",
      entityType: "product",
      entityId: enhancedProductId,
      entityName: enhancedProduct.enhanced?.title || "Unknown Product",
      adminEmail: context.auth.token.email || "unknown",
      adminId: userId,
      description: `Published product to ${platform}: ${enhancedProduct.enhanced?.title}`,
      metadata: {
        platform,
        platform_product_id: platformProductId,
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Product marked as published" };
  } catch (error: any) {
    console.error("Error marking product as published:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to mark as published");
  }
});
