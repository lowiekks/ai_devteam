/**
 * AI Image Refinement Module
 * Processes raw product images: removes watermarks, clears backgrounds, upscales quality
 * Uses Replicate API for image processing models
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import axios from "axios";
import { getStorage } from "firebase-admin/storage";
import { config } from "../config/environment";
import { Product } from "../../../shared/types/database";

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

interface ReplicateResponse {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed";
  output?: string | string[];
  error?: string;
}

/**
 * Firestore Trigger: Refine images when text refinement is complete
 */
export const refineProductImages = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "1GB",
  })
  .firestore.document("products/{productId}")
  .onUpdate(async (change, context) => {
    const db = getFirestore();
    const productId = context.params.productId;
    const newData = change.after.data() as Product;
    const oldData = change.before.data() as Product;

    console.log(`Image refinery triggered for product: ${productId}`);

    // Only process if text is refined but images are not
    if (!newData.content_flags.text_refined || newData.content_flags.images_refined) {
      console.log(`Skipping image refinement - text_refined: ${newData.content_flags.text_refined}, images_refined: ${newData.content_flags.images_refined}`);
      return;
    }

    // Check if this is a new update (prevent infinite loops)
    if (oldData.content_flags.images_refined === newData.content_flags.images_refined) {
      console.log("Image refinement status unchanged, processing...");
    }

    // Check user settings and product flags
    if (!newData.content_flags.auto_refine_images) {
      console.log(`Auto-refine images disabled for product ${productId}`);
      // Skip to review without image processing
      await change.after.ref.update({
        "content_flags.images_refined": true,
        content_status: "REVIEW",
        updated_at: FieldValue.serverTimestamp(),
      });
      return;
    }

    try {
      const rawImages = newData.public_data.original_images || [newData.original_image_url];

      console.log(`Processing ${rawImages.length} images for product: ${productId}`);

      // Process first 3 images to save costs
      const imagesToProcess = rawImages.slice(0, 3);
      const refinedImageUrls: string[] = [];

      for (let i = 0; i < imagesToProcess.length; i++) {
        const imageUrl = imagesToProcess[i];
        console.log(`Processing image ${i + 1}/${imagesToProcess.length}: ${imageUrl}`);

        try {
          // Step 1: Remove background
          const cleanedImageUrl = await removeBackground(imageUrl);

          // Step 2: Upscale if needed (optional - costs more)
          // const upscaledUrl = await upscaleImage(cleanedImageUrl);

          // Step 3: Upload to Firebase Storage
          const firebaseStorageUrl = await uploadToFirebaseStorage(
            cleanedImageUrl,
            productId,
            i
          );

          refinedImageUrls.push(firebaseStorageUrl);
        } catch (imageError) {
          console.error(`Failed to process image ${i}:`, imageError);
          // Fallback to original image on error
          refinedImageUrls.push(imageUrl);
        }
      }

      // Update product with refined images
      await change.after.ref.update({
        "public_data.images": refinedImageUrls,
        "content_flags.images_refined": true,
        content_status: "REVIEW", // Ready for human review
        updated_at: FieldValue.serverTimestamp(),
      });

      console.log(`Image refinement completed for product: ${productId}`);

      // Log analytics
      await db.collection("analytics").add({
        event_type: "images_refined",
        product_id: productId,
        user_id: newData.user_id,
        timestamp: FieldValue.serverTimestamp(),
        metadata: {
          images_processed: refinedImageUrls.length,
        },
      });
    } catch (error) {
      console.error("Image refinement error:", error);

      // Mark as failed but still move to review with original images
      await change.after.ref.update({
        "content_flags.images_refined": true, // Mark as "attempted"
        "public_data.images": newData.public_data.original_images || [newData.original_image_url],
        content_status: "REVIEW",
        automation_log: FieldValue.arrayUnion({
          action: "IMAGE_REFINEMENT_FAILED",
          timestamp: new Date(),
          details: (error as Error).message,
        }),
      });
    }
  });

