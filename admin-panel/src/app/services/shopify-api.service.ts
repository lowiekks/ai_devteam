import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ShopifyConfig {
  shopDomain: string; // e.g., 'mystore.myshopify.com'
  accessToken: string; // Admin API access token
  apiVersion?: string; // Default: '2024-01'
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  status: string;
  tags: string;
  variants: Array<{
    id: number;
    product_id: number;
    title: string;
    price: string;
    sku: string;
    inventory_quantity: number;
    compare_at_price: string | null;
  }>;
  images: Array<{
    id: number;
    product_id: number;
    position: number;
    created_at: string;
    updated_at: string;
    alt: string | null;
    width: number;
    height: number;
    src: string;
  }>;
  options: Array<{
    id: number;
    product_id: number;
    name: string;
    position: number;
    values: string[];
  }>;
}

export interface ShopifyOrder {
  id: number;
  email: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  line_items: Array<{
    id: number;
    title: string;
    price: string;
    quantity: number;
    sku: string;
    product_id: number;
    variant_id: number;
  }>;
}

export interface ShopifyInventoryLevel {
  inventory_item_id: number;
  location_id: number;
  available: number;
  updated_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class ShopifyApiService {
  // State
  isConnected = signal(false);
  connectionError = signal<string | null>(null);
  loading = signal(false);

  private config: ShopifyConfig | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Initialize Shopify connection
   */
  connect(config: ShopifyConfig): void {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || '2024-01',
      shopDomain: config.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    };
    this.isConnected.set(false);
    this.connectionError.set(null);
  }

