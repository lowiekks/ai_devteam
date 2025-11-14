/**
 * WooCommerce Publisher - Step 4
 * Publishes enhanced products to WooCommerce stores
 */

import axios from "axios";
import * as crypto from "crypto";

export interface WooCommercePublishConfig {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  version?: string;
}

export interface WooCommerceProductData {
  name: string;
  type: "simple" | "variable";
  status: "publish" | "draft";
  description: string;
  short_description: string;
  categories: Array<{ name: string }>;
  tags: Array<{ name: string }>;
  images: Array<{ src: string }>;
  regular_price: string;
  sale_price?: string;
}

/**
 * Generate OAuth signature for WooCommerce
 */
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string
): string {
  // Sort parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");

  // Create signature base string
  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join("&");

  // Create signing key (consumer_secret&)
  const signingKey = `${encodeURIComponent(consumerSecret)}&`;

  // Generate HMAC-SHA256 signature
  const signature = crypto.createHmac("sha256", signingKey).update(baseString).digest("base64");

  return signature;
}

/**
 * Publish enhanced product to WooCommerce
 */
export async function publishToWooCommerce(
  config: WooCommercePublishConfig,
  productData: {
    title: string;
    shortDescription: string;
    longDescription: string;
    images: string[];
    price: number;
    compareAtPrice?: number;
    tags: string[];
    category: string;
  }
): Promise<{ success: boolean; productId?: string; productUrl?: string; error?: string }> {
  const version = config.version || "wc/v3";
  const apiUrl = `${config.siteUrl}/wp-json/${version}/products`;

  try {
    // Prepare WooCommerce product payload
    const wooProduct: WooCommerceProductData = {
      name: productData.title,
      type: "simple",
      status: "publish",
      description: productData.longDescription,
      short_description: productData.shortDescription,
      categories: [{ name: productData.category }],
      tags: productData.tags.map((tag) => ({ name: tag })),
      images: productData.images.map((src) => ({ src })),
      regular_price: productData.price.toFixed(2),
      sale_price: productData.compareAtPrice
        ? productData.price.toFixed(2)
        : undefined,
    };

    console.log(`[WooCommerce] Publishing product: ${productData.title}`);

    // Make API request with Basic Auth
    const response = await axios.post(apiUrl, wooProduct, {
      params: {
        consumer_key: config.consumerKey,
        consumer_secret: config.consumerSecret,
      },
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    const createdProduct = response.data;
    const productId = createdProduct.id.toString();
    const productUrl = createdProduct.permalink || `${config.siteUrl}/product/${createdProduct.slug}`;

    console.log(`[WooCommerce] ✓ Product published successfully. ID: ${productId}`);

    return {
      success: true,
      productId,
      productUrl,
    };
  } catch (error: any) {
    console.error(
      "[WooCommerce] Error publishing product:",
      error.response?.data || error.message
    );

    let errorMessage = "Failed to publish to WooCommerce";

    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Update existing WooCommerce product
 */
export async function updateWooCommerceProduct(
  config: WooCommercePublishConfig,
  productId: string,
  updates: Partial<WooCommerceProductData>
): Promise<{ success: boolean; error?: string }> {
  const version = config.version || "wc/v3";
  const apiUrl = `${config.siteUrl}/wp-json/${version}/products/${productId}`;

  try {
    await axios.put(apiUrl, updates, {
      params: {
        consumer_key: config.consumerKey,
        consumer_secret: config.consumerSecret,
      },
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    console.log(`[WooCommerce] ✓ Product ${productId} updated successfully`);

    return { success: true };
  } catch (error: any) {
    console.error(
      "[WooCommerce] Error updating product:",
      error.response?.data || error.message
    );

    return {
      success: false,
      error: error.message || "Failed to update WooCommerce product",
    };
  }
}

/**
 * Delete product from WooCommerce
 */
export async function deleteWooCommerceProduct(
  config: WooCommercePublishConfig,
  productId: string
): Promise<{ success: boolean; error?: string }> {
  const version = config.version || "wc/v3";
  const apiUrl = `${config.siteUrl}/wp-json/${version}/products/${productId}`;

  try {
    await axios.delete(apiUrl, {
      params: {
        consumer_key: config.consumerKey,
        consumer_secret: config.consumerSecret,
        force: true, // Permanently delete (skip trash)
      },
      timeout: 30000,
    });

    console.log(`[WooCommerce] ✓ Product ${productId} deleted successfully`);

    return { success: true };
  } catch (error: any) {
    console.error(
      "[WooCommerce] Error deleting product:",
      error.response?.data || error.message
    );

    return {
      success: false,
      error: error.message || "Failed to delete WooCommerce product",
    };
  }
}
