/**
 * AI Enhancement Pipeline Trigger - Step 2
 * Automatically enhances products when added to raw_products collection
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { enhanceProductText, calculatePricing } from "./text-enhancer";
import { processProductImages } from "./image-processor";
import { EnhancedProduct } from "../../../shared/types/database";

/**
 * Firestore Trigger: Automatically enhance new raw products
 * Triggers when a document is created in raw_products collection
 */
export const onRawProductCreated = functions.firestore
  .document("raw_products/{rawProductId}")
  .onCreate(async (snapshot, context) => {
    const rawProductId = context.params.rawProductId;
    const rawProduct = snapshot.data();

    console.log(`[Enhancement] Starting AI enhancement for raw product: ${rawProductId}`);

    // Check if product is ready for enhancement
    if (rawProduct.import_status !== "completed") {
      console.log(`[Enhancement] Product ${rawProductId} not ready (status: ${rawProduct.import_status})`);
      return;
    }

    const db = getFirestore();
    const userId = rawProduct.user_id;
    const enhancedProductRef = db.collection("enhanced_products").doc();
    const enhancedProductId = enhancedProductRef.id;

    try {
      // Update status to ENHANCING
      await db.collection("enhanced_products").doc(enhancedProductId).set({
        enhanced_product_id: enhancedProductId,
        raw_product_id: rawProductId,
        user_id: userId,
        status: "ENHANCING",
        original: {
          title: rawProduct.raw_data.title || "",
          description: rawProduct.raw_data.description || "",
          images: rawProduct.raw_data.images || [],
          price: rawProduct.raw_data.price || { min: 0, max: 0, currency: "USD" },
          source_url: rawProduct.source_url || "",
        },
        enhanced: {
          title: "",
          short_description: "",
          long_description: "",
          features: [],
          images: [],
          tags: [],
          category: "",
        },
        ai_processing: {},
        pricing: {
          suggested_price: 0,
          cost_price: 0,
          profit_margin: 0,
        },
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      console.log(`[Enhancement] Created enhanced_products document: ${enhancedProductId}`);

      const startTime = Date.now();

      // === STEP 1: ENHANCE TEXT WITH GEMINI ===
      console.log(`[Enhancement] Step 1: Enhancing text with Gemini AI...`);

      const enhancedText = await enhanceProductText(
        rawProduct.raw_data.title || "Untitled Product",
        rawProduct.raw_data.description || "",
        rawProduct.raw_data.price || { min: 0, max: 0, currency: "USD" }
      );

      console.log(`[Enhancement] ✓ Text enhancement completed`);

      // === STEP 2: PROCESS IMAGES WITH CLOUD VISION ===
      console.log(`[Enhancement] Step 2: Processing images with Cloud Vision...`);

      const imageResult = await processProductImages(
        rawProduct.raw_data.images || [],
        userId,
        enhancedProductId,
        6 // Max 6 images
      );

      console.log(`[Enhancement] ✓ Image processing completed (${imageResult.processedImages.length} images)`);

      // === STEP 3: CALCULATE PRICING ===
      const costPrice = rawProduct.raw_data.price?.max || rawProduct.raw_data.price?.min || 0;
      const pricing = calculatePricing(costPrice, 50); // 50% profit margin

      // === STEP 4: SAVE ENHANCED PRODUCT ===
      const totalProcessingTime = Date.now() - startTime;

      const enhancedProduct: Partial<EnhancedProduct> = {
        status: "READY",
        enhanced: {
          title: enhancedText.title,
          short_description: enhancedText.shortDescription,
          long_description: enhancedText.longDescription,
          features: enhancedText.features,
          images: imageResult.processedImages,
          tags: enhancedText.tags,
          category: enhancedText.category,
        },
        ai_processing: {
          text_enhanced_at: FieldValue.serverTimestamp(),
          images_enhanced_at: FieldValue.serverTimestamp(),
          text_model: "gemini-pro",
          image_model: "vision-api",
          processing_time_ms: totalProcessingTime,
        },
        pricing: pricing,
        updated_at: FieldValue.serverTimestamp(),
      };

      await db.collection("enhanced_products").doc(enhancedProductId).update(enhancedProduct);

      console.log(
        `[Enhancement] ✓ AI enhancement completed successfully in ${totalProcessingTime}ms`
      );

      // === STEP 5: LOG ACTIVITY ===
      await db.collection("activity_logs").add({
        action: "create",
        entityType: "product",
        entityId: enhancedProductId,
        entityName: enhancedText.title,
        adminEmail: "system",
        adminId: userId,
        description: `AI enhanced product: ${enhancedText.title}`,
        metadata: {
          raw_product_id: rawProductId,
          processing_time_ms: totalProcessingTime,
          images_processed: imageResult.processedImages.length,
        },
        timestamp: FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        enhanced_product_id: enhancedProductId,
        processing_time_ms: totalProcessingTime,
      };
    } catch (error: any) {
      console.error(`[Enhancement] Error enhancing product ${rawProductId}:`, error);

      // Update status to FAILED
      await db.collection("enhanced_products").doc(enhancedProductId).update({
        status: "FAILED",
        ai_processing: {
          error_message: error.message || "Unknown error",
        },
        updated_at: FieldValue.serverTimestamp(),
      });

      // Log failure
      await db.collection("activity_logs").add({
        action: "create",
        entityType: "product",
        entityId: enhancedProductId,
        entityName: rawProduct.raw_data.title || "Unknown Product",
        adminEmail: "system",
        adminId: userId,
        description: `Failed to enhance product: ${error.message}`,
        metadata: {
          raw_product_id: rawProductId,
          error: error.message,
        },
        timestamp: FieldValue.serverTimestamp(),
      });

      throw error;
    }
  });

/**
 * Manual trigger to re-process a raw product
 * Callable function for admin to manually trigger enhancement
 */
export const triggerManualEnhancement = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { rawProductId } = data;

  if (!rawProductId) {
    throw new functions.https.HttpsError("invalid-argument", "rawProductId is required");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    // Get raw product
    const rawProductDoc = await db.collection("raw_products").doc(rawProductId).get();

    if (!rawProductDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Raw product not found");
    }

    const rawProduct = rawProductDoc.data();

    // Verify ownership
    if (rawProduct?.user_id !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Not authorized");
    }

    // Check if already enhanced
    const existingEnhanced = await db
      .collection("enhanced_products")
      .where("raw_product_id", "==", rawProductId)
      .where("user_id", "==", userId)
      .limit(1)
      .get();

    if (!existingEnhanced.empty) {
      const existingDoc = existingEnhanced.docs[0];
      return {
        success: true,
        message: "Product already enhanced",
        enhanced_product_id: existingDoc.id,
        status: existingDoc.data().status,
      };
    }

    // Trigger enhancement by updating raw product
    await db.collection("raw_products").doc(rawProductId).update({
      updated_at: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "Enhancement triggered",
    };
  } catch (error: any) {
    console.error("Error triggering manual enhancement:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to trigger enhancement");
  }
});
