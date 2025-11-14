import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../../components/sidebar/sidebar';
import { FirestoreService, Analytics } from '../../services/firestore.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, Sidebar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  firestoreService = inject(FirestoreService);

  analytics = signal<Analytics>({
    totalUsers: 0,
    activeUsers: 0,
    totalProducts: 0,
    totalRevenue: 0,
    activeStores: 0,
  });

  loading = signal(true);

  stats = signal([
    { label: 'Total Users', value: '0', icon: '👥', change: '+12%' },
    { label: 'Products', value: '0', icon: '📦', change: '+8%' },
    { label: 'Revenue', value: '$0', icon: '💰', change: '+23%' },
    { label: 'Active Stores', value: '0', icon: '🏪', change: '+15%' },
  ]);

  async ngOnInit() {
    await this.loadAnalytics();
  }

  async loadAnalytics() {
    this.loading.set(true);

    try {
      const data = await this.firestoreService.getAnalytics();
      this.analytics.set(data);

      // Update stats with real data
      this.stats.set([
        {
          label: 'Total Users',
          value: data.totalUsers.toLocaleString(),
          icon: '👥',
          change: '+12%',
        },
        {
          label: 'Products',
          value: data.totalProducts.toLocaleString(),
          icon: '📦',
          change: '+8%',
        },
        {
          label: 'Revenue',
          value: this.formatCurrency(data.totalRevenue),
          icon: '💰',
          change: '+23%',
        },
        {
          label: 'Active Stores',
          value: data.activeStores.toLocaleString(),
          icon: '🏪',
          change: '+15%',
        },
      ]);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      this.loading.set(false);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
