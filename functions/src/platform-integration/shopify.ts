/**
 * Shopify Platform Integration
 * Handles all Shopify API operations
 */

import "@shopify/shopify-api/adapters/node";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import { ShopifyPlatform } from "../../../shared/types/database";

/**
 * Initialize Shopify REST client
 */
function getShopifyClient(platform: ShopifyPlatform) {
  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
    scopes: ["read_products", "write_products"],
    hostName: platform.shop_url,
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: false,
  });

  const session = {
    id: `offline_${platform.shop_url}`,
    shop: platform.shop_url,
    state: "offline",
    isOnline: false,
    accessToken: platform.access_token,
  };

  return new shopify.clients.Rest({ session: session as any });
}

/**
 * Update product stock quantity in Shopify
 */
export async function updateShopifyStock(
  shopifyProductId: string,
  quantity: number,
  platform: ShopifyPlatform
): Promise<void> {
  try {
    console.log(`Updating Shopify product ${shopifyProductId} stock to ${quantity}`);

    const client = getShopifyClient(platform);

    // Step 1: Get the product to find the variant
    const productResponse = await client.get({
      path: `products/${shopifyProductId}`,
    });

    const product = productResponse.body as any;

    if (!product.product || !product.product.variants || product.product.variants.length === 0) {
      throw new Error("Product or variants not found");
    }

    // Get the first variant (or you could update all variants)
    const variant = product.product.variants[0];
    const inventoryItemId = variant.inventory_item_id;

    // Step 2: Get inventory levels to find location
    const inventoryLevelsResponse = await client.get({
      path: `inventory_levels`,
      query: { inventory_item_ids: inventoryItemId },
    });

    const inventoryLevels = inventoryLevelsResponse.body as any;

    if (!inventoryLevels.inventory_levels || inventoryLevels.inventory_levels.length === 0) {
      throw new Error("No inventory levels found");
    }

    // Use the first location or the configured location
    const locationId = platform.location_id || inventoryLevels.inventory_levels[0].location_id;

    // Step 3: Set the inventory level
    await client.post({
      path: "inventory_levels/set",
      data: {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available: quantity,
      },
      type: "application/json" as any,
    });

    console.log(`Successfully updated Shopify stock for product ${shopifyProductId}`);
  } catch (error) {
    console.error("Shopify stock update error:", error);
    throw new Error(`Failed to update Shopify stock: ${(error as Error).message}`);
  }
}

/**
 * Update product price in Shopify
 */
export async function updateShopifyPrice(
  shopifyProductId: string,
  newPrice: number,
  platform: ShopifyPlatform
): Promise<void> {
  try {
    console.log(`Updating Shopify product ${shopifyProductId} price to $${newPrice}`);

    const client = getShopifyClient(platform);

    // Get the product
    const productResponse = await client.get({
      path: `products/${shopifyProductId}`,
    });

    const product = productResponse.body as any;
    const variantId = product.product.variants[0].id;

    // Update the variant price
    await client.put({
      path: `variants/${variantId}`,
      data: {
        variant: {
          id: variantId,
          price: newPrice.toFixed(2),
        },
      },
      type: "application/json" as any,
    });

    console.log(`Successfully updated Shopify price for product ${shopifyProductId}`);
  } catch (error) {
    console.error("Shopify price update error:", error);
    throw new Error(`Failed to update Shopify price: ${(error as Error).message}`);
  }
}

/**
 * Get product details from Shopify
 */
export async function getShopifyProduct(shopifyProductId: string, platform: ShopifyPlatform): Promise<any> {
  try {
    const client = getShopifyClient(platform);

    const response = await client.get({
      path: `products/${shopifyProductId}`,
    });

    return response.body;
  } catch (error) {
    console.error("Shopify get product error:", error);
    throw new Error(`Failed to get Shopify product: ${(error as Error).message}`);
  }
}

/**
 * Webhook handler for new Shopify products
 * Call this when you receive a products/create webhook
 */
export async function handleShopifyProductCreated(productData: any, userId: string): Promise<void> {
  // TODO: Implement logic to add product to monitoring
  // This would typically:
  // 1. Extract product details
  // 2. Prompt user to add supplier URL
  // 3. Create product document in Firestore
  console.log("Shopify product created webhook received", { productData, userId });
}