  /**
   * Test connection to Shopify store
   */
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      throw new Error('Shopify not configured. Call connect() first.');
    }

    this.loading.set(true);
    this.connectionError.set(null);

    try {
      // Test by fetching shop info
      const url = this.buildUrl('/shop.json');
      const response = await firstValueFrom(
        this.http.get(url, { headers: this.getHeaders() })
      );

      this.isConnected.set(true);
      this.connectionError.set(null);
      return true;
    } catch (error: any) {
      this.isConnected.set(false);
      this.connectionError.set(
        error.error?.errors || error.message || 'Connection failed'
      );
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get all products from Shopify
   */
  async getProducts(params?: {
    limit?: number;
    page_info?: string;
    status?: string;
    vendor?: string;
  }): Promise<{ products: ShopifyProduct[]; pageInfo?: string }> {
    this.ensureConnected();

    const url = this.buildUrl('/products.json', params);
    const response = await firstValueFrom(
      this.http.get<{ products: ShopifyProduct[] }>(url, {
        headers: this.getHeaders(),
        observe: 'response',
      })
    );

    // Extract pagination info from Link header
    const linkHeader = response.headers.get('Link');
    const pageInfo = this.extractPageInfo(linkHeader);

    return {
      products: response.body?.products || [],
      pageInfo,
    };
  }

  /**
   * Get single product by ID
   */
  async getProduct(productId: number): Promise<ShopifyProduct> {
    this.ensureConnected();

    const url = this.buildUrl(`/products/${productId}.json`);
    const response = await firstValueFrom(
      this.http.get<{ product: ShopifyProduct }>(url, {
        headers: this.getHeaders(),
      })
    );

    return response.product;
  }

  /**
   * Create a new product
   */
  async createProduct(
    productData: Partial<ShopifyProduct>
  ): Promise<ShopifyProduct> {
    this.ensureConnected();

    const url = this.buildUrl('/products.json');
    const response = await firstValueFrom(
      this.http.post<{ product: ShopifyProduct }>(
        url,
        { product: productData },
        { headers: this.getHeaders() }
      )
    );

    return response.product;
  }

  /**
   * Update existing product
   */
  async updateProduct(
    productId: number,
    productData: Partial<ShopifyProduct>
  ): Promise<ShopifyProduct> {
    this.ensureConnected();

    const url = this.buildUrl(`/products/${productId}.json`);
    const response = await firstValueFrom(
      this.http.put<{ product: ShopifyProduct }>(
        url,
        { product: productData },
        { headers: this.getHeaders() }
      )
    );

    return response.product;
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: number): Promise<void> {
    this.ensureConnected();

    const url = this.buildUrl(`/products/${productId}.json`);
    await firstValueFrom(this.http.delete(url, { headers: this.getHeaders() }));
  }

  /**
   * Get orders
   */
  async getOrders(params?: {
    limit?: number;
    status?: string;
    financial_status?: string;
  }): Promise<ShopifyOrder[]> {
    this.ensureConnected();

    const url = this.buildUrl('/orders.json', params);
    const response = await firstValueFrom(
      this.http.get<{ orders: ShopifyOrder[] }>(url, {
        headers: this.getHeaders(),
      })
    );

    return response.orders;
  }

  /**
   * Get inventory levels
   */
  async getInventoryLevels(
    inventoryItemIds: number[]
  ): Promise<ShopifyInventoryLevel[]> {
    this.ensureConnected();

    const url = this.buildUrl('/inventory_levels.json', {
      inventory_item_ids: inventoryItemIds.join(','),
    });
    const response = await firstValueFrom(
      this.http.get<{ inventory_levels: ShopifyInventoryLevel[] }>(url, {
        headers: this.getHeaders(),
      })
    );

    return response.inventory_levels;
  }

  /**
   * Update inventory level
   */
  async updateInventoryLevel(
    inventoryItemId: number,
    locationId: number,
    available: number
  ): Promise<ShopifyInventoryLevel> {
    this.ensureConnected();

    const url = this.buildUrl('/inventory_levels/set.json');
    const response = await firstValueFrom(
      this.http.post<{ inventory_level: ShopifyInventoryLevel }>(
        url,
        {
          location_id: locationId,
          inventory_item_id: inventoryItemId,
          available,
        },
        { headers: this.getHeaders() }
      )
    );

    return response.inventory_level;
  }

  /**
   * Get store information
   */
  async getShopInfo(): Promise<any> {
    this.ensureConnected();

    const url = this.buildUrl('/shop.json');
    const response = await firstValueFrom(
      this.http.get<{ shop: any }>(url, { headers: this.getHeaders() })
    );

    return response.shop;
  }

  /**
   * Get store statistics
   */
  async getStoreStats(): Promise<{
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
  }> {
    this.ensureConnected();

    try {
      // Get products count
      const productsUrl = this.buildUrl('/products/count.json');
      const productsResponse = await firstValueFrom(
        this.http.get<{ count: number }>(productsUrl, {
          headers: this.getHeaders(),
        })
      );

      // Get orders
      const orders = await this.getOrders({ limit: 250, status: 'any' });
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce(
        (sum, order) => sum + parseFloat(order.total_price),
        0
      );

      return {
        totalProducts: productsResponse.count,
        totalOrders,
        totalRevenue,
      };
    } catch (error) {
      console.error('Failed to get store stats:', error);
      return {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
      };
    }
  }

  /**
   * Sync products to Firestore
   */
  async syncProducts(
    onProgress?: (current: number, total: number) => void
  ): Promise<ShopifyProduct[]> {
    this.ensureConnected();

    const allProducts: ShopifyProduct[] = [];
    let pageInfo: string | undefined;

    do {
      const result = await this.getProducts({
        limit: 250,
        page_info: pageInfo,
      });

      allProducts.push(...result.products);
      onProgress?.(allProducts.length, allProducts.length + 250);
      pageInfo = result.pageInfo;
    } while (pageInfo);

    return allProducts;
  }

  /**
   * Disconnect from Shopify
   */
  disconnect(): void {
    this.config = null;
    this.isConnected.set(false);
    this.connectionError.set(null);
  }

  // Private helper methods

  private ensureConnected(): void {
    if (!this.config) {
      throw new Error('Shopify not configured. Call connect() first.');
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    if (!this.config) {
      throw new Error('Shopify not configured');
    }

    let url = `https://${this.config.shopDomain}/admin/api/${this.config.apiVersion}${endpoint}`;

    // Add query parameters
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  private getHeaders(): HttpHeaders {
    if (!this.config) {
      throw new Error('Shopify not configured');
    }

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': this.config.accessToken,
    });
  }

  private extractPageInfo(linkHeader: string | null): string | undefined {
    if (!linkHeader) return undefined;

    const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&]+)[^>]*>; rel="next"/);
    return nextMatch ? nextMatch[1] : undefined;
  }
}
