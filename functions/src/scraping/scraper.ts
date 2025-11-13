/**
 * Scraping Infrastructure Integration
 * Supports Apify and Bright Data with residential proxies
 */

import axios from "axios";
import { config } from "../config/environment";
import { ScrapeResult } from "../../../shared/types/database";

/**
 * Apify Web Scraper Integration
 */
async function scrapeWithApify(url: string): Promise<ScrapeResult> {
  try {
    const response = await axios.post(
      `https://api.apify.com/v2/acts/${config.scraping.apify.actorId}/runs?token=${config.scraping.apify.apiKey}`,
      {
        startUrls: [{ url }],
        pageFunction: `
          async function pageFunction(context) {
            const { request, log, jQuery } = context;
            const $ = jQuery;

            // Check if product exists
            const notFound = $('body:contains("Product not found")').length > 0 ||
                           $('body:contains("Item no longer available")').length > 0 ||
                           $('.product-not-found').length > 0;

            if (notFound) {
              return {
                statusCode: 404,
                price: null,
                stock_level: 0
              };
            }

            // Extract price (AliExpress specific selectors)
            const priceText = $('.product-price-value').text() ||
                            $('.uniform-banner-box-price').text() ||
                            $('[class*="price"]').first().text();
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

            // Extract stock
            const stockText = $('.product-quantity-tip').text() ||
                            $('[class*="stock"]').text();
            const stock = parseInt(stockText.replace(/[^0-9]/g, '')) || 999;

            // Extract supplier rating
            const ratingText = $('.seller-positive-feedback').text() ||
                              $('.shop-rating').text();
            const rating = parseFloat(ratingText.replace(/[^0-9.]/g, ''));

            // Extract shipping method
            const shipping = $('.shipping-info').text().trim() ||
                           $('.delivery-info').text().trim();

            return {
              statusCode: 200,
              price: price || null,
              stock_level: stock,
              supplier_rating: rating || null,
              shipping_method: shipping,
              pageText: $('body').text().substring(0, 1000)
            };
          }
        `,
      }
    );

    // Wait for the run to complete
    const runId = response.data.data.id;
    const datasetId = await waitForApifyRun(runId);

    // Get the dataset
    const dataset = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${config.scraping.apify.apiKey}`
    );

    const result = dataset.data[0];
    return {
      success: result.statusCode === 200,
      statusCode: result.statusCode,
      price: result.price,
      stock_level: result.stock_level,
      supplier_rating: result.supplier_rating,
      shipping_method: result.shipping_method,
      pageText: result.pageText,
    };
  } catch (error: any) {
    console.error("Apify scrape error:", error);
    return {
      success: false,
      statusCode: 500,
      error: error.message,
    };
  }
}

async function waitForApifyRun(runId: string, maxWaitMs = 60000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await axios.get(
      `https://api.apify.com/v2/acts/runs/${runId}?token=${config.scraping.apify.apiKey}`
    );

    if (status.data.data.status === "SUCCEEDED") {
      return status.data.data.defaultDatasetId;
    }

    if (status.data.data.status === "FAILED" || status.data.data.status === "ABORTED") {
      throw new Error("Apify run failed");
    }

    // Wait 2 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Apify run timeout");
}

/**
 * Bright Data Integration
 */
async function scrapeWithBrightData(url: string): Promise<ScrapeResult> {
  try {
    const response = await axios.post(
      "https://api.brightdata.com/datasets/v3/trigger",
      [
        {
          url: url,
          dataset_id: "gd_aliexpress_products",
        },
      ],
      {
        headers: {
          Authorization: `Bearer ${config.scraping.brightData.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const snapshotId = response.data.snapshot_id;
    const data = await waitForBrightDataSnapshot(snapshotId);

    if (data.length === 0 || data[0].final_status === "not_found") {
      return {
        success: false,
        statusCode: 404,
      };
    }

    const product = data[0];
    return {
      success: true,
      statusCode: 200,
      price: product.price,
      stock_level: product.availability === "in_stock" ? 999 : 0,
      supplier_rating: product.seller_rating,
      shipping_method: product.shipping_method || "",
      pageText: product.title || "",
    };
  } catch (error: any) {
    console.error("Bright Data scrape error:", error);
    return {
      success: false,
      statusCode: 500,
      error: error.message,
    };
  }
}

async function waitForBrightDataSnapshot(snapshotId: string, maxWaitMs = 60000): Promise<any[]> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await axios.get(
        `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}`,
        {
          headers: {
            Authorization: `Bearer ${config.scraping.brightData.apiKey}`,
          },
        }
      );

      if (response.data.status === "ready") {
        return response.data.data;
      }
    } catch (error) {
      // Snapshot not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error("Bright Data snapshot timeout");
}

/**
 * Main scraper function - routes to the configured provider
 */
export async function scrapeProductUrl(url: string): Promise<ScrapeResult> {
  console.log(`Scraping URL: ${url} using provider: ${config.scraping.provider}`);

  if (config.scraping.provider === "apify") {
    return scrapeWithApify(url);
  } else if (config.scraping.provider === "brightdata") {
    return scrapeWithBrightData(url);
  } else {
    throw new Error(`Unknown scraping provider: ${config.scraping.provider}`);
  }
}

/**
 * Fallback simple scraper (for testing/development)
 * WARNING: This will likely be blocked on AliExpress without proxies
 */
export async function scrapeProductUrlSimple(url: string): Promise<ScrapeResult> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const pageText = response.data;
    const isRemoved = pageText.includes("Product not found") ||
                     pageText.includes("Item no longer available") ||
                     response.status === 404;

    if (isRemoved) {
      return {
        success: false,
        statusCode: 404,
      };
    }

    // Very basic price extraction (unreliable)
    const priceMatch = pageText.match(/\$\s*(\d+\.?\d*)/);
    const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;

    return {
      success: true,
      statusCode: 200,
      price,
      stock_level: 999,
      pageText: pageText.substring(0, 1000),
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return {
        success: false,
        statusCode: 404,
      };
    }

    return {
      success: false,
      statusCode: error.response?.status || 500,
      error: error.message,
    };
  }
}
