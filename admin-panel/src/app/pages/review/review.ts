import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../components/sidebar/sidebar';
import { FirestoreService } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';
import { Functions, httpsCallable } from '@angular/fire/functions';

interface EnhancedProduct {
  enhanced_product_id: string;
  raw_product_id: string;
  user_id: string;
  status: 'PENDING' | 'ENHANCING' | 'READY' | 'PUBLISHED' | 'FAILED';
  original: {
    title: string;
    description: string;
    images: string[];
    price: { min: number; max: number; currency: string };
    source_url: string;
  };
  enhanced: {
    title: string;
    short_description: string;
    long_description: string;
    features: string[];
    images: string[];
    tags: string[];
    category: string;
  };
  ai_processing: {
    text_enhanced_at?: any;
    images_enhanced_at?: any;
    text_model?: string;
    image_model?: string;
    processing_time_ms?: number;
    error_message?: string;
  };
  pricing: {
    suggested_price: number;
    cost_price: number;
    profit_margin: number;
    compare_at_price?: number;
  };
  created_at: any;
  updated_at: any;
}

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './review.html',
  styleUrl: './review.scss',
})
export class Review implements OnInit {
  firestoreService = inject(FirestoreService);
  authService = inject(AuthService);
  functions = inject(Functions);

  // State
  enhancedProducts = signal<EnhancedProduct[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Selected product for review
  selectedProduct = signal<EnhancedProduct | null>(null);
  viewMode = signal<'original' | 'enhanced' | 'comparison'>('enhanced');

  // Editing state
  isEditing = signal(false);
  editedProduct = signal<any>(null);

  // Stats
  stats = signal({
    total: 0,
    ready: 0,
    enhancing: 0,
    published: 0,
    failed: 0,
  });

  ngOnInit() {
    this.loadEnhancedProducts();
  }

  async loadEnhancedProducts() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const getEnhancedProductsFn = httpsCallable<
        any,
        { success: boolean; enhancedProducts: EnhancedProduct[] }
      >(this.functions, 'getEnhancedProducts');

      const result = await getEnhancedProductsFn({});

      if (result.data.success) {
        this.enhancedProducts.set(result.data.enhancedProducts);
        this.updateStats(result.data.enhancedProducts);
      }
    } catch (error: any) {
      console.error('Error loading enhanced products:', error);
      this.error.set('Failed to load enhanced products');
    } finally {
      this.loading.set(false);
    }
  }

  viewProduct(product: EnhancedProduct) {
    this.selectedProduct.set(product);
    this.viewMode.set('enhanced');
    this.isEditing.set(false);
  }

  closeReview() {
    this.selectedProduct.set(null);
    this.isEditing.set(false);
    this.editedProduct.set(null);
  }

  startEditing() {
    const product = this.selectedProduct();
    if (product) {
      this.editedProduct.set(JSON.parse(JSON.stringify(product.enhanced)));
      this.isEditing.set(true);
    }
  }

  cancelEditing() {
    this.isEditing.set(false);
    this.editedProduct.set(null);
  }

  async saveEdits() {
    const product = this.selectedProduct();
    const edited = this.editedProduct();

    if (!product || !edited) return;

    try {
      const updateFn = httpsCallable<any, { success: boolean; message: string }>(
        this.functions,
        'updateEnhancedProduct'
      );

      const result = await updateFn({
        enhancedProductId: product.enhanced_product_id,
        updates: {
          enhanced: edited,
        },
      });

      if (result.data.success) {
        this.successMessage.set('Product updated successfully!');
        setTimeout(() => this.successMessage.set(null), 3000);
        this.isEditing.set(false);
        this.editedProduct.set(null);
        await this.loadEnhancedProducts();
      }
    } catch (error: any) {
      this.error.set('Failed to update product');
    }
  }

  async deleteProduct(productId: string) {
    if (!confirm('Are you sure you want to delete this enhanced product?')) {
      return;
    }

    try {
      const deleteFn = httpsCallable<any, { success: boolean; message: string }>(
        this.functions,
        'deleteEnhancedProduct'
      );

      const result = await deleteFn({ enhancedProductId: productId });

      if (result.data.success) {
        this.enhancedProducts.set(
          this.enhancedProducts().filter((p) => p.enhanced_product_id !== productId)
        );
        this.updateStats(this.enhancedProducts());
        this.closeReview();
      }
    } catch (error: any) {
      this.error.set('Failed to delete product');
    }
  }

  private updateStats(products: EnhancedProduct[]) {
    const stats = {
      total: products.length,
      ready: products.filter((p) => p.status === 'READY').length,
      enhancing: products.filter((p) => p.status === 'ENHANCING').length,
      published: products.filter((p) => p.status === 'PUBLISHED').length,
      failed: products.filter((p) => p.status === 'FAILED').length,
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'READY':
        return 'status-ready';
      case 'ENHANCING':
        return 'status-enhancing';
      case 'PUBLISHED':
        return 'status-published';
      case 'FAILED':
        return 'status-failed';
      default:
        return '';
    }
  }

  getStatusLabel(status: string): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }
}
