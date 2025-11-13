/**
 * Platform Controller
 * Unified interface for all e-commerce platforms
 */

import { UserPlatforms } from "../../../shared/types/database";
import { updateShopifyStock, updateShopifyPrice } from "./shopify";
import { updateWooCommerceStock, updateWooCommercePrice } from "./woocommerce";

/**
 * Update stock across any platform
 */
export async function updatePlatformStock(
  platform: "shopify" | "woocommerce",
  platformProductId: string,
  userPlatforms: UserPlatforms,
  quantity: number
): Promise<void> {
  try {
    if (platform === "shopify") {
      if (!userPlatforms.shopify) {
        throw new Error("Shopify not configured");
      }
      await updateShopifyStock(platformProductId, quantity, userPlatforms.shopify);
    } else if (platform === "woocommerce") {
      if (!userPlatforms.woocommerce) {
        throw new Error("WooCommerce not configured");
      }
      await updateWooCommerceStock(platformProductId, quantity, userPlatforms.woocommerce);
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    console.log(`Successfully updated stock on ${platform} for product ${platformProductId}`);
  } catch (error) {
    console.error(`Failed to update stock on ${platform}:`, error);
    throw error;
  }
}

/**
 * Update price across any platform
 */
export async function updatePlatformPrice(
  platform: "shopify" | "woocommerce",
  platformProductId: string,
  userPlatforms: UserPlatforms,
  newPrice: number
): Promise<void> {
  try {
    if (platform === "shopify") {
      if (!userPlatforms.shopify) {
        throw new Error("Shopify not configured");
      }
      await updateShopifyPrice(platformProductId, newPrice, userPlatforms.shopify);
    } else if (platform === "woocommerce") {
      if (!userPlatforms.woocommerce) {
        throw new Error("WooCommerce not configured");
      }
      await updateWooCommercePrice(platformProductId, newPrice, userPlatforms.woocommerce);
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    console.log(`Successfully updated price on ${platform} for product ${platformProductId}`);
  } catch (error) {
    console.error(`Failed to update price on ${platform}:`, error);
    throw error;
  }
}
