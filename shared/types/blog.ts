/**
 * Blog/SEO Content Types
 * For programmatic SEO and content marketing
 */

import { Timestamp } from "firebase-admin/firestore";

export type BlogPostStatus = "draft" | "published" | "archived";

export type BlogPostType =
  | "product_review"      // "Product X Review: Is It Worth It?"
  | "comparison"          // "Product X vs Product Y"
  | "best_of_list"        // "10 Best Products for..."
  | "how_to_guide"        // "How to Choose the Perfect..."
  | "trend_article";      // "Why Everyone is Buying..."

export interface BlogPost {
  post_id: string;
  user_id: string;
  product_id?: string;  // Optional - some posts may cover multiple products

  // Content
  title: string;
  slug: string;  // URL-friendly version
  content: string;  // Markdown format
  excerpt: string;  // Short summary (150 chars)

  // SEO
  meta_title?: string;
  meta_description?: string;
  keywords: string[];
  featured_image_url?: string;

  // Classification
  post_type: BlogPostType;
  categories: string[];
  tags: string[];

  // Publishing
  status: BlogPostStatus;
  published_at?: Timestamp;
  scheduled_for?: Timestamp;

  // Analytics
  views: number;
  shares: number;

  // AI Generation Metadata
  generated_by_ai: boolean;
  ai_prompt_used?: string;
  word_count: number;

  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TrendData {
  trend_id: string;

  // Source
  source: "tiktok" | "google_trends" | "pinterest" | "instagram";
  source_url?: string;

  // Content
  keyword: string;
  hashtag?: string;
  search_volume?: number;  // Monthly searches
  trend_score: number;  // 0-100 (virality)

  // Category
  category: string;
  niche?: string;

  // Related Products
  suggested_products?: {
    aliexpress_url: string;
    title: string;
    price: number;
    orders: number;
  }[];

  // Time
  detected_at: Timestamp;
  expires_at?: Timestamp;  // When trend is predicted to die

  // Metadata
  region?: string;  // Geographic region (US, UK, etc.)
  demographics?: {
    age_range?: string;
    gender?: string;
  };
}

export interface SEOTemplate {
  template_id: string;
  name: string;
  post_type: BlogPostType;

  // Prompt template with variables
  prompt_template: string;

  // Example:
  // "Write a 1000-word blog post titled '{title}'.
  //  Structure: 1) The Problem, 2) The Solution ({product_name}),
  //  3) Comparison table, 4) CTA"

  variables: string[];  // ["title", "product_name", "price"]

  // SEO Guidelines
  min_word_count: number;
  max_word_count: number;
  required_sections: string[];

  is_active: boolean;
  created_at: Timestamp;
}
