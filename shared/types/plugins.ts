/**
 * Plugin Marketplace Types
 * Defines the plugin system for monetization and feature upsells
 */

import { Timestamp } from "firebase-admin/firestore";

export type PluginCategory =
  | "automation"
  | "marketing"
  | "analytics"
  | "content"
  | "integration";

export interface Plugin {
  plugin_id: string;
  name: string;
  description: string;
  category: PluginCategory;
  icon_url?: string;
  monthly_cost: number;  // USD

  // Features
  features: string[];  // List of bullet points

  // Technical
  cloud_function_trigger?: string;  // Function name this enables
  required_apis?: string[];  // External APIs needed

  // Metadata
  is_active: boolean;
  installs: number;  // Total number of active installations
  rating?: number;  // Average user rating (1-5)

  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UserPlugin {
  user_plugin_id: string;
  user_id: string;
  plugin_id: string;

  // Billing
  stripe_subscription_item_id?: string;

  // Status
  is_active: boolean;
  installed_at: Timestamp;
  uninstalled_at?: Timestamp;

  // Usage tracking (for metered billing)
  usage_count?: number;
  last_used_at?: Timestamp;
}

// Built-in plugins configuration
export const BUILTIN_PLUGINS: Omit<Plugin, "created_at" | "updated_at" | "installs">[] = [
  {
    plugin_id: "auto_healer",
    name: "AI Auto-Healer",
    description: "Automatically find and switch to new suppliers when products are removed. Never lose a sale!",
    category: "automation",
    monthly_cost: 10,
    features: [
      "Automatic supplier replacement",
      "AI-powered supplier vetting",
      "Reverse image search",
      "Zero downtime switching",
    ],
    cloud_function_trigger: "handleProductRemoval",
    required_apis: ["google_vision", "openai"],
    is_active: true,
    rating: 4.8,
  },
  {
    plugin_id: "seo_blog_writer",
    name: "SEO Blog Generator",
    description: "AI writes SEO-optimized blog posts for every product. Get free organic traffic!",
    category: "marketing",
    monthly_cost: 15,
    features: [
      "Auto-generate blog posts",
      "Product comparison articles",
      "Viral trend content",
      "Internal linking strategy",
    ],
    cloud_function_trigger: "generateProductBlog",
    required_apis: ["openai"],
    is_active: true,
    rating: 4.6,
  },
  {
    plugin_id: "review_importer",
    name: "AliExpress Review Importer",
    description: "Import real customer reviews from AliExpress to build trust and boost conversions.",
    category: "content",
    monthly_cost: 5,
    features: [
      "Import verified reviews",
      "Filter by rating",
      "Auto-translate reviews",
      "Photo reviews included",
    ],
    cloud_function_trigger: "importReviews",
    is_active: true,
    rating: 4.9,
  },
  {
    plugin_id: "social_media_auto_post",
    name: "Social Media Auto-Poster",
    description: "Automatically post new products to Instagram, Facebook, and TikTok.",
    category: "marketing",
    monthly_cost: 12,
    features: [
      "Multi-platform posting",
      "Scheduled content calendar",
      "Hashtag optimization",
      "Performance analytics",
    ],
    required_apis: ["instagram_api", "facebook_api", "tiktok_api"],
    is_active: true,
    rating: 4.5,
  },
  {
    plugin_id: "trend_hunter",
    name: "Viral Trend Hunter",
    description: "Get instant alerts when products go viral on TikTok. Be the first to market!",
    category: "analytics",
    monthly_cost: 20,
    features: [
      "Real-time TikTok trend tracking",
      "Viral hashtag detection",
      "Competitor analysis",
      "One-click import trending products",
    ],
    required_apis: ["tiktok_creative_center"],
    is_active: true,
    rating: 4.7,
  },
  {
    plugin_id: "smart_pricing",
    name: "Dynamic Pricing AI",
    description: "AI adjusts your prices based on demand, competition, and seasonality to maximize profit.",
    category: "automation",
    monthly_cost: 18,
    features: [
      "Competitor price monitoring",
      "Demand-based pricing",
      "Seasonal adjustments",
      "Profit margin protection",
    ],
    cloud_function_trigger: "adjustPricing",
    required_apis: ["openai"],
    is_active: true,
    rating: 4.4,
  },
];
