// Type alias for Firebase Timestamp
// In functions code, this will be firebase-admin/firestore Timestamp
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Timestamp = any;

// ==================== USER TYPES ====================

export type PlanType = "free" | "pro" | "pro_enterprise";

export interface ShopifyPlatform {
  shop_url: string;
  access_token: string;
  location_id?: string;
}

export interface WooCommercePlatform {
  url: string;
  consumer_key: string;
  consumer_secret: string;
}

export interface AliExpressPlatform {
  appKey: string;
  appSecret: string;
  trackingId?: string;
  apiEndpoint?: string;
}

export interface UserPlatforms {
  shopify?: ShopifyPlatform;
  woocommerce?: WooCommercePlatform;
  aliexpress?: AliExpressPlatform;
}

export interface UserSettings {
  auto_replace: boolean;
  min_supplier_rating: number;
  max_price_variance: number; // Percentage
  notification_email?: string;
  notification_webhooks?: string[];

  // Content Refinery Settings
  auto_refine_text: boolean;        // Auto-run GPT-4o on imports
  auto_refine_images: boolean;      // Auto-process images (costs more)
  require_manual_review: boolean;   // Force REVIEW before LIVE
}

export interface User {
  uid: string;
  email: string;
  plan: PlanType;
  platforms: UserPlatforms;
  settings: UserSettings;
  active_plugins: string[];  // Plugin IDs user has installed
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ==================== PRODUCT TYPES ====================

export type ProductStatus = "ACTIVE" | "REMOVED" | "OUT_OF_STOCK" | "PRICE_CHANGED";

// Content Refinery Status
export type ContentStatus =
  | "RAW_IMPORT"      // Just imported from supplier
  | "PROCESSING"      // AI is refining content
  | "REVIEW"          // Ready for human approval
  | "LIVE"            // Published and active
  | "REJECTED";       // Failed review

export interface ContentFlags {
  text_refined: boolean;
  images_refined: boolean;
  auto_refine_images: boolean; // User setting per product
}

export interface PublicData {
  // Refined content (post-AI processing)
  title: string;
  short_description: string;  // The "hook" - 2 sentence compelling copy
  features: string[];          // Bullet points of key benefits
  images: string[];            // Processed, clean product images
  original_title?: string;     // Keep for comparison
  original_description?: string;
  original_images?: string[];
}

export interface SocialMedia {
  instagram_caption?: string;
  facebook_post?: string;
  twitter_post?: string;
  generated_at?: Timestamp;
  posted: boolean;
}

export interface MonitoredSupplier {
  url: string;
  status: ProductStatus;
  current_price: number;
  stock_level: number;
  last_checked: Timestamp;
  supplier_name?: string;
  supplier_rating?: number;
  shipping_method?: string;
}

export interface AIInsights {
  risk_score: number; // 0-100 (0 = low risk, 100 = high risk)
  predicted_removal_date: Timestamp | null;
  image_match_confidence?: number; // For auto-heal matches
  last_analyzed: Timestamp;
}

export type AutomationAction =
  | "PRICE_UPDATE"
  | "STOCK_UPDATE"
  | "AUTO_HEAL"
  | "SUPPLIER_SWAP"
  | "PRODUCT_REMOVED"
  | "PRODUCT_RESTORED";

export interface AutomationLogEntry {
  action: AutomationAction;
  old_value?: any;
  new_value?: any;
  timestamp: Timestamp;
  details?: string;
}

export interface Product {
  product_id: string;
  user_id: string;
  platform: "shopify" | "woocommerce";
  platform_id: string; // ID in Shopify/WooCommerce
  name: string;
  original_image_url: string;

  // Content Refinery Fields
  content_status: ContentStatus;
  content_flags: ContentFlags;
  public_data: PublicData;
  social_media?: SocialMedia;

  // Monitoring Fields
  monitored_supplier: MonitoredSupplier;
  ai_insights: AIInsights;
  automation_log: AutomationLogEntry[];

  created_at: Timestamp;
  updated_at: Timestamp;
  published_at?: Timestamp;  // When moved to LIVE
}

// ==================== SCRAPING TYPES ====================

export interface ScrapeResult {
  success: boolean;
  statusCode: number;
  price?: number;
  stock_level?: number;
  supplier_rating?: number;
  shipping_method?: string;
  pageText?: string;
  error?: string;
}

export interface SupplierCandidate {
  url: string;
  price: number;
  rating: number;
  years_in_business?: number;
  shipping_method: string;
  image_match_confidence: number;
  total_orders?: number;
}

// ==================== ANALYTICS TYPES ====================

export interface AnalyticsEvent {
  event_id: string;
  user_id: string;
  event_type: "product_removed" | "auto_heal_success" | "auto_heal_failed" | "price_changed";
  product_id: string;
  metadata: Record<string, any>;
  timestamp: Timestamp;
}

// ==================== QUEUE TYPES ====================

export interface ScrapeTaskPayload {
  productId: string;
  url: string;
  userId: string;
}

export interface AutoHealTaskPayload {
  productId: string;
  userId: string;
  originalImageUrl: string;
}
