import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../components/sidebar/sidebar';
import { FirestoreService } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';
import {
  WooCommerceApiService,
  WooCommerceConfig,
} from '../../services/woocommerce-api.service';
import {
  ShopifyApiService,
  ShopifyConfig,
} from '../../services/shopify-api.service';
import {
  AliExpressApiService,
  AliExpressConfig,
} from '../../services/aliexpress-api.service';

type Platform = 'woocommerce' | 'shopify' | 'aliexpress';

interface PlatformStatus {
  name: string;
  icon: string;
  connected: boolean;
  loading: boolean;
  error: string | null;
  lastSync?: Date;
}

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './integrations.html',
  styleUrl: './integrations.scss',
})
export class Integrations implements OnInit {
  firestoreService = inject(FirestoreService);
  authService = inject(AuthService);
  woocommerceService = inject(WooCommerceApiService);
  shopifyService = inject(ShopifyApiService);
  aliexpressService = inject(AliExpressApiService);

  // State
  selectedPlatform = signal<Platform | null>(null);
  successMessage = signal<string | null>(null);
  error = signal<string | null>(null);

  // Platform configurations
  woocommerceConfig = signal<WooCommerceConfig>({
    siteUrl: '',
    consumerKey: '',
    consumerSecret: '',
  });

  shopifyConfig = signal<ShopifyConfig>({
    shopDomain: '',
    accessToken: '',
  });

  aliexpressConfig = signal<AliExpressConfig>({
    appKey: '',
    appSecret: '',
    trackingId: '',
  });

  // Platform statuses
  platforms = signal<Record<Platform, PlatformStatus>>({
    woocommerce: {
      name: 'WooCommerce',
      icon: '🛒',
      connected: false,
      loading: false,
      error: null,
    },
    shopify: {
      name: 'Shopify',
      icon: '🛍️',
      connected: false,
      loading: false,
      error: null,
    },
    aliexpress: {
      name: 'AliExpress',
      icon: '📦',
      connected: false,
      loading: false,
      error: null,
    },
  });

