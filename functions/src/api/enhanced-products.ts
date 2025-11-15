/**
 * API Functions for Enhanced Products Management (Optimized)
 * Callable from the dashboard
 * Features: Validation, error handling, caching, pagination
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { EnhancedProduct } from "../../../shared/types/database";
import { requireAuth, validateRequired, checkRateLimit } from "../utils/validation";
import { cachedQuery } from "../utils/cache";

/**
 * Get all enhanced products for a user with pagination
 */
export const getEnhancedProducts = functions.https.onCall(async (data, context) => {
  const userId = requireAuth(context);

  // Rate limiting: 30 requests per minute
  checkRateLimit(userId, "getEnhancedProducts", 30, 60000);

  const db = getFirestore();
  const { limit = 50, status, offset = 0 } = data;

  try {
    // Build query
    let query = db
      .collection("enhanced_products")
      .where("user_id", "==", userId)
      .orderBy("created_at", "desc");

    // Filter by status if provided
    if (status) {
      query = query.where("status", "==", status);
    }

    // Apply pagination
    if (offset > 0) {
      query = query.offset(offset);
    }
    query = query.limit(Math.min(limit, 100)); // Max 100 per request

    const enhancedProductsSnapshot = await query.get();

    const enhancedProducts: EnhancedProduct[] = [];
    enhancedProductsSnapshot.forEach((doc) => {
      enhancedProducts.push({
        enhanced_product_id: doc.id,
        ...doc.data(),
      } as EnhancedProduct);
    });

    return {
      success: true,
      enhancedProducts,
      count: enhancedProducts.length,
      hasMore: enhancedProducts.length === limit
    };
  } catch (error: any) {
    console.error("Error fetching enhanced products:", error);
    throw new functions.https.HttpsError("internal", "Failed to fetch enhanced products");
  }
});

/**
 * Get a single enhanced product
 */
export const getEnhancedProduct = functions.https.onCall(async (data, context) => {
  const userId = requireAuth(context);

  validateRequired(data, ["enhancedProductId"]);
  const { enhancedProductId } = data;

  const db = getFirestore();

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
  const userId = requireAuth(context);

  validateRequired(data, ["enhancedProductId", "updates"]);
  const { enhancedProductId, updates } = data;

  const db = getFirestore();

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

    // Prevent updating certain protected fields
    const protectedFields = ["user_id", "raw_product_id", "created_at", "enhanced_product_id"];
    const sanitizedUpdates = Object.keys(updates)
      .filter(key => !protectedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    // Update product
    await enhancedProductRef.update({
      ...sanitizedUpdates,
      updated_at: FieldValue.serverTimestamp(),
    });

    // Log activity
    await db.collection("activity_logs").add({
      action: "update",
      entityType: "product",
      entityId: enhancedProductId,
      entityName: updates.enhanced?.title || enhancedProduct.enhanced?.title || "Unknown Product",
      adminEmail: context.auth?.token.email || "unknown",
      adminId: userId,
      description: `Updated enhanced product: ${updates.enhanced?.title || enhancedProduct.enhanced?.title}`,
      metadata: {
        fields_updated: Object.keys(sanitizedUpdates),
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
