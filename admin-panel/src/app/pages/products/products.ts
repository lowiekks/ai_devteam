import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../components/sidebar/sidebar';
import { FirestoreService, Product } from '../../services/firestore.service';
import { orderBy, limit } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products implements OnInit, OnDestroy {
  firestoreService = inject(FirestoreService);

  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  searchQuery = signal('');
  statusFilter = signal<string>('all');
  platformFilter = signal<string>('all');

  selectedProduct = signal<Product | null>(null);
  isModalOpen = signal(false);

  // Success message
  successMessage = signal<string | null>(null);

  private productsSubscription?: Subscription;

  ngOnInit() {
    this.loadProducts();
  }

  ngOnDestroy() {
    this.productsSubscription?.unsubscribe();
  }

  loadProducts() {
    this.loading.set(true);
    this.error.set(null);

    try {
      this.productsSubscription = this.firestoreService
        .getProducts([orderBy('created_at', 'desc'), limit(100)])
        .subscribe({
          next: (products) => {
            this.products.set(products);
            this.applyFilters();
            this.loading.set(false);
          },
          error: (error) => {
            this.error.set(error.message || 'Failed to load products');
            this.loading.set(false);
          },
        });
    } catch (error: any) {
      this.error.set(error.message || 'Failed to load products');
      this.loading.set(false);
    }
  }

  applyFilters() {
    let filtered = this.products();

    // Search filter
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter((product) =>
        product.public_data.title.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (this.statusFilter() !== 'all') {
      filtered = filtered.filter(
        (product) => product.content_status === this.statusFilter()
      );
    }

    // Platform filter
    if (this.platformFilter() !== 'all') {
      filtered = filtered.filter(
        (product) => product.monitored_supplier.platform === this.platformFilter()
      );
    }

    this.filteredProducts.set(filtered);
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.applyFilters();
  }

  onStatusFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.statusFilter.set(select.value);
    this.applyFilters();
  }

  onPlatformFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.platformFilter.set(select.value);
    this.applyFilters();
  }

  viewProduct(product: Product) {
    this.selectedProduct.set(product);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedProduct.set(null);
  }

  async deleteProduct(productId: string) {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      this.loading.set(true);
      await this.firestoreService.deleteProduct(productId);
      this.loadProducts();
    } catch (error: any) {
      this.error.set(error.message || 'Failed to delete product');
    } finally {
      this.loading.set(false);
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'published':
        return 'badge-success';
      case 'draft':
        return 'badge-warning';
      case 'pending':
        return 'badge-info';
      case 'error':
        return 'badge-danger';
      default:
        return 'badge-default';
    }
  }

  getPlatformIcon(platform: string): string {
    switch (platform.toLowerCase()) {
      case 'aliexpress':
        return '🛒';
      case 'shopify':
        return '🛍️';
      case 'woocommerce':
        return '🏪';
      case 'amazon':
        return '📦';
      default:
        return '🌐';
    }
  }

  getPriceChange(product: Product): number | null {
    const current = product.monitored_supplier.current_price;
    const previous = product.monitored_supplier.previous_price;

    if (!previous || previous === 0) return null;

    return ((current - previous) / previous) * 100;
  }

  formatPrice(price: number | undefined): string {
    if (price === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  }

  abs(value: number): number {
    return Math.abs(value);
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength
      ? text.substring(0, maxLength) + '...'
      : text;
  }

  // Export Functionality
  exportToCSV() {
    const products = this.filteredProducts();
    if (products.length === 0) {
      this.error.set('No products to export');
      setTimeout(() => this.error.set(null), 3000);
      return;
    }

    // CSV headers
    const headers = [
      'Title',
      'Description',
      'Status',
      'Platform',
      'Current Price',
      'Previous Price',
      'Price Change %',
      'Supplier URL',
      'Created At',
      'Updated At',
    ];

    // CSV rows
    const rows = products.map((product) => [
      product.public_data.title,
      product.public_data.short_description || '',
      product.content_status,
      product.monitored_supplier.platform,
      product.monitored_supplier.current_price.toString(),
      product.monitored_supplier.previous_price?.toString() || '',
      this.getPriceChange(product)?.toFixed(2) || '',
      product.monitored_supplier.url,
      this.formatDate(product.created_at),
      product.updated_at ? this.formatDate(product.updated_at) : '',
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `products_export_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.successMessage.set(`Exported ${products.length} products to CSV`);
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}
