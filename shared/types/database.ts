import { Timestamp } from "firebase-admin/firestore";

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

export interface UserPlatforms {
  shopify?: ShopifyPlatform;
  woocommerce?: WooCommercePlatform;
}

export interface UserSettings {
  auto_replace: boolean;
  min_supplier_rating: number;
  max_price_variance: number; // Percentage
  notification_email?: string;
  notification_webhooks?: string[];
}

export interface User {
  uid: string;
  email: string;
  plan: PlanType;
  platforms: UserPlatforms;
  settings: UserSettings;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ==================== PRODUCT TYPES ====================

export type ProductStatus = "ACTIVE" | "REMOVED" | "OUT_OF_STOCK" | "PRICE_CHANGED";

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
  monitored_supplier: MonitoredSupplier;
  ai_insights: AIInsights;
  automation_log: AutomationLogEntry[];
  created_at: Timestamp;
  updated_at: Timestamp;
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
