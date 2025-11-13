/**
 * Reverse Image Search using Google Vision API
 * Finds alternative suppliers by searching for the product image
 */

import vision from "@google-cloud/vision";
import axios from "axios";
import { SupplierCandidate } from "../../../shared/types/database";
import { scrapeProductUrl } from "../scraping/scraper";

const visionClient = new vision.ImageAnnotatorClient();

/**
 * Perform reverse image search to find alternative suppliers
 */
export async function reverseImageSearch(imageUrl: string): Promise<SupplierCandidate[]> {
  try {
    console.log(`Performing reverse image search for: ${imageUrl}`);

    // Method 1: Google Vision API Web Detection
    const candidates = await searchWithGoogleVision(imageUrl);

    // Method 2: SerpApi Google Lens (alternative/fallback)
    // const candidates = await searchWithSerpApi(imageUrl);

    console.log(`Found ${candidates.length} candidates from image search`);

    return candidates;
  } catch (error) {
    console.error("Reverse image search error:", error);
    return [];
  }
}

/**
 * Search using Google Vision API
 */
async function searchWithGoogleVision(imageUrl: string): Promise<SupplierCandidate[]> {
  try {
    const [result] = await visionClient.webDetection(imageUrl);
    const webDetection = result.webDetection;

    if (!webDetection?.pagesWithMatchingImages) {
      console.log("No matching images found");
      return [];
    }

    console.log(`Google Vision found ${webDetection.pagesWithMatchingImages.length} pages with matching images`);

    // Filter for AliExpress URLs only
    const aliexpressPages = webDetection.pagesWithMatchingImages.filter((page) =>
      page.url?.includes("aliexpress.com")
    );

    console.log(`Filtered to ${aliexpressPages.length} AliExpress pages`);

    // Extract candidates
    const candidates: SupplierCandidate[] = [];

    for (const page of aliexpressPages.slice(0, 10)) {
      // Limit to 10 for efficiency
      if (!page.url) continue;

      try {
        // Scrape the candidate URL to get details
        const scrapeResult = await scrapeProductUrl(page.url);

        if (scrapeResult.success && scrapeResult.price && scrapeResult.supplier_rating) {
          candidates.push({
            url: page.url,
            price: scrapeResult.price,
            rating: scrapeResult.supplier_rating,
            shipping_method: scrapeResult.shipping_method || "Standard Shipping",
            image_match_confidence: calculateConfidence(page, webDetection),
            total_orders: 0, // Would need additional scraping
          });
        }
      } catch (error) {
        console.error(`Failed to scrape candidate ${page.url}:`, error);
      }
    }

    return candidates.sort((a, b) => b.image_match_confidence - a.image_match_confidence);
  } catch (error) {
    console.error("Google Vision search error:", error);
    return [];
  }
}

/**
 * Calculate image match confidence (0-100)
 */
function calculateConfidence(page: any, webDetection: any): number {
  // Base confidence on the presence of full matching images
  let confidence = 70;

  if (webDetection.fullMatchingImages?.some((img: any) => img.url === page.url)) {
    confidence = 95;
  } else if (webDetection.partialMatchingImages?.some((img: any) => img.url === page.url)) {
    confidence = 85;
  }

  // Boost confidence if there's a score from Vision API
  if (page.score) {
    confidence = Math.min(100, confidence + page.score * 10);
  }

  return Math.round(confidence);
}

/**
 * Alternative: Search using SerpApi Google Lens
 * Requires SERPAPI_API_KEY environment variable
 */
export async function searchWithSerpApi(imageUrl: string): Promise<SupplierCandidate[]> {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    console.warn("SERPAPI_API_KEY not set, skipping SerpApi search");
    return [];
  }

  try {
    const response = await axios.get("https://serpapi.com/search", {
      params: {
        engine: "google_lens",
        url: imageUrl,
        api_key: apiKey,
      },
    });

    const visualMatches = response.data.visual_matches || [];

    // Filter for AliExpress results
    const aliexpressMatches = visualMatches.filter((match: any) =>
      match.link?.includes("aliexpress.com")
    );

    console.log(`SerpApi found ${aliexpressMatches.length} AliExpress matches`);

    const candidates: SupplierCandidate[] = [];

    for (const match of aliexpressMatches.slice(0, 10)) {
      try {
        const scrapeResult = await scrapeProductUrl(match.link);

        if (scrapeResult.success && scrapeResult.price && scrapeResult.supplier_rating) {
          candidates.push({
            url: match.link,
            price: scrapeResult.price,
            rating: scrapeResult.supplier_rating,
            shipping_method: scrapeResult.shipping_method || "Standard Shipping",
            image_match_confidence: match.thumbnail_score ? match.thumbnail_score * 100 : 90,
            total_orders: 0,
          });
        }
      } catch (error) {
        console.error(`Failed to scrape SerpApi candidate ${match.link}:`, error);
      }
    }

    return candidates;
  } catch (error) {
    console.error("SerpApi search error:", error);
    return [];
  }
}
