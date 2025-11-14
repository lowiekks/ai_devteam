/**
 * AI Image Processing Pipeline - Step 2
 * Uses Cloud Vision API and Firebase Storage
 */

import vision from "@google-cloud/vision";
import { getStorage } from "firebase-admin/storage";
import axios from "axios";
import * as path from "path";

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000, // 30 seconds
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    return Buffer.from(response.data);
  } catch (error: any) {
    console.error(`[Image] Failed to download image from ${url}:`, error.message);
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

/**
 * Analyze image with Cloud Vision API
 * Returns labels and safe search detection
 */
async function analyzeImage(imageBuffer: Buffer) {
  const client = new vision.ImageAnnotatorClient();

  try {
    const [result] = await client.annotateImage({
      image: { content: imageBuffer },
      features: [
        { type: "LABEL_DETECTION", maxResults: 10 },
        { type: "SAFE_SEARCH_DETECTION" },
        { type: "IMAGE_PROPERTIES" },
      ],
    });

    return {
      labels: result.labelAnnotations?.map((label) => label.description) || [],
      safeSearch: result.safeSearchAnnotation,
      colors: result.imagePropertiesAnnotation?.dominantColors?.colors || [],
    };
  } catch (error: any) {
    console.error("[Vision] Image analysis failed:", error.message);
    return {
      labels: [],
      safeSearch: null,
      colors: [],
    };
  }
}

/**
 * Check if image is safe for e-commerce
 */
function isSafeImage(safeSearch: any): boolean {
  if (!safeSearch) return true; // Assume safe if analysis failed

  // Check for adult, violence, or racy content
  const isAdult = safeSearch.adult === "VERY_LIKELY" || safeSearch.adult === "LIKELY";
  const isViolent = safeSearch.violence === "VERY_LIKELY" || safeSearch.violence === "LIKELY";
  const isRacy = safeSearch.racy === "VERY_LIKELY";

  return !isAdult && !isViolent && !isRacy;
}

/**
 * Upload image to Firebase Storage
 */
async function uploadToStorage(
  imageBuffer: Buffer,
  userId: string,
  productId: string,
  index: number
): Promise<string> {
  const bucket = getStorage().bucket();
  const fileName = `enhanced-products/${userId}/${productId}/image-${index}.jpg`;
  const file = bucket.file(fileName);

  try {
    await file.save(imageBuffer, {
      metadata: {
        contentType: "image/jpeg",
        metadata: {
          uploadedBy: userId,
          productId: productId,
          processedAt: new Date().toISOString(),
        },
      },
    });

    // Make file publicly accessible
    await file.makePublic();

    // Return public URL
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  } catch (error: any) {
    console.error(`[Storage] Failed to upload image:`, error.message);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Process product images
 * Downloads, analyzes, and uploads to Firebase Storage
 */
export async function processProductImages(
  imageUrls: string[],
  userId: string,
  productId: string,
  maxImages: number = 6
): Promise<{
  processedImages: string[];
  analyzedData: {
    labels: string[];
    safeImages: number;
    unsafeImages: number;
  };
}> {
  const startTime = Date.now();
  const processedImages: string[] = [];
  const allLabels: Set<string> = new Set();
  let safeImages = 0;
  let unsafeImages = 0;

  // Limit number of images to process
  const imagesToProcess = imageUrls.slice(0, maxImages);

  console.log(`[Image] Processing ${imagesToProcess.length} images for product ${productId}`);

  for (let i = 0; i < imagesToProcess.length; i++) {
    const imageUrl = imagesToProcess[i];

    try {
      console.log(`[Image] Processing image ${i + 1}/${imagesToProcess.length}...`);

      // Download image
      const imageBuffer = await downloadImage(imageUrl);

      // Analyze with Vision API
      const analysis = await analyzeImage(imageBuffer);

      // Add labels
      analysis.labels.forEach((label) => allLabels.add(label || ""));

      // Check if safe
      if (isSafeImage(analysis.safeSearch)) {
        safeImages++;

        // Upload to Firebase Storage
        const publicUrl = await uploadToStorage(imageBuffer, userId, productId, i);
        processedImages.push(publicUrl);

        console.log(`[Image] ✓ Image ${i + 1} processed successfully`);
      } else {
        unsafeImages++;
        console.log(`[Image] ✗ Image ${i + 1} flagged as unsafe, skipping`);
      }
    } catch (error: any) {
      console.error(`[Image] Error processing image ${i + 1}:`, error.message);
      // Continue with next image
    }
  }

  const processingTime = Date.now() - startTime;
  console.log(
    `[Image] Processing completed in ${processingTime}ms. ` +
    `${processedImages.length}/${imagesToProcess.length} images processed successfully`
  );

  return {
    processedImages,
    analyzedData: {
      labels: Array.from(allLabels),
      safeImages,
      unsafeImages,
    },
  };
}

/**
 * Process a single image (for on-demand processing)
 */
export async function processSingleImage(
  imageUrl: string,
  userId: string,
  productId: string,
  index: number
): Promise<string> {
  console.log(`[Image] Processing single image from ${imageUrl}`);

  const imageBuffer = await downloadImage(imageUrl);
  const analysis = await analyzeImage(imageBuffer);

  if (!isSafeImage(analysis.safeSearch)) {
    throw new Error("Image flagged as unsafe");
  }

  const publicUrl = await uploadToStorage(imageBuffer, userId, productId, index);

  console.log(`[Image] ✓ Single image processed successfully`);

  return publicUrl;
}
