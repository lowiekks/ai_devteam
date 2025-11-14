import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../components/sidebar/sidebar';
import {
  FirestoreService,
  ActivityLog,
} from '../../services/firestore.service';
import { where, orderBy, limit } from '@angular/fire/firestore';

@Component({
  selector: 'app-activity-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './activity-logs.html',
  styleUrl: './activity-logs.scss',
})
export class ActivityLogs implements OnInit {
  private firestoreService = inject(FirestoreService);

  // State
  logs = signal<ActivityLog[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Filters
  filterAction = signal<string>('all');
  filterEntityType = signal<string>('all');
  searchQuery = signal<string>('');
  selectedLogs = signal<Set<string>>(new Set());

  // Pagination
  itemsPerPage = signal(20);
  currentPage = signal(1);

  // Computed
  filteredLogs = computed(() => {
    let filtered = this.logs();

    // Filter by action
    if (this.filterAction() !== 'all') {
      filtered = filtered.filter((log) => log.action === this.filterAction());
    }

    // Filter by entity type
    if (this.filterEntityType() !== 'all') {
      filtered = filtered.filter(
        (log) => log.entityType === this.filterEntityType()
      );
    }

    // Search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (log) =>
          log.description.toLowerCase().includes(query) ||
          log.adminEmail.toLowerCase().includes(query) ||
          log.entityName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  paginatedLogs = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredLogs().slice(start, end);
  });

  totalPages = computed(() =>
    Math.ceil(this.filteredLogs().length / this.itemsPerPage())
  );

  actionStats = computed(() => {
    const logs = this.logs();
    return {
      create: logs.filter((l) => l.action === 'create').length,
      update: logs.filter((l) => l.action === 'update').length,
      delete: logs.filter((l) => l.action === 'delete').length,
      login: logs.filter((l) => l.action === 'login').length,
      export: logs.filter((l) => l.action === 'export').length,
      settings_change: logs.filter((l) => l.action === 'settings_change')
        .length,
    };
  });

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.loading.set(true);
    this.error.set(null);

    try {
      this.firestoreService.getActivityLogs().subscribe({
        next: (logs) => {
          this.logs.set(logs);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message || 'Failed to load activity logs');
          this.loading.set(false);
        },
      });
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load activity logs');
      this.loading.set(false);
    }
  }

  setFilterAction(action: string) {
    this.filterAction.set(action);
    this.currentPage.set(1);
  }

  setFilterEntityType(entityType: string) {
    this.filterEntityType.set(entityType);
    this.currentPage.set(1);
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  toggleLogSelection(logId: string) {
    const selected = new Set(this.selectedLogs());
    if (selected.has(logId)) {
      selected.delete(logId);
    } else {
      selected.add(logId);
    }
    this.selectedLogs.set(selected);
  }

  selectAllLogs() {
    const allIds = new Set(this.paginatedLogs().map((log) => log.id));
    this.selectedLogs.set(allIds);
  }

  deselectAllLogs() {
    this.selectedLogs.set(new Set());
  }

  async deleteSelected() {
    const selected = this.selectedLogs();
    if (selected.size === 0) return;

    if (
      !confirm(`Are you sure you want to delete ${selected.size} log(s)?`)
    ) {
      return;
    }

    this.loading.set(true);
    let successCount = 0;
    let errorCount = 0;

    for (const logId of selected) {
      try {
        await this.firestoreService.deleteActivityLog(logId);
        successCount++;
      } catch (err) {
        errorCount++;
        console.error(`Failed to delete log ${logId}:`, err);
      }
    }

    this.loading.set(false);
    this.selectedLogs.set(new Set());

    if (successCount > 0) {
      this.successMessage.set(
        `Successfully deleted ${successCount} log(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`
      );
      setTimeout(() => this.successMessage.set(null), 3000);
    } else if (errorCount > 0) {
      this.error.set(`Failed to delete ${errorCount} log(s)`);
      setTimeout(() => this.error.set(null), 3000);
    }
  }

  async clearOldLogs() {
    if (
      !confirm(
        'Are you sure you want to delete all logs older than 90 days? This action cannot be undone.'
      )
    ) {
      return;
    }

    this.loading.set(true);

    try {
      const deletedCount =
        await this.firestoreService.clearOldActivityLogs(90);
      this.loading.set(false);
      this.successMessage.set(
        `Successfully deleted ${deletedCount} old log(s)`
      );
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.loading.set(false);
      this.error.set(err.message || 'Failed to clear old logs');
      setTimeout(() => this.error.set(null), 3000);
    }
  }

  exportToCSV() {
    const logs = this.filteredLogs();
    if (logs.length === 0) {
      this.error.set('No logs to export');
      setTimeout(() => this.error.set(null), 3000);
      return;
    }

    // CSV headers
    const headers = [
      'Timestamp',
      'Action',
      'Entity Type',
      'Entity Name',
      'Admin Email',
      'Description',
      'IP Address',
    ];

    // CSV rows
    const rows = logs.map((log) => [
      this.formatTimestamp(log.timestamp),
      log.action,
      log.entityType,
      log.entityName || '',
      log.adminEmail,
      log.description,
      log.ipAddress || '',
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `activity_logs_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.successMessage.set(`Exported ${logs.length} activity log(s) to CSV`);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  formatTimestamp(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }

  getTimeAgo(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const now = new Date();
    const date = timestamp.toDate();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return this.formatTimestamp(timestamp);
  }

  getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      create: '➕',
      update: '✏️',
      delete: '🗑️',
      login: '🔑',
      export: '📥',
      settings_change: '⚙️',
    };
    return icons[action] || '📝';
  }

  getActionColor(action: string): string {
    const colors: Record<string, string> = {
      create: 'action-create',
      update: 'action-update',
      delete: 'action-delete',
      login: 'action-login',
      export: 'action-export',
      settings_change: 'action-settings',
    };
    return colors[action] || 'action-default';
  }

  goToPage(page: number) {
    this.currentPage.set(page);
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }
}
