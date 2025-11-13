/**
 * API Functions for Product Review Queue
 * Handles approval/rejection workflow for AI-refined products
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Product } from "../../../shared/types/database";

/**
 * Get products pending review
 */
export const getReviewQueue = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    // Fetch products in REVIEW status
    const reviewSnapshot = await db
      .collection("products")
      .where("user_id", "==", userId)
      .where("content_status", "==", "REVIEW")
      .orderBy("created_at", "desc")
      .get();

    const products: Product[] = [];
    reviewSnapshot.forEach((doc) => {
      products.push({
        product_id: doc.id,
        ...doc.data(),
      } as Product);
    });

    // Get stats
    const allProductsSnapshot = await db
      .collection("products")
      .where("user_id", "==", userId)
      .get();

    let pending = 0;
    let approved = 0;
    let rejected = 0;

    allProductsSnapshot.forEach((doc) => {
      const status = doc.data().content_status;
      if (status === "REVIEW") pending++;
      else if (status === "LIVE") approved++;
      else if (status === "REJECTED") rejected++;
    });

    return {
      success: true,
      products,
      stats: {
        pending,
        approved,
        rejected,
      },
    };
  } catch (error) {
    console.error("Error fetching review queue:", error);
    throw new functions.https.HttpsError("internal", "Failed to fetch review queue");
  }
});

/**
 * Approve a product (move to LIVE)
 */
export const approveProduct = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { productId } = data;

  if (!productId) {
    throw new functions.https.HttpsError("invalid-argument", "productId is required");
  }

  const db = getFirestore();
  const productRef = db.collection("products").doc(productId);
  const productDoc = await productRef.get();

  if (!productDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Product not found");
  }

  const product = productDoc.data() as Product;

  // Verify ownership
  if (product.user_id !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not authorized");
  }

  // Verify status
  if (product.content_status !== "REVIEW") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Product is not in REVIEW status"
    );
  }

  try {
    // Update product to LIVE
    await productRef.update({
      content_status: "LIVE",
      published_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      automation_log: FieldValue.arrayUnion({
        action: "PRODUCT_APPROVED",
        timestamp: new Date(),
        details: "Product approved and published",
      }),
    });

    // TODO: Publish to Shopify/WooCommerce
    // await updatePlatformProduct(product);

    // Log analytics
    await db.collection("analytics").add({
      event_type: "product_approved",
      product_id: productId,
      user_id: product.user_id,
      timestamp: FieldValue.serverTimestamp(),
      metadata: {
        title: product.public_data.title,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error approving product:", error);
    throw new functions.https.HttpsError("internal", "Failed to approve product");
  }
});

/**
 * Reject a product
 */
export const rejectProduct = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { productId, reason } = data;

  if (!productId) {
    throw new functions.https.HttpsError("invalid-argument", "productId is required");
  }

  const db = getFirestore();
  const productRef = db.collection("products").doc(productId);
  const productDoc = await productRef.get();

  if (!productDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Product not found");
  }

  const product = productDoc.data() as Product;

  // Verify ownership
  if (product.user_id !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not authorized");
  }

  try {
    // Update product to REJECTED
    await productRef.update({
      content_status: "REJECTED",
      updated_at: FieldValue.serverTimestamp(),
      automation_log: FieldValue.arrayUnion({
        action: "PRODUCT_REJECTED",
        timestamp: new Date(),
        details: reason || "Product rejected by user",
      }),
    });

    // Log analytics
    await db.collection("analytics").add({
      event_type: "product_rejected",
      product_id: productId,
      user_id: product.user_id,
      timestamp: FieldValue.serverTimestamp(),
      metadata: {
        title: product.public_data.title,
        reason: reason || "Not specified",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error rejecting product:", error);
    throw new functions.https.HttpsError("internal", "Failed to reject product");
  }
});

/**
 * Resubmit a rejected product for re-refinement
 */
export const resubmitProduct = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { productId } = data;

  if (!productId) {
    throw new functions.https.HttpsError("invalid-argument", "productId is required");
  }

  const db = getFirestore();
  const productRef = db.collection("products").doc(productId);
  const productDoc = await productRef.get();

  if (!productDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Product not found");
  }

  const product = productDoc.data() as Product;

  // Verify ownership
  if (product.user_id !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not authorized");
  }

  try {
    // Reset to RAW_IMPORT to trigger refinement again
    await productRef.update({
      content_status: "RAW_IMPORT",
      "content_flags.text_refined": false,
      "content_flags.images_refined": false,
      updated_at: FieldValue.serverTimestamp(),
      automation_log: FieldValue.arrayUnion({
        action: "PRODUCT_RESUBMITTED",
        timestamp: new Date(),
        details: "Product resubmitted for re-refinement",
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("Error resubmitting product:", error);
    throw new functions.https.HttpsError("internal", "Failed to resubmit product");
  }
});