  // Stats
  stats = signal({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  ngOnInit() {
    this.loadSavedConfigs();
  }

  loadSavedConfigs() {
    // Load saved configurations from localStorage
    const savedWoo = localStorage.getItem('woocommerce_config');
    if (savedWoo) {
      const config = JSON.parse(savedWoo);
      this.woocommerceConfig.set(config);
      this.connectWooCommerce(config, true);
    }

    const savedShopify = localStorage.getItem('shopify_config');
    if (savedShopify) {
      const config = JSON.parse(savedShopify);
      this.shopifyConfig.set(config);
      this.connectShopify(config, true);
    }

    const savedAliExpress = localStorage.getItem('aliexpress_config');
    if (savedAliExpress) {
      const config = JSON.parse(savedAliExpress);
      this.aliexpressConfig.set(config);
      this.connectAliExpress(config, true);
    }
  }

  selectPlatform(platform: Platform) {
    this.selectedPlatform.set(platform);
    this.error.set(null);
  }

  closePlatformModal() {
    this.selectedPlatform.set(null);
  }

  async connectWooCommerce(config?: WooCommerceConfig, silent: boolean = false) {
    const cfg = config || this.woocommerceConfig();

    this.updatePlatformStatus('woocommerce', { loading: true, error: null });

    try {
      this.woocommerceService.connect(cfg);
      const success = await this.woocommerceService.testConnection();

      if (success) {
        this.updatePlatformStatus('woocommerce', {
          connected: true,
          loading: false,
          error: null,
          lastSync: new Date(),
        });

        // Save config
        localStorage.setItem('woocommerce_config', JSON.stringify(cfg));

        // Get stats
        const stats = await this.woocommerceService.getStoreStats();
        this.updateStats(stats);

        // Log activity
        await this.firestoreService.logActivity(
          'settings_change',
          'system',
          'Connected to WooCommerce store',
          {
            adminEmail: this.authService.getUserEmail() || 'admin',
            metadata: { platform: 'woocommerce', siteUrl: cfg.siteUrl },
          }
        );

        if (!silent) {
          this.successMessage.set('WooCommerce connected successfully!');
          setTimeout(() => this.successMessage.set(null), 3000);
          this.closePlatformModal();
        }
      } else {
        throw new Error(this.woocommerceService.connectionError() || 'Connection failed');
      }
    } catch (error: any) {
      this.updatePlatformStatus('woocommerce', {
        connected: false,
        loading: false,
        error: error.message || 'Connection failed',
      });

      if (!silent) {
        this.error.set(error.message || 'Failed to connect to WooCommerce');
      }
    }
  }

  async connectShopify(config?: ShopifyConfig, silent: boolean = false) {
    const cfg = config || this.shopifyConfig();

    this.updatePlatformStatus('shopify', { loading: true, error: null });

    try {
      this.shopifyService.connect(cfg);
      const success = await this.shopifyService.testConnection();

      if (success) {
        this.updatePlatformStatus('shopify', {
          connected: true,
          loading: false,
          error: null,
          lastSync: new Date(),
        });

        // Save config
        localStorage.setItem('shopify_config', JSON.stringify(cfg));

        // Get stats
        const stats = await this.shopifyService.getStoreStats();
        this.updateStats(stats);

        // Log activity
        await this.firestoreService.logActivity(
          'settings_change',
          'system',
          'Connected to Shopify store',
          {
            adminEmail: this.authService.getUserEmail() || 'admin',
            metadata: { platform: 'shopify', shopDomain: cfg.shopDomain },
          }
        );

        if (!silent) {
          this.successMessage.set('Shopify connected successfully!');
          setTimeout(() => this.successMessage.set(null), 3000);
          this.closePlatformModal();
        }
      } else {
        throw new Error(this.shopifyService.connectionError() || 'Connection failed');
      }
    } catch (error: any) {
      this.updatePlatformStatus('shopify', {
        connected: false,
        loading: false,
        error: error.message || 'Connection failed',
      });

      if (!silent) {
        this.error.set(error.message || 'Failed to connect to Shopify');
      }
    }
  }

  async connectAliExpress(config?: AliExpressConfig, silent: boolean = false) {
    const cfg = config || this.aliexpressConfig();

    this.updatePlatformStatus('aliexpress', { loading: true, error: null });

    try {
      this.aliexpressService.connect(cfg);
      const success = await this.aliexpressService.testConnection();

      if (success) {
        this.updatePlatformStatus('aliexpress', {
          connected: true,
          loading: false,
          error: null,
          lastSync: new Date(),
        });

        // Save config
        localStorage.setItem('aliexpress_config', JSON.stringify(cfg));

        // Log activity
        await this.firestoreService.logActivity(
          'settings_change',
          'system',
          'Connected to AliExpress API',
          {
            adminEmail: this.authService.getUserEmail() || 'admin',
            metadata: { platform: 'aliexpress' },
          }
        );

        if (!silent) {
          this.successMessage.set('AliExpress connected successfully!');
          setTimeout(() => this.successMessage.set(null), 3000);
          this.closePlatformModal();
        }
      } else {
        throw new Error(this.aliexpressService.connectionError() || 'Connection failed');
      }
    } catch (error: any) {
      this.updatePlatformStatus('aliexpress', {
        connected: false,
        loading: false,
        error: error.message || 'Connection failed',
      });

      if (!silent) {
        this.error.set(error.message || 'Failed to connect to AliExpress');
      }
    }
  }

  disconnect(platform: Platform) {
    if (!confirm(`Are you sure you want to disconnect from ${this.platforms()[platform].name}?`)) {
      return;
    }

    switch (platform) {
      case 'woocommerce':
        this.woocommerceService.disconnect();
        localStorage.removeItem('woocommerce_config');
        break;
      case 'shopify':
        this.shopifyService.disconnect();
        localStorage.removeItem('shopify_config');
        break;
      case 'aliexpress':
        this.aliexpressService.disconnect();
        localStorage.removeItem('aliexpress_config');
        break;
    }

    this.updatePlatformStatus(platform, {
      connected: false,
      loading: false,
      error: null,
    });

    // Log activity
    this.firestoreService.logActivity(
      'settings_change',
      'system',
      `Disconnected from ${this.platforms()[platform].name}`,
      {
        adminEmail: this.authService.getUserEmail() || 'admin',
        metadata: { platform },
      }
    );

    this.successMessage.set(`${this.platforms()[platform].name} disconnected`);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  private updatePlatformStatus(platform: Platform, updates: Partial<PlatformStatus>) {
    const current = this.platforms();
    this.platforms.set({
      ...current,
      [platform]: {
        ...current[platform],
        ...updates,
      },
    });
  }

  private updateStats(stats: { totalProducts: number; totalOrders: number; totalRevenue: number }) {
    const current = this.stats();
    this.stats.set({
      totalProducts: current.totalProducts + stats.totalProducts,
      totalOrders: current.totalOrders + stats.totalOrders,
      totalRevenue: current.totalRevenue + stats.totalRevenue,
    });
  }

  formatLastSync(date?: Date): string {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  // Helper to get platform keys with proper typing
  get platformKeys(): Platform[] {
    return ['woocommerce', 'shopify', 'aliexpress'];
  }
}
