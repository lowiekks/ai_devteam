import { Component } from '@angular/core';
import { Sidebar } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-dashboard',
  imports: [Sidebar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  stats = [
    { label: 'Total Users', value: '1,234', icon: '👥', change: '+12%' },
    { label: 'Products', value: '856', icon: '📦', change: '+8%' },
    { label: 'Revenue', value: '$45.2K', icon: '💰', change: '+23%' },
    { label: 'Active Stores', value: '423', icon: '🏪', change: '+15%' },
  ];
}
