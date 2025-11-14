import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface WooCommerceConfig {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  version?: string; // Default: 'wc/v3'
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  status: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: string;
  stock_quantity: number | null;
  images: Array<{
    id: number;
    src: string;
    name: string;
    alt: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  date_created: string;
  date_modified: string;
}

export interface WooCommerceOrder {
  id: number;
  status: string;
  total: string;
  date_created: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    total: string;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class WooCommerceApiService {
  // State
  isConnected = signal(false);
  connectionError = signal<string | null>(null);
  loading = signal(false);

  private config: WooCommerceConfig | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Initialize WooCommerce connection
   */
  connect(config: WooCommerceConfig): void {
    this.config = {
      ...config,
      version: config.version || 'wc/v3',
      siteUrl: config.siteUrl.replace(/\/$/, ''), // Remove trailing slash
    };
    this.isConnected.set(false);
    this.connectionError.set(null);
  }

  /**
   * Test connection to WooCommerce store
   */
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      throw new Error('WooCommerce not configured. Call connect() first.');
    }

    this.loading.set(true);
    this.connectionError.set(null);

    try {
      // Test by fetching store settings
      const url = this.buildUrl('/settings/general');
      const response = await firstValueFrom(
        this.http.get(url, { headers: this.getHeaders() })
      );

      this.isConnected.set(true);
      this.connectionError.set(null);
      return true;
    } catch (error: any) {
      this.isConnected.set(false);
      this.connectionError.set(
        error.error?.message || error.message || 'Connection failed'
      );
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get all products from WooCommerce
   */
  async getProducts(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
  }): Promise<WooCommerceProduct[]> {
    this.ensureConnected();

    const url = this.buildUrl('/products', params);
    const products = await firstValueFrom(
      this.http.get<WooCommerceProduct[]>(url, { headers: this.getHeaders() })
    );

    return products;
  }

  /**
   * Get single product by ID
   */
  async getProduct(productId: number): Promise<WooCommerceProduct> {
    this.ensureConnected();

    const url = this.buildUrl(`/products/${productId}`);
    const product = await firstValueFrom(
      this.http.get<WooCommerceProduct>(url, { headers: this.getHeaders() })
    );

    return product;
  }

  /**
   * Create a new product
   */
  async createProduct(
    productData: Partial<WooCommerceProduct>
  ): Promise<WooCommerceProduct> {
    this.ensureConnected();

    const url = this.buildUrl('/products');
    const product = await firstValueFrom(
      this.http.post<WooCommerceProduct>(url, productData, {
        headers: this.getHeaders(),
      })
    );

    return product;
  }

  /**
   * Update existing product
   */
  async updateProduct(
    productId: number,
    productData: Partial<WooCommerceProduct>
  ): Promise<WooCommerceProduct> {
    this.ensureConnected();

    const url = this.buildUrl(`/products/${productId}`);
    const product = await firstValueFrom(
      this.http.put<WooCommerceProduct>(url, productData, {
        headers: this.getHeaders(),
      })
    );

    return product;
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: number, force: boolean = false): Promise<void> {
    this.ensureConnected();

    const url = this.buildUrl(`/products/${productId}`, { force });
    await firstValueFrom(this.http.delete(url, { headers: this.getHeaders() }));
  }

  /**
   * Get orders
   */
  async getOrders(params?: {
    page?: number;
    per_page?: number;
    status?: string;
  }): Promise<WooCommerceOrder[]> {
    this.ensureConnected();

    const url = this.buildUrl('/orders', params);
    const orders = await firstValueFrom(
      this.http.get<WooCommerceOrder[]>(url, { headers: this.getHeaders() })
    );

    return orders;
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
      const productsUrl = this.buildUrl('/products', { per_page: 1 });
      const productsResponse = await firstValueFrom(
        this.http.get(productsUrl, {
          headers: this.getHeaders(),
          observe: 'response',
        })
      );
      const totalProducts = parseInt(
        productsResponse.headers.get('X-WP-Total') || '0',
        10
      );

      // Get orders count and revenue
      const ordersUrl = this.buildUrl('/orders', {
        per_page: 100,
        status: 'completed',
      });
      const orders = await firstValueFrom(
        this.http.get<WooCommerceOrder[]>(ordersUrl, {
          headers: this.getHeaders(),
        })
      );

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce(
        (sum, order) => sum + parseFloat(order.total),
        0
      );

      return {
        totalProducts,
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
  ): Promise<WooCommerceProduct[]> {
    this.ensureConnected();

    const allProducts: WooCommerceProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const products = await this.getProducts({ page, per_page: 100 });

      if (products.length === 0) {
        hasMore = false;
      } else {
        allProducts.push(...products);
        onProgress?.(allProducts.length, allProducts.length + 100);
        page++;
      }
    }

    return allProducts;
  }

  /**
   * Disconnect from WooCommerce
   */
  disconnect(): void {
    this.config = null;
    this.isConnected.set(false);
    this.connectionError.set(null);
  }

  // Private helper methods

  private ensureConnected(): void {
    if (!this.config) {
      throw new Error('WooCommerce not configured. Call connect() first.');
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    if (!this.config) {
      throw new Error('WooCommerce not configured');
    }

    let url = `${this.config.siteUrl}/wp-json/${this.config.version}${endpoint}`;

    // Add query parameters
    const queryParams = new URLSearchParams();

    // Add authentication
    queryParams.append('consumer_key', this.config.consumerKey);
    queryParams.append('consumer_secret', this.config.consumerSecret);

    // Add additional params
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    return `${url}?${queryParams.toString()}`;
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }
}
