import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  authService = inject(AuthService);

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: '📊', route: '/dashboard' },
    { label: 'Users', icon: '👥', route: '/users' },
    { label: 'Products', icon: '📦', route: '/products' },
    { label: 'Analytics', icon: '📈', route: '/analytics' },
    { label: 'Integrations', icon: '🔌', route: '/integrations' },
    { label: 'Activity Logs', icon: '📋', route: '/activity-logs' },
    { label: 'Settings', icon: '⚙️', route: '/settings' },
  ];

  async logout() {
    await this.authService.signOut();
  }
}
