/**
 * Product Publisher - Step 4
 * Main Cloud Function for publishing enhanced products
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { publishToShopify } from "./shopify-publisher";
import { publishToWooCommerce } from "./woocommerce-publisher";

/**
 * Publish enhanced product to selected platform
 * Callable function from frontend
 */
export const publishProduct = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { enhancedProductId, platform } = data;

  if (!enhancedProductId) {
    throw new functions.https.HttpsError("invalid-argument", "enhancedProductId is required");
  }

  if (!platform || !["shopify", "woocommerce"].includes(platform)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "platform must be 'shopify' or 'woocommerce'"
    );
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    // Get enhanced product
    const enhancedProductDoc = await db.collection("enhanced_products").doc(enhancedProductId).get();

    if (!enhancedProductDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Enhanced product not found");
    }

    const enhancedProduct = enhancedProductDoc.data();

    // Verify ownership
    if (enhancedProduct?.user_id !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Not authorized");
    }

    // Check if already published
    if (enhancedProduct.status === "PUBLISHED") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Product already published. Use update instead."
      );
    }

    // Get user's platform credentials
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    const platformConfig = userData?.platforms?.[platform];

    if (!platformConfig) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `${platform} not configured. Please connect ${platform} in Integrations.`
      );
    }

    console.log(`[Publish] Publishing product ${enhancedProductId} to ${platform}`);

    let result: { success: boolean; productId?: string; productUrl?: string; error?: string };

    // Publish to selected platform
    if (platform === "shopify") {
      result = await publishToShopify(platformConfig, {
        title: enhancedProduct.enhanced.title,
        description: enhancedProduct.enhanced.long_description,
        images: enhancedProduct.enhanced.images,
        price: enhancedProduct.pricing.suggested_price,
        compareAtPrice: enhancedProduct.pricing.compare_at_price,
        tags: enhancedProduct.enhanced.tags,
        category: enhancedProduct.enhanced.category,
      });
    } else {
      // WooCommerce
      result = await publishToWooCommerce(platformConfig, {
        title: enhancedProduct.enhanced.title,
        shortDescription: enhancedProduct.enhanced.short_description,
        longDescription: enhancedProduct.enhanced.long_description,
        images: enhancedProduct.enhanced.images,
        price: enhancedProduct.pricing.suggested_price,
        compareAtPrice: enhancedProduct.pricing.compare_at_price,
        tags: enhancedProduct.enhanced.tags,
        category: enhancedProduct.enhanced.category,
      });
    }

    if (!result.success) {
      throw new Error(result.error || "Failed to publish product");
    }

    // Update enhanced product status
    await db.collection("enhanced_products").doc(enhancedProductId).update({
      status: "PUBLISHED",
      published_at: FieldValue.serverTimestamp(),
      platform_data: {
        platform,
        platform_product_id: result.productId,
        product_url: result.productUrl,
      },
      updated_at: FieldValue.serverTimestamp(),
    });

    // Log activity
    await db.collection("activity_logs").add({
      action: "create",
      entityType: "product",
      entityId: enhancedProductId,
      entityName: enhancedProduct.enhanced.title,
      adminEmail: context.auth.token.email || "unknown",
      adminId: userId,
      description: `Published product to ${platform}: ${enhancedProduct.enhanced.title}`,
      metadata: {
        platform,
        platform_product_id: result.productId,
        product_url: result.productUrl,
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    console.log(`[Publish] ✓ Product published successfully to ${platform}`);

    return {
      success: true,
      message: `Product published to ${platform} successfully`,
      productId: result.productId,
      productUrl: result.productUrl,
      platform,
    };
  } catch (error: any) {
    console.error(`[Publish] Error publishing product:`, error);

    // Log failure
    await db.collection("activity_logs").add({
      action: "create",
      entityType: "product",
      entityId: enhancedProductId,
      entityName: "Unknown Product",
      adminEmail: context.auth.token.email || "unknown",
      adminId: userId,
      description: `Failed to publish product to ${platform}: ${error.message}`,
      metadata: {
        platform,
        error: error.message,
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    throw new functions.https.HttpsError("internal", error.message || "Failed to publish product");
  }
});

/**
 * Unpublish/remove product from platform
 */
export const unpublishProduct = functions.https.onCall(async (data, context) => {
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

    // Update status back to READY
    await db.collection("enhanced_products").doc(enhancedProductId).update({
      status: "READY",
      platform_data: FieldValue.delete(),
      updated_at: FieldValue.serverTimestamp(),
    });

    // Log activity
    await db.collection("activity_logs").add({
      action: "update",
      entityType: "product",
      entityId: enhancedProductId,
      entityName: enhancedProduct.enhanced?.title || "Unknown Product",
      adminEmail: context.auth.token.email || "unknown",
      adminId: userId,
      description: `Unpublished product: ${enhancedProduct.enhanced?.title}`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "Product unpublished successfully",
    };
  } catch (error: any) {
    console.error("Error unpublishing product:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to unpublish product");
  }
});

/**
 * Get publish status for a product
 */
export const getPublishStatus = functions.https.onCall(async (data, context) => {
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
      status: enhancedProduct.status,
      platformData: enhancedProduct.platform_data || null,
      publishedAt: enhancedProduct.published_at || null,
    };
  } catch (error: any) {
    console.error("Error getting publish status:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to get publish status"
    );
  }
});
