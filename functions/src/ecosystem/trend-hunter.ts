/**
 * Trend Hunter - Viral Product Detection
 * Detects trending products on TikTok, Google Trends, and other platforms
 * Helps users build stores around what's actually selling RIGHT NOW
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
// import axios from "axios"; // TODO: Uncomment when integrating real TikTok API
import OpenAI from "openai";
import { config } from "../config/environment";
import { TrendData } from "../../../shared/types/blog";

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

interface TikTokTrend {
  keyword: string;
  hashtag: string;
  views: number;
  growth_rate: number;
  category: string;
}

/**
 * Fetch trending products from TikTok Creative Center
 * Note: This requires TikTok API access or web scraping
 */
async function fetchTikTokTrends(category?: string): Promise<TikTokTrend[]> {
  // In production, this would call TikTok Creative Center API
  // For now, we'll use a mock implementation

  // Example API call:
  // const response = await axios.get('https://ads.tiktok.com/creative_radar_api/...');

  // Mock data for demonstration
  const mockTrends: TikTokTrend[] = [
    {
      keyword: "ice roller",
      hashtag: "iceroller",
      views: 45000000,
      growth_rate: 320,
      category: "beauty",
    },
    {
      keyword: "posture corrector",
      hashtag: "posturecorrector",
      views: 28000000,
      growth_rate: 215,
      category: "health",
    },
    {
      keyword: "portable blender",
      hashtag: "portableblender",
      views: 67000000,
      growth_rate: 185,
      category: "kitchen",
    },
  ];

  if (category) {
    return mockTrends.filter((t) => t.category.toLowerCase() === category.toLowerCase());
  }

  return mockTrends;
}

/**
 * Fetch trends from Google Trends
 */
async function fetchGoogleTrends(region: string = "US"): Promise<any[]> {
  // In production, use google-trends-api package
  // const googleTrends = require('google-trends-api');

  // Mock implementation
  return [
    {
      keyword: "air fryer recipes",
      growth: 250,
      category: "food",
    },
  ];
}

/**
 * Find AliExpress products matching a trend
 */
async function findTrendingProducts(keyword: string): Promise<any[]> {
  // This would use your existing scraping infrastructure
  // For now, mock data

  return [
    {
      title: `${keyword} - Best Quality`,
      url: `https://aliexpress.com/item/${Math.random().toString().slice(2, 12)}.html`,
      price: (Math.random() * 20 + 5).toFixed(2),
      image_url: `https://example.com/images/${keyword.replace(/ /g, "-")}.jpg`,
      supplier_rating: (Math.random() * 0.5 + 4.5).toFixed(1),
      orders: Math.floor(Math.random() * 10000 + 1000),
    },
  ];
}

/**
 * Generate store branding based on trend
 */
