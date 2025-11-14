import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../components/sidebar/sidebar';
import { FirestoreService } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';
import { Functions, httpsCallable } from '@angular/fire/functions';

interface RawProduct {
  raw_product_id: string;
  user_id: string;
  source_platform: 'aliexpress';
  source_url: string;
  import_status: 'pending' | 'processing' | 'completed' | 'failed';
  raw_data: {
    product_id: string;
    title: string;
    description: string;
    category: string;
    images: string[];
    price: {
      min: number;
      max: number;
      currency: string;
    };
    rating: number;
    orders: number;
    shipping: {
      method: string;
      cost: number;
      time: string;
    };
  };
  processing: {
    import_started_at: any;
    import_completed_at?: any;
    error_message?: string;
    retry_count: number;
  };
  created_at: any;
  updated_at: any;
}

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './import.html',
  styleUrl: './import.scss',
})
export class Import implements OnInit {
  firestoreService = inject(FirestoreService);
  authService = inject(AuthService);
  functions = inject(Functions);

  // Import form state
  productUrl = signal('');
  importing = signal(false);
  importError = signal<string | null>(null);
  importSuccess = signal<string | null>(null);

  // Raw products list
  rawProducts = signal<RawProduct[]>([]);
  loading = signal(false);
  selectedProduct = signal<RawProduct | null>(null);

  // Stats
  stats = signal({
    totalImported: 0,
    pendingProcessing: 0,
    completed: 0,
    failed: 0,
  });

  ngOnInit() {
    this.loadRawProducts();
  }

  async loadRawProducts() {
    this.loading.set(true);
    this.importError.set(null);

    try {
      const getRawProducts = httpsCallable<any, { success: boolean; rawProducts: RawProduct[] }>(
        this.functions,
        'getRawProducts'
      );

      const result = await getRawProducts({});

      if (result.data.success) {
        this.rawProducts.set(result.data.rawProducts);
        this.updateStats(result.data.rawProducts);
      }
    } catch (error: any) {
      console.error('Error loading raw products:', error);
      this.importError.set('Failed to load imported products');
    } finally {
      this.loading.set(false);
    }
  }

  async importProduct() {
    const url = this.productUrl().trim();

    if (!url) {
      this.importError.set('Please enter a product URL');
      return;
    }

    // Validate AliExpress URL
    if (!url.includes('aliexpress.com')) {
      this.importError.set('Please enter a valid AliExpress product URL');
      return;
    }

    this.importing.set(true);
    this.importError.set(null);
    this.importSuccess.set(null);

    try {
      const importProductFn = httpsCallable<
        { sourceUrl: string },
        {
          success: boolean;
          message: string;
          rawProductId: string;
          status: string;
          data?: {
            title: string;
            images: string[];
            price: { min: number; max: number; currency: string };
          };
        }
      >(this.functions, 'importProduct');

      const result = await importProductFn({ sourceUrl: url });

      if (result.data.success) {
        this.importSuccess.set(result.data.message);
        this.productUrl.set('');

        // Reload products list
        await this.loadRawProducts();

        // Clear success message after 5 seconds
        setTimeout(() => this.importSuccess.set(null), 5000);
      }
    } catch (error: any) {
      console.error('Error importing product:', error);

      // Parse Firebase error message
      let errorMessage = 'Failed to import product';

      if (error.message) {
        if (error.message.includes('not configured')) {
          errorMessage = 'Please connect AliExpress API first in Integrations';
        } else if (error.message.includes('Invalid URL')) {
          errorMessage = 'Invalid AliExpress product URL';
        } else {
          errorMessage = error.message;
        }
      }

      this.importError.set(errorMessage);
    } finally {
      this.importing.set(false);
    }
  }

  async deleteProduct(productId: string) {
    if (!confirm('Are you sure you want to delete this imported product?')) {
      return;
    }

    try {
      const deleteRawProductFn = httpsCallable<
        { rawProductId: string },
        { success: boolean; message: string }
      >(this.functions, 'deleteRawProduct');

      const result = await deleteRawProductFn({ rawProductId: productId });

      if (result.data.success) {
        // Remove from local list
        this.rawProducts.set(this.rawProducts().filter((p) => p.raw_product_id !== productId));
        this.updateStats(this.rawProducts());
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      this.importError.set('Failed to delete product');
    }
  }

  viewDetails(product: RawProduct) {
    this.selectedProduct.set(product);
  }

  closeDetails() {
    this.selectedProduct.set(null);
  }

  private updateStats(products: RawProduct[]) {
    const stats = {
      totalImported: products.length,
      pendingProcessing: products.filter((p) => p.import_status === 'pending' || p.import_status === 'processing').length,
      completed: products.filter((p) => p.import_status === 'completed').length,
      failed: products.filter((p) => p.import_status === 'failed').length,
    };

    this.stats.set(stats);
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return 'Unknown';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return 'Unknown';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'pending':
      case 'processing':
        return 'status-processing';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  }
}