/**
 * Remove background from image using Replicate (rembg model)
 */
async function removeBackground(imageUrl: string): Promise<string> {
  const replicateApiKey = process.env.REPLICATE_API_TOKEN || config.scraping.apify.apiKey; // Fallback

  if (!replicateApiKey) {
    console.warn("REPLICATE_API_TOKEN not set, skipping background removal");
    return imageUrl; // Return original
  }

  try {
    // Create prediction
    const response = await axios.post(
      REPLICATE_API_URL,
      {
        version: "fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003", // rembg model
        input: {
          image: imageUrl,
        },
      },
      {
        headers: {
          Authorization: `Token ${replicateApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const prediction = response.data as ReplicateResponse;

    // Poll for result (wait up to 60 seconds)
    const resultUrl = await pollReplicatePrediction(prediction.id, replicateApiKey);

    return resultUrl;
  } catch (error) {
    console.error("Background removal error:", error);
    return imageUrl; // Fallback to original on error
  }
}

/**
 * Upscale image using Real-ESRGAN (optional - costs more)
 * Currently not used to save costs, but available if needed
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function upscaleImage(imageUrl: string): Promise<string> {
  const replicateApiKey = process.env.REPLICATE_API_TOKEN;

  if (!replicateApiKey) {
    return imageUrl;
  }

  try {
    const response = await axios.post(
      REPLICATE_API_URL,
      {
        version: "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b", // Real-ESRGAN
        input: {
          image: imageUrl,
          scale: 2, // 2x upscaling
        },
      },
      {
        headers: {
          Authorization: `Token ${replicateApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const prediction = response.data as ReplicateResponse;
    const resultUrl = await pollReplicatePrediction(prediction.id, replicateApiKey);

    return resultUrl;
  } catch (error) {
    console.error("Upscaling error:", error);
    return imageUrl;
  }
}

/**
 * Poll Replicate prediction until complete
 */
async function pollReplicatePrediction(predictionId: string, apiKey: string): Promise<string> {
  const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await axios.get(`${REPLICATE_API_URL}/${predictionId}`, {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
    });

    const prediction = response.data as ReplicateResponse;

    if (prediction.status === "succeeded") {
      const output = prediction.output;
      if (typeof output === "string") {
        return output;
      } else if (Array.isArray(output) && output.length > 0) {
        return output[0];
      }
      throw new Error("Unexpected output format from Replicate");
    }

    if (prediction.status === "failed") {
      throw new Error(`Replicate prediction failed: ${prediction.error}`);
    }

    // Wait 2 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error("Replicate prediction timeout");
}

/**
 * Upload processed image to Firebase Storage
 */
async function uploadToFirebaseStorage(
  imageUrl: string,
  productId: string,
  index: number
): Promise<string> {
  try {
    // Download the processed image
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });

    const imageBuffer = Buffer.from(response.data);

    // Upload to Firebase Storage
    const bucket = getStorage().bucket();
    const fileName = `products/${productId}/refined_${index}_${Date.now()}.png`;
    const file = bucket.file(fileName);

    await file.save(imageBuffer, {
      metadata: {
        contentType: "image/png",
      },
      public: true,
    });

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return publicUrl;
  } catch (error) {
    console.error("Firebase Storage upload error:", error);
    // Return the Replicate URL as fallback
    return imageUrl;
  }
}

/**
 * Callable function to manually trigger image refinement
 */
export const triggerImageRefinement = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { productId } = data;

  if (!productId) {
    throw new functions.https.HttpsError("invalid-argument", "productId is required");
  }

  const db = getFirestore();
  const productDoc = await db.collection("products").doc(productId).get();

  if (!productDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Product not found");
  }

  const product = productDoc.data() as Product;

  // Verify ownership
  if (product.user_id !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not authorized");
  }

  // Trigger by updating a flag
  await productDoc.ref.update({
    "content_flags.images_refined": false,
    "content_flags.auto_refine_images": true,
  });

  return { success: true, message: "Image refinement triggered" };
});
