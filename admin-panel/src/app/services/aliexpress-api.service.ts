import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AliExpressConfig {
  appKey: string;
  appSecret: string;
  trackingId?: string; // For affiliate tracking
  apiEndpoint?: string; // Default: Aliexpress Open Platform
}

export interface AliExpressProduct {
  product_id: string;
  product_title: string;
  product_url: string;
  product_main_image_url: string;
  product_small_image_urls: string[];
  product_video_url?: string;
  category_id: number;
  original_price: string;
  sale_price: string;
  discount: string;
  currency: string;
  min_order: number;
  available_quantity: number;
  seller_id: string;
  seller_name: string;
  ship_from_country: string;
  ship_to_countries: string[];
  shipping_info?: {
    delivery_time: string;
    shipping_fee: string;
  };
  product_properties: Array<{
    attr_name: string;
    attr_value: string;
  }>;
  rating_score: number;
  order_count: number;
  last_updated: string;
}

export interface AliExpressSearchParams {
  keywords?: string;
  category_id?: number;
  min_price?: number;
  max_price?: number;
  page_no?: number;
  page_size?: number;
  sort?: 'price_asc' | 'price_desc' | 'sales_desc' | 'rating_desc';
  ship_to_country?: string;
}

export interface AliExpressProductDetails {
  product_id: string;
  title: string;
  description: string;
  images: string[];
  price: {
    min: string;
    max: string;
    currency: string;
  };
  variants: Array<{
    sku_id: string;
    properties: Record<string, string>;
    price: string;
    stock: number;
  }>;
  shipping: Array<{
    company: string;
    price: string;
    estimated_days: string;
  }>;
  specifications: Record<string, string>;
}

export interface AliExpressPriceAlert {
  product_id: string;
  current_price: number;
  previous_price: number;
  change_percentage: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class AliExpressApiService {
  // State
  isConnected = signal(false);
  connectionError = signal<string | null>(null);
  loading = signal(false);
  priceAlerts = signal<AliExpressPriceAlert[]>([]);

  private config: AliExpressConfig | null = null;
  private priceCache = new Map<string, number>();

  constructor(private http: HttpClient) {}

  /**
   * Initialize AliExpress connection
   */
  connect(config: AliExpressConfig): void {
    this.config = {
      ...config,
      apiEndpoint: config.apiEndpoint || 'https://api-sg.aliexpress.com/sync',
    };
    this.isConnected.set(false);
    this.connectionError.set(null);
  }

  /**
   * Test connection to AliExpress API
   */
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      throw new Error('AliExpress not configured. Call connect() first.');
    }

    this.loading.set(true);
    this.connectionError.set(null);

