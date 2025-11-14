/**
 * Product Import Pipeline - Step 1
 * Imports raw product data from AliExpress and stores in raw_products collection
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import axios from "axios";
import * as crypto from "crypto";

/**
 * Raw Product Type - First stage of import pipeline
 */
export interface RawProduct {
  raw_product_id: string;
  user_id: string;
  source_platform: "aliexpress";
  source_url: string;
  import_status: "pending" | "processing" | "completed" | "failed";

  // Raw data from AliExpress API
  raw_data: {
    product_id: string;
    title: string;
    description: string;
    category: string;
    images: string[];
    price: {
      min: number;
      max: number;
      currency: string;
    };
    rating: number;
    orders: number;
    shipping: {
      method: string;
      cost: number;
      time: string;
    };
    variations?: Array<{
      name: string;
      values: string[];
    }>;
  };

  // Processing metadata
  processing: {
    import_started_at: any; // Timestamp
    import_completed_at?: any; // Timestamp
    error_message?: string;
    retry_count: number;
  };

  created_at: any; // Timestamp
  updated_at: any; // Timestamp
}

/**
 * AliExpress API Configuration
 */
interface AliExpressConfig {
  appKey: string;
  appSecret: string;
  apiEndpoint: string;
}

/**
 * Generate MD5 signature for AliExpress API
 */
function generateSignature(params: Record<string, string>, appSecret: string): string {
  // Sort parameters alphabetically
  const sortedKeys = Object.keys(params).sort();

  // Concatenate parameters
  let signString = appSecret;
  sortedKeys.forEach((key) => {
    signString += key + params[key];
  });
  signString += appSecret;

  // Generate MD5 hash
  return crypto.createHash("md5").update(signString).digest("hex").toUpperCase();
}

/**
 * Extract product ID from AliExpress URL
 */
