/**
 * WooCommerce Platform Integration
 * Handles all WooCommerce API operations
 */

import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { WooCommercePlatform } from "../../../shared/types/database";

/**
 * Initialize WooCommerce API client
 */
function getWooCommerceClient(platform: WooCommercePlatform) {
  return new WooCommerceRestApi({
    url: platform.url,
    consumerKey: platform.consumer_key,
    consumerSecret: platform.consumer_secret,
    version: "wc/v3",
  });
}

/**
 * Update product stock quantity in WooCommerce
 */
export async function updateWooCommerceStock(
  wooProductId: string,
  quantity: number,
  platform: WooCommercePlatform
): Promise<void> {
  try {
    console.log(`Updating WooCommerce product ${wooProductId} stock to ${quantity}`);

    const api = getWooCommerceClient(platform);

    await api.put(`products/${wooProductId}`, {
      manage_stock: true,
      stock_quantity: quantity,
      stock_status: quantity > 0 ? "instock" : "outofstock",
    });

    console.log(`Successfully updated WooCommerce stock for product ${wooProductId}`);
  } catch (error) {
    console.error("WooCommerce stock update error:", error);
    throw new Error(`Failed to update WooCommerce stock: ${(error as Error).message}`);
  }
}

/**
 * Update product price in WooCommerce
 */
export async function updateWooCommercePrice(
  wooProductId: string,
  newPrice: number,
  platform: WooCommercePlatform
): Promise<void> {
  try {
    console.log(`Updating WooCommerce product ${wooProductId} price to $${newPrice}`);

    const api = getWooCommerceClient(platform);

    await api.put(`products/${wooProductId}`, {
      regular_price: newPrice.toFixed(2),
    });

    console.log(`Successfully updated WooCommerce price for product ${wooProductId}`);
  } catch (error) {
    console.error("WooCommerce price update error:", error);
    throw new Error(`Failed to update WooCommerce price: ${(error as Error).message}`);
  }
}

/**
 * Get product details from WooCommerce
 */
export async function getWooCommerceProduct(wooProductId: string, platform: WooCommercePlatform): Promise<any> {
  try {
    const api = getWooCommerceClient(platform);

    const response = await api.get(`products/${wooProductId}`);
    return response.data;
  } catch (error) {
    console.error("WooCommerce get product error:", error);
    throw new Error(`Failed to get WooCommerce product: ${(error as Error).message}`);
  }
}

/**
 * Webhook handler for new WooCommerce products
 */
export async function handleWooCommerceProductCreated(productData: any, userId: string): Promise<void> {
  // TODO: Implement logic to add product to monitoring
  console.log("WooCommerce product created webhook received", { productData, userId });
}