    try {
      // Test by making a simple category query
      await this.getCategories();

      this.isConnected.set(true);
      this.connectionError.set(null);
      return true;
    } catch (error: any) {
      this.isConnected.set(false);
      this.connectionError.set(
        error.error?.error_message || error.message || 'Connection failed'
      );
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Search products on AliExpress
   */
  async searchProducts(
    params: AliExpressSearchParams
  ): Promise<{ products: AliExpressProduct[]; total: number }> {
    this.ensureConnected();

    const requestParams = {
      method: 'aliexpress.affiliate.productSearch',
      app_key: this.config!.appKey,
      timestamp: new Date().getTime(),
      sign_method: 'md5',
      ...params,
    };

    // Generate signature
    const signature = this.generateSignature(requestParams);

    const url = this.buildUrl(requestParams, signature);
    const response = await firstValueFrom(
      this.http.get<any>(url, { headers: this.getHeaders() })
    );

    return {
      products: this.parseProducts(response),
      total: response.total_results || 0,
    };
  }

  /**
   * Get product details by ID
   */
  async getProductDetails(productId: string): Promise<AliExpressProductDetails> {
    this.ensureConnected();

    const requestParams = {
      method: 'aliexpress.affiliate.productdetail.get',
      app_key: this.config!.appKey,
      product_id: productId,
      target_currency: 'USD',
      target_language: 'EN',
      tracking_id: this.config!.trackingId || '',
      timestamp: new Date().getTime(),
      sign_method: 'md5',
    };

    const signature = this.generateSignature(requestParams);
    const url = this.buildUrl(requestParams, signature);

    const response = await firstValueFrom(
      this.http.get<any>(url, { headers: this.getHeaders() })
    );

    return this.parseProductDetails(response);
  }

  /**
   * Get product by URL
   */
  async getProductByUrl(productUrl: string): Promise<AliExpressProduct> {
    this.ensureConnected();

    // Extract product ID from URL
    const productId = this.extractProductIdFromUrl(productUrl);

    const requestParams = {
      method: 'aliexpress.affiliate.link.generate',
      app_key: this.config!.appKey,
      source_values: productId,
      promotion_link_type: 0,
      tracking_id: this.config!.trackingId || '',
      timestamp: new Date().getTime(),
      sign_method: 'md5',
    };

    const signature = this.generateSignature(requestParams);
    const url = this.buildUrl(requestParams, signature);

    const response = await firstValueFrom(
      this.http.get<any>(url, { headers: this.getHeaders() })
    );

    return this.parseProduct(response);
  }

  /**
   * Monitor price changes for a product
   */
  async monitorPrice(productId: string): Promise<void> {
    this.ensureConnected();

    const details = await this.getProductDetails(productId);
    const currentPrice = parseFloat(details.price.min);

    // Check if we have a previous price
    const previousPrice = this.priceCache.get(productId);

    if (previousPrice && previousPrice !== currentPrice) {
      const changePercentage = ((currentPrice - previousPrice) / previousPrice) * 100;

      // Add price alert
      const alert: AliExpressPriceAlert = {
        product_id: productId,
        current_price: currentPrice,
        previous_price: previousPrice,
        change_percentage: changePercentage,
        timestamp: new Date(),
      };

      const alerts = [...this.priceAlerts(), alert];
      this.priceAlerts.set(alerts);
    }

    // Update cache
    this.priceCache.set(productId, currentPrice);
  }

  /**
   * Get product categories
   */
  async getCategories(): Promise<any[]> {
    this.ensureConnected();

    const requestParams = {
      method: 'aliexpress.affiliate.category.get',
      app_key: this.config!.appKey,
      timestamp: new Date().getTime(),
      sign_method: 'md5',
    };

    const signature = this.generateSignature(requestParams);
    const url = this.buildUrl(requestParams, signature);

    const response = await firstValueFrom(
      this.http.get<any>(url, { headers: this.getHeaders() })
    );

    return response.categories || [];
  }

  /**
   * Get hot products (trending)
   */
  async getHotProducts(params?: {
    category_id?: number;
    page_no?: number;
    page_size?: number;
  }): Promise<AliExpressProduct[]> {
    this.ensureConnected();

    const requestParams = {
      method: 'aliexpress.affiliate.hotproduct.query',
      app_key: this.config!.appKey,
      timestamp: new Date().getTime(),
      sign_method: 'md5',
      ...params,
    };

    const signature = this.generateSignature(requestParams);
    const url = this.buildUrl(requestParams, signature);

    const response = await firstValueFrom(
      this.http.get<any>(url, { headers: this.getHeaders() })
    );

    return this.parseProducts(response);
  }

  /**
   * Generate affiliate link for a product
   */
  async generateAffiliateLink(productUrl: string): Promise<string> {
    this.ensureConnected();

    const requestParams = {
      method: 'aliexpress.affiliate.link.generate',
      app_key: this.config!.appKey,
      source_values: productUrl,
      promotion_link_type: 0,
      tracking_id: this.config!.trackingId || '',
      timestamp: new Date().getTime(),
      sign_method: 'md5',
    };

    const signature = this.generateSignature(requestParams);
    const url = this.buildUrl(requestParams, signature);

    const response = await firstValueFrom(
      this.http.get<any>(url, { headers: this.getHeaders() })
    );

    return response.promotion_links?.[0]?.promotion_link || productUrl;
  }

  /**
   * Disconnect from AliExpress
   */
  disconnect(): void {
    this.config = null;
    this.isConnected.set(false);
    this.connectionError.set(null);
    this.priceCache.clear();
    this.priceAlerts.set([]);
  }

  // Private helper methods

  private ensureConnected(): void {
    if (!this.config) {
      throw new Error('AliExpress not configured. Call connect() first.');
    }
  }

  private buildUrl(params: Record<string, any>, signature: string): string {
    if (!this.config) {
      throw new Error('AliExpress not configured');
    }

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    queryParams.append('sign', signature);

    return `${this.config.apiEndpoint}?${queryParams.toString()}`;
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  private generateSignature(params: Record<string, any>): string {
    // Sort parameters
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc: Record<string, any>, key) => {
        acc[key] = params[key];
        return acc;
      }, {});

    // Create sign string
    let signStr = this.config!.appSecret;
    Object.entries(sorted).forEach(([key, value]) => {
      signStr += `${key}${value}`;
    });
    signStr += this.config!.appSecret;

    // Calculate MD5 hash (in production, use a crypto library)
    // This is a placeholder - implement proper MD5 hashing
    return this.simpleMD5(signStr).toUpperCase();
  }

  private simpleMD5(str: string): string {
    // Placeholder MD5 - in production, use crypto-js or similar
    // For now, return a hash-like string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private extractProductIdFromUrl(url: string): string {
    // Extract product ID from AliExpress URL
    const match = url.match(/\/(\d+)\.html/);
    return match ? match[1] : '';
  }

  private parseProducts(response: any): AliExpressProduct[] {
    // Parse API response into our format
    const products = response.products || response.result?.products || [];
    return products.map((p: any) => this.parseProduct(p));
  }

  private parseProduct(data: any): AliExpressProduct {
    return {
      product_id: data.product_id || data.productId,
      product_title: data.product_title || data.title,
      product_url: data.product_url || data.productUrl,
      product_main_image_url: data.product_main_image_url || data.imageUrl,
      product_small_image_urls: data.product_small_image_urls || [],
      product_video_url: data.product_video_url,
      category_id: data.category_id || 0,
      original_price: data.original_price || '0',
      sale_price: data.sale_price || data.targetSalePrice || '0',
      discount: data.discount || '0',
      currency: data.targetCurrency || 'USD',
      min_order: data.min_order || 1,
      available_quantity: data.available_quantity || 0,
      seller_id: data.seller_id || '',
      seller_name: data.seller_name || '',
      ship_from_country: data.ship_from_country || 'CN',
      ship_to_countries: data.ship_to_countries || [],
      product_properties: data.product_properties || [],
      rating_score: data.rating_score || 0,
      order_count: data.order_count || 0,
      last_updated: new Date().toISOString(),
    };
  }

  private parseProductDetails(response: any): AliExpressProductDetails {
    const data = response.result || response;
    return {
      product_id: data.product_id,
      title: data.subject || data.title,
      description: data.description || '',
      images: data.images || [],
      price: {
        min: data.target_min_price || '0',
        max: data.target_max_price || '0',
        currency: data.target_currency || 'USD',
      },
      variants: data.sku_list || [],
      shipping: data.shipping_info || [],
      specifications: data.specifications || {},
    };
  }
}