function extractProductId(url: string): string | null {
  // AliExpress URLs contain product ID in various formats:
  // https://www.aliexpress.com/item/1234567890.html
  // https://aliexpress.com/item/1234567890.html
  // https://m.aliexpress.com/item/1234567890.html

  const match = url.match(/item\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Fetch product details from AliExpress API
 */
async function fetchAliExpressProduct(productId: string, config: AliExpressConfig): Promise<any> {
  const timestamp = Date.now().toString();

  const params: Record<string, string> = {
    method: "aliexpress.ds.product.get",
    app_key: config.appKey,
    timestamp,
    format: "json",
    v: "2.0",
    sign_method: "md5",
    product_id: productId,
  };

  // Generate signature
  params.sign = generateSignature(params, config.appSecret);

  // Make API request
  const response = await axios.get(config.apiEndpoint, { params });

  if (response.data.error_response) {
    throw new Error(response.data.error_response.msg || "AliExpress API error");
  }

  return response.data.aliexpress_ds_product_get_response.result;
}

/**
 * Import Product - Main Cloud Function
 * Accepts AliExpress URL and imports raw product data
 */
export const importProduct = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { sourceUrl } = data;

  if (!sourceUrl) {
    throw new functions.https.HttpsError("invalid-argument", "sourceUrl is required");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  // Extract product ID from URL
  const productId = extractProductId(sourceUrl);
  if (!productId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid AliExpress URL. Must contain product ID."
    );
  }

  console.log(`[Import] Starting import for product ${productId}, user ${userId}`);

  try {
    // Get user's AliExpress API configuration
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User settings not found");
    }

    const userData = userDoc.data();
    const aliexpressConfig = userData?.platforms?.aliexpress;

    if (!aliexpressConfig || !aliexpressConfig.appKey || !aliexpressConfig.appSecret) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "AliExpress API not configured. Please connect AliExpress in Integrations."
      );
    }

    // Fetch product data from AliExpress API
    console.log(`[Import] Fetching product data from AliExpress API...`);
    const productData = await fetchAliExpressProduct(productId, {
      appKey: aliexpressConfig.appKey,
      appSecret: aliexpressConfig.appSecret,
      apiEndpoint: aliexpressConfig.apiEndpoint || "https://api-sg.aliexpress.com/sync",
    });

    // Check if product already imported
    const existingProduct = await db
      .collection("raw_products")
      .where("user_id", "==", userId)
      .where("raw_data.product_id", "==", productId)
      .limit(1)
      .get();

    if (!existingProduct.empty) {
      const docId = existingProduct.docs[0].id;
      console.log(`[Import] Product already exists: ${docId}`);
      return {
        success: true,
        message: "Product already imported",
        rawProductId: docId,
        status: "existing",
      };
    }

    // Create raw product document
    const rawProductData: Omit<RawProduct, "raw_product_id"> = {
      user_id: userId,
      source_platform: "aliexpress",
      source_url: sourceUrl,
      import_status: "completed",
      raw_data: {
        product_id: productId,
        title: productData.ae_item_base_info_dto?.subject || "Untitled Product",
        description: productData.ae_item_base_info_dto?.detail || "",
        category: productData.ae_item_base_info_dto?.category_id || "",
        images: productData.ae_multimedia_info_dto?.image_urls?.split(";") || [],
        price: {
          min: parseFloat(productData.ae_item_base_info_dto?.target_sale_price_min) || 0,
          max: parseFloat(productData.ae_item_base_info_dto?.target_sale_price_max) || 0,
          currency: productData.ae_item_base_info_dto?.currency_code || "USD",
        },
        rating: parseFloat(productData.ae_item_base_info_dto?.avg_evaluation_rating) || 0,
        orders: parseInt(productData.ae_item_base_info_dto?.sales) || 0,
        shipping: {
          method: productData.ae_item_base_info_dto?.delivery_time || "Standard",
          cost: 0,
          time: productData.ae_item_base_info_dto?.delivery_time || "15-30 days",
        },
        variations: productData.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o?.map((sku: any) => ({
          name: sku.sku_attr || "Option",
          values: [sku.sku_attr_name || "Default"],
        })) || [],
      },
      processing: {
        import_started_at: FieldValue.serverTimestamp(),
        import_completed_at: FieldValue.serverTimestamp(),
        retry_count: 0,
      },
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };

    const rawProductRef = await db.collection("raw_products").add(rawProductData);

    console.log(`[Import] Successfully imported product: ${rawProductRef.id}`);

    // Log activity
    await db.collection("activity_logs").add({
      action: "create",
      entityType: "product",
      entityId: rawProductRef.id,
      entityName: rawProductData.raw_data.title,
      adminEmail: context.auth.token.email || "unknown",
      adminId: userId,
      description: `Imported product from AliExpress: ${rawProductData.raw_data.title}`,
      metadata: {
        source: "aliexpress",
        product_id: productId,
        url: sourceUrl,
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "Product imported successfully",
      rawProductId: rawProductRef.id,
      status: "new",
      data: {
        title: rawProductData.raw_data.title,
        images: rawProductData.raw_data.images.slice(0, 3),
        price: rawProductData.raw_data.price,
      },
    };
  } catch (error: any) {
    console.error("[Import] Error importing product:", error);

    // Log failed import attempt
    await db.collection("raw_products").add({
      user_id: userId,
      source_platform: "aliexpress",
      source_url: sourceUrl,
      import_status: "failed",
      raw_data: {
        product_id: productId,
        title: "",
        description: "",
        category: "",
        images: [],
        price: { min: 0, max: 0, currency: "USD" },
        rating: 0,
        orders: 0,
        shipping: { method: "", cost: 0, time: "" },
      },
      processing: {
        import_started_at: FieldValue.serverTimestamp(),
        error_message: error.message || "Unknown error",
        retry_count: 0,
      },
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    throw new functions.https.HttpsError(
      "internal",
      `Failed to import product: ${error.message}`
    );
  }
});

/**
 * Get all raw products for a user
 */
export const getRawProducts = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    const rawProductsSnapshot = await db
      .collection("raw_products")
      .where("user_id", "==", userId)
      .orderBy("created_at", "desc")
      .get();

    const rawProducts: RawProduct[] = [];
    rawProductsSnapshot.forEach((doc) => {
      rawProducts.push({
        raw_product_id: doc.id,
        ...doc.data(),
      } as RawProduct);
    });

    return { success: true, rawProducts };
  } catch (error) {
    console.error("Error fetching raw products:", error);
    throw new functions.https.HttpsError("internal", "Failed to fetch raw products");
  }
});

/**
 * Delete raw product
 */
export const deleteRawProduct = functions.https.onCall(async (data, context) => {
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
    const rawProductRef = db.collection("raw_products").doc(rawProductId);
    const rawProductDoc = await rawProductRef.get();

    if (!rawProductDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Raw product not found");
    }

    const rawProduct = rawProductDoc.data();

    // Verify ownership
    if (rawProduct?.user_id !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Not authorized");
    }

    await rawProductRef.delete();

    return { success: true, message: "Raw product deleted" };
  } catch (error: any) {
    console.error("Error deleting raw product:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to delete raw product");
  }
});
