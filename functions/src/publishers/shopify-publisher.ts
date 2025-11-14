/**
 * Shopify Publisher - Step 4
 * Publishes enhanced products to Shopify stores
 */

import axios from "axios";

export interface ShopifyPublishConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}

export interface ShopifyProductData {
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string[];
  images: Array<{ src: string }>;
  variants: Array<{
    price: string;
    compare_at_price?: string;
    inventory_management: string;
    inventory_policy: string;
  }>;
  status: "active" | "draft";
}

/**
 * Publish enhanced product to Shopify
 */
export async function publishToShopify(
  config: ShopifyPublishConfig,
  productData: {
    title: string;
    description: string;
    images: string[];
    price: number;
    compareAtPrice?: number;
    tags: string[];
    category: string;
  }
): Promise<{ success: boolean; productId?: string; productUrl?: string; error?: string }> {
  const apiVersion = config.apiVersion || "2024-01";
  const apiUrl = `https://${config.shopDomain}/admin/api/${apiVersion}/products.json`;

  try {
    // Prepare Shopify product payload
    const shopifyProduct: { product: ShopifyProductData } = {
      product: {
        title: productData.title,
        body_html: productData.description,
        vendor: "Your Store",
        product_type: productData.category,
        tags: productData.tags,
        images: productData.images.map((src) => ({ src })),
        variants: [
          {
            price: productData.price.toFixed(2),
            compare_at_price: productData.compareAtPrice?.toFixed(2),
            inventory_management: "shopify",
            inventory_policy: "deny",
          },
        ],
        status: "active",
      },
    };

    console.log(`[Shopify] Publishing product: ${productData.title}`);

    // Make API request
    const response = await axios.post(apiUrl, shopifyProduct, {
      headers: {
        "X-Shopify-Access-Token": config.accessToken,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    const createdProduct = response.data.product;
    const productId = createdProduct.id.toString();
    const productUrl = `https://${config.shopDomain}/admin/products/${productId}`;

    console.log(`[Shopify] ✓ Product published successfully. ID: ${productId}`);

    return {
      success: true,
      productId,
      productUrl,
    };
  } catch (error: any) {
    console.error("[Shopify] Error publishing product:", error.response?.data || error.message);

    let errorMessage = "Failed to publish to Shopify";

    if (error.response?.data?.errors) {
      errorMessage = JSON.stringify(error.response.data.errors);
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
 * Update existing Shopify product
 */
export async function updateShopifyProduct(
  config: ShopifyPublishConfig,
  productId: string,
  updates: Partial<ShopifyProductData>
): Promise<{ success: boolean; error?: string }> {
  const apiVersion = config.apiVersion || "2024-01";
  const apiUrl = `https://${config.shopDomain}/admin/api/${apiVersion}/products/${productId}.json`;

  try {
    await axios.put(
      apiUrl,
      { product: updates },
      {
        headers: {
          "X-Shopify-Access-Token": config.accessToken,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log(`[Shopify] ✓ Product ${productId} updated successfully`);

    return { success: true };
  } catch (error: any) {
    console.error("[Shopify] Error updating product:", error.response?.data || error.message);

    return {
      success: false,
      error: error.message || "Failed to update Shopify product",
    };
  }
}

/**
 * Delete product from Shopify
 */
export async function deleteShopifyProduct(
  config: ShopifyPublishConfig,
  productId: string
): Promise<{ success: boolean; error?: string }> {
  const apiVersion = config.apiVersion || "2024-01";
  const apiUrl = `https://${config.shopDomain}/admin/api/${apiVersion}/products/${productId}.json`;

  try {
    await axios.delete(apiUrl, {
      headers: {
        "X-Shopify-Access-Token": config.accessToken,
      },
      timeout: 30000,
    });

    console.log(`[Shopify] ✓ Product ${productId} deleted successfully`);

    return { success: true };
  } catch (error: any) {
    console.error("[Shopify] Error deleting product:", error.response?.data || error.message);

    return {
      success: false,
      error: error.message || "Failed to delete Shopify product",
    };
  }
}
