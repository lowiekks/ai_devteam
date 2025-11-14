import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../components/sidebar/sidebar';

interface SettingsData {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  email: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
    smtpPassword: string;
  };
  notifications: {
    enabled: boolean;
    newUserSignup: boolean;
    productPriceChange: boolean;
    errorAlerts: boolean;
  };
  general: {
    siteName: string;
    adminEmail: string;
    maintenanceMode: boolean;
    debug: boolean;
  };
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  activeTab = signal<string>('general');
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  loading = signal(false);

  settings = signal<SettingsData>({
    firebase: {
      apiKey: 'AIzaSyDfNfZCgHcpPAAohFIy6-bmQYY0dY7kzfo',
      authDomain: 'yaico-i-38970353-4df67.firebaseapp.com',
      projectId: 'yaico-i-38970353-4df67',
      storageBucket: 'yaico-i-38970353-4df67.firebasestorage.app',
      messagingSenderId: '1005455001415',
      appId: '1:1005455001415:web:127b0f0346994e79eeae62',
    },
    email: {
      enabled: false,
      smtpHost: '',
      smtpPort: '587',
      smtpUser: '',
      smtpPassword: '',
    },
    notifications: {
      enabled: true,
      newUserSignup: true,
      productPriceChange: true,
      errorAlerts: true,
    },
    general: {
      siteName: 'Dropship Monitor Admin',
      adminEmail: 'admin@dropshipmonitor.com',
      maintenanceMode: false,
      debug: false,
    },
  });

  setActiveTab(tab: string) {
    this.activeTab.set(tab);
  }

  async saveSettings() {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      // In a real app, this would save to Firestore or backend API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.successMessage.set('Settings saved successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to save settings');
    } finally {
      this.loading.set(false);
    }
  }

  async resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to default?')) {
      return;
    }

    this.loading.set(true);
    try {
      // Reset to defaults
      this.settings.set({
        firebase: {
          apiKey: '',
          authDomain: '',
          projectId: '',
          storageBucket: '',
          messagingSenderId: '',
          appId: '',
        },
        email: {
          enabled: false,
          smtpHost: '',
          smtpPort: '587',
          smtpUser: '',
          smtpPassword: '',
        },
        notifications: {
          enabled: true,
          newUserSignup: true,
          productPriceChange: true,
          errorAlerts: true,
        },
        general: {
          siteName: 'Dropship Monitor Admin',
          adminEmail: 'admin@dropshipmonitor.com',
          maintenanceMode: false,
          debug: false,
        },
      });

      this.successMessage.set('Settings reset to defaults');
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to reset settings');
    } finally {
      this.loading.set(false);
    }
  }
}