async function generateTrendBranding(trendKeyword: string): Promise<any> {
  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      {
        role: "system",
        content: "You are a brand strategist. Create compelling store branding.",
      },
      {
        role: "user",
        content: `Create a Shopify store brand for selling "${trendKeyword}" products.

Return JSON with:
{
  "store_name": "Catchy 2-word name",
  "tagline": "One sentence tagline",
  "description": "2 sentence store description",
  "color_scheme": {
    "primary": "#hexcode",
    "secondary": "#hexcode"
  },
  "target_audience": "Brief description"
}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  return JSON.parse(completion.choices[0].message.content || "{}");
}

/**
 * Cloud Function: Analyze current trends
 */
export const analyzeTrends = functions
  .runWith({
    timeoutSeconds: 120,
    memory: "512MB",
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }

    const { category, source = "tiktok" } = data;

    try {
      let trends: any[] = [];

      if (source === "tiktok") {
        trends = await fetchTikTokTrends(category);
      } else if (source === "google") {
        trends = await fetchGoogleTrends();
      }

      // Store trends in Firestore for later use
      const db = getFirestore();
      const batch = db.batch();

      trends.forEach((trend) => {
        const trendRef = db.collection("trends").doc();
        batch.set(trendRef, {
          trend_id: trendRef.id,
          source,
          keyword: trend.keyword,
          hashtag: trend.hashtag,
          search_volume: trend.views || trend.growth * 1000,
          trend_score: trend.growth_rate || trend.growth || 100,
          category: trend.category,
          detected_at: FieldValue.serverTimestamp(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
      });

      await batch.commit();

      return {
        success: true,
        trends: trends.slice(0, 10), // Return top 10
      };
    } catch (error) {
      console.error("Trend analysis error:", error);
      throw new functions.https.HttpsError("internal", "Failed to analyze trends");
    }
  });

/**
 * Cloud Function: Build a store from a trend
 */
export const buildViralStore = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "1GB",
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }

    const { trendKeyword, productCount = 5 } = data;

    if (!trendKeyword) {
      throw new functions.https.HttpsError("invalid-argument", "trendKeyword is required");
    }

    const db = getFirestore();
    const userId = context.auth.uid;

    try {
      console.log(`Building viral store for trend: ${trendKeyword}`);

      // Step 1: Generate branding
      const branding = await generateTrendBranding(trendKeyword);

      // Step 2: Find trending products
      const products = await findTrendingProducts(trendKeyword);
      const topProducts = products.slice(0, productCount);

      // Step 3: Create products in database
      const productIds: string[] = [];

      for (const product of topProducts) {
        const productRef = await db.collection("products").add({
          user_id: userId,
          platform: "shopify",
          platform_id: `viral_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name: product.title,
          original_image_url: product.image_url,
          content_status: "RAW_IMPORT",
          content_flags: {
            text_refined: false,
            images_refined: false,
            auto_refine_images: true,
          },
          public_data: {
            title: product.title,
            original_title: product.title,
            original_description: `Trending ${trendKeyword} product`,
            features: [],
            images: [product.image_url],
            original_images: [product.image_url],
            short_description: "",
          },
          monitored_supplier: {
            url: product.url,
            status: "ACTIVE",
            current_price: parseFloat(product.price),
            stock_level: 999,
            last_checked: FieldValue.serverTimestamp(),
            supplier_rating: parseFloat(product.supplier_rating),
          },
          ai_insights: {
            risk_score: 20, // Low risk for trending products
            predicted_removal_date: null,
            last_analyzed: FieldValue.serverTimestamp(),
          },
          automation_log: [
            {
              action: "VIRAL_IMPORT",
              timestamp: new Date(),
              details: `Imported from trend: ${trendKeyword}`,
            },
          ],
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        });

        productIds.push(productRef.id);
      }

      // Step 4: Create trend report
      const reportRef = await db.collection("trend_reports").add({
        user_id: userId,
        trend_keyword: trendKeyword,
        branding,
        product_ids: productIds,
        products_count: productIds.length,
        created_at: FieldValue.serverTimestamp(),
      });

      console.log(`Viral store built successfully: ${reportRef.id}`);

      return {
        success: true,
        report_id: reportRef.id,
        branding,
        products_imported: productIds.length,
        product_ids: productIds,
        message: `Built a ${branding.store_name} store with ${productIds.length} trending products!`,
      };
    } catch (error) {
      console.error("Build viral store error:", error);
      throw new functions.https.HttpsError("internal", "Failed to build viral store");
    }
  });

/**
 * Scheduled function: Daily trend detection
 */
export const dailyTrendScan = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    const db = getFirestore();

    try {
      // Fetch latest trends
      const tiktokTrends = await fetchTikTokTrends();

      // Store in database
      const batch = db.batch();

      tiktokTrends.forEach((trend) => {
        const trendRef = db.collection("trends").doc();
        batch.set(trendRef, {
          trend_id: trendRef.id,
          source: "tiktok",
          keyword: trend.keyword,
          hashtag: trend.hashtag,
          search_volume: trend.views,
          trend_score: trend.growth_rate,
          category: trend.category,
          detected_at: FieldValue.serverTimestamp(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        } as TrendData);
      });

      await batch.commit();

      console.log(`Daily trend scan completed: ${tiktokTrends.length} trends saved`);

      return { success: true, trends_found: tiktokTrends.length };
    } catch (error) {
      console.error("Daily trend scan error:", error);
      throw error;
    }
  });
