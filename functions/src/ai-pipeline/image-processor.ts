/**
 * AI Image Processing Pipeline - Step 2 (Optimized)
 * Uses Cloud Vision API, Firebase Storage, and Sharp for image optimization
 * Features: Parallel processing, compression, retry logic, caching
 */

import * as vision from "@google-cloud/vision";
import { getStorage } from "firebase-admin/storage";
import axios from "axios";
import sharp from "sharp";
import * as path from "path";
import { withRetry } from "../utils/retry";

// Constants for optimization
const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_HEIGHT = 1200;
const JPEG_QUALITY = 85;
const WEBP_QUALITY = 80;

// Singleton Vision API client (cached across warm starts)
let visionClient: vision.ImageAnnotatorClient | null = null;

function getVisionClient(): vision.ImageAnnotatorClient {
  if (visionClient) {
    return visionClient;
  }

  visionClient = new vision.ImageAnnotatorClient();
  console.log("[Vision] Client initialized (singleton)");

  return visionClient;
}

/**
 * Download image from URL with retry logic
 */
async function downloadImage(url: string): Promise<Buffer> {
  return withRetry(async () => {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 30000, // 30 seconds
        maxContentLength: 10 * 1024 * 1024, // 10MB max
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      console.error(
        `[Image] Failed to download image from ${url}:`,
        error.message
      );
      throw new Error(`Failed to download image: ${error.message}`);
    }
  });
}

/**
 * Optimize and compress image using Sharp
 * Converts to JPEG, resizes if needed, and optimizes for web
 */
async function optimizeImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    console.log(
      `[Image] Original: ${metadata.format}, ${metadata.width}x${metadata.height}, ` +
        `${Math.round(imageBuffer.length / 1024)}KB`
    );

    // Calculate resize dimensions (maintain aspect ratio)
    let width = metadata.width || MAX_IMAGE_WIDTH;
    let height = metadata.height || MAX_IMAGE_HEIGHT;

    if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
      const ratio = Math.min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Optimize: resize, convert to JPEG, compress
    const optimizedBuffer = await image
      .resize(width, height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: JPEG_QUALITY,
        progressive: true,
        mozjpeg: true, // Use mozjpeg for better compression
      })
      .toBuffer();

    const compressionRatio = (
      (1 - optimizedBuffer.length / imageBuffer.length) *
      100
    ).toFixed(1);
    console.log(
      `[Image] Optimized: ${width}x${height}, ${Math.round(
        optimizedBuffer.length / 1024
      )}KB (${compressionRatio}% smaller)`
    );

    return optimizedBuffer;
  } catch (error: any) {
    console.error("[Image] Optimization failed:", error.message);
    // Return original if optimization fails
    return imageBuffer;
  }
}

/**
 * Analyze image with Cloud Vision API
 * Returns labels and safe search detection
 */
async function analyzeImage(imageBuffer: Buffer) {
  return withRetry(async () => {
    const client = getVisionClient();

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
        labels:
          result.labelAnnotations?.map((label: any) => label.description) || [],
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
  });
}

/**
 * Check if image is safe for e-commerce
 */
function isSafeImage(safeSearch: any): boolean {
  if (!safeSearch) return true; // Assume safe if analysis failed

  // Check for adult, violence, or racy content
  const isAdult =
    safeSearch.adult === "VERY_LIKELY" || safeSearch.adult === "LIKELY";
  const isViolent =
    safeSearch.violence === "VERY_LIKELY" ||
    safeSearch.violence === "LIKELY";
  const isRacy = safeSearch.racy === "VERY_LIKELY";

  return !isAdult && !isViolent && !isRacy;
}

/**
 * Upload image to Firebase Storage with retry logic
 */
async function uploadToStorage(
  imageBuffer: Buffer,
  userId: string,
  productId: string,
  index: number
): Promise<string> {
  return withRetry(async () => {
    const bucket = getStorage().bucket();
    const fileName = `enhanced-products/${userId}/${productId}/image-${index}.jpg`;
    const file = bucket.file(fileName);

    try {
      await file.save(imageBuffer, {
        metadata: {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000", // 1 year cache
          metadata: {
            uploadedBy: userId,
            productId: productId,
            processedAt: new Date().toISOString(),
            optimized: "true",
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
  });
}

/**
 * Process a single image (download, analyze, optimize, upload)
 */
async function processSingleImageInternal(
  imageUrl: string,
  userId: string,
  productId: string,
  index: number
): Promise<{
  url: string;
  labels: string[];
  isSafe: boolean;
}> {
  console.log(`[Image] Processing image ${index + 1}...`);

  // Download image
  const imageBuffer = await downloadImage(imageUrl);

  // Analyze with Vision API (parallel with optimization)
  const [analysis, optimizedBuffer] = await Promise.all([
    analyzeImage(imageBuffer),
    optimizeImage(imageBuffer),
  ]);

  // Check if safe
  const safe = isSafeImage(analysis.safeSearch);

  if (!safe) {
    throw new Error("Image flagged as unsafe");
  }

  // Upload to Firebase Storage
  const publicUrl = await uploadToStorage(
    optimizedBuffer,
    userId,
    productId,
    index
  );

  console.log(`[Image] ✓ Image ${index + 1} processed successfully`);

  return {
    url: publicUrl,
    labels: analysis.labels,
    isSafe: safe,
  };
}

/**
 * Process product images in parallel (OPTIMIZED)
 * Downloads, analyzes, optimizes, and uploads to Firebase Storage
 * Features:
 * - Parallel processing for speed
 * - Image compression to reduce storage costs
 * - Retry logic with exponential backoff
 * - Graceful error handling
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
  const allLabels: Set<string> = new Set();
  let safeImages = 0;
  let unsafeImages = 0;

  // Limit number of images to process
  const imagesToProcess = imageUrls.slice(0, maxImages);

  console.log(
    `[Image] Processing ${imagesToProcess.length} images in parallel for product ${productId}`
  );

  // Process all images in parallel
  const results = await Promise.allSettled(
    imagesToProcess.map((imageUrl, index) =>
      processSingleImageInternal(imageUrl, userId, productId, index)
    )
  );

  // Collect successful results
  const processedImages: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const { url, labels, isSafe } = result.value;
      processedImages.push(url);
      labels.forEach((label) => allLabels.add(label || ""));

      if (isSafe) {
        safeImages++;
      } else {
        unsafeImages++;
      }
    } else {
      console.error(
        `[Image] ✗ Image ${index + 1} failed:`,
        result.reason?.message || "Unknown error"
      );
      unsafeImages++;
    }
  });

  const processingTime = Date.now() - startTime;
  console.log(
    `[Image] Processing completed in ${processingTime}ms. ` +
      `${processedImages.length}/${imagesToProcess.length} images processed successfully ` +
      `(${Math.round((processedImages.length / imagesToProcess.length) * 100)}% success rate)`
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

  const result = await processSingleImageInternal(
    imageUrl,
    userId,
    productId,
    index
  );

  console.log(`[Image] ✓ Single image processed successfully`);

  return result.url;
}
