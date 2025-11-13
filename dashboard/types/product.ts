/**
 * Frontend TypeScript types
 */

export interface Product {
  product_id: string;
  user_id: string;
  platform: 'shopify' | 'woocommerce';
  platform_id: string;
  name: string;
  original_image_url: string;
  monitored_supplier: {
    url: string;
    status: 'ACTIVE' | 'REMOVED' | 'OUT_OF_STOCK' | 'PRICE_CHANGED';
    current_price: number;
    stock_level: number;
    last_checked: any;
    supplier_rating?: number;
    shipping_method?: string;
  };
  ai_insights: {
    risk_score: number;
    predicted_removal_date: any;
    image_match_confidence?: number;
    last_analyzed: any;
  };
  automation_log: AutomationLogEntry[];
  created_at: any;
  updated_at: any;
}

export interface AutomationLogEntry {
  action: string;
  old_value?: any;
  new_value?: any;
  timestamp: any;
  details?: string;
}
