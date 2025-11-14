import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../components/sidebar/sidebar';
import { FirestoreService, User } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';
import { SearchService } from '../../services/search.service';
import { EmailNotificationService } from '../../services/email-notification.service';
import { orderBy, limit, where } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit, OnDestroy {
  firestoreService = inject(FirestoreService);
  authService = inject(AuthService);
  searchService = inject(SearchService);
  emailService = inject(EmailNotificationService);

  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  searchQuery = signal('');
  statusFilter = signal<string>('all');
  roleFilter = signal<string>('all');

  selectedUser = signal<User | null>(null);
  isModalOpen = signal(false);
  isEditing = signal(false);
  isCreating = signal(false);

  // Bulk operations
  selectedUserIds = signal<Set<string>>(new Set());
  selectAll = signal(false);

  // Success message
  successMessage = signal<string | null>(null);

  private usersSubscription?: Subscription;

  ngOnInit() {
    this.loadUsers();
  }

  ngOnDestroy() {
    this.usersSubscription?.unsubscribe();
  }

  loadUsers() {
    this.loading.set(true);
    this.error.set(null);

    try {
      this.usersSubscription = this.firestoreService
        .getUsers([orderBy('createdAt', 'desc'), limit(100)])
        .subscribe({
          next: (users) => {
            this.users.set(users);
            this.applyFilters();
            this.loading.set(false);
          },
          error: (error) => {
            this.error.set(error.message || 'Failed to load users');
            this.loading.set(false);
          },
        });
    } catch (error: any) {
      this.error.set(error.message || 'Failed to load users');
      this.loading.set(false);
    }
  }

  applyFilters() {
    let filtered = this.users();

    // Advanced search filter using SearchService
    if (this.searchQuery()) {
      filtered = this.searchService.fuzzySearch(
        filtered,
        this.searchQuery(),
        ['email', 'displayName', 'role', 'shopifyUrl', 'woocommerceUrl'] as (keyof User)[]
      );

      // Track search in history
      if (this.searchQuery().length >= 3) {
        this.searchService.addToHistory(
          this.searchQuery(),
          filtered.length,
          'users'
        );
      }
    }

    // Status filter
    if (this.statusFilter() !== 'all') {
      filtered = filtered.filter((user) => user.status === this.statusFilter());
    }

    // Role filter
    if (this.roleFilter() !== 'all') {
      filtered = filtered.filter((user) => user.role === this.roleFilter());
    }

    this.filteredUsers.set(filtered);
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

  onRoleFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.roleFilter.set(select.value);
    this.applyFilters();
  }

  viewUser(user: User) {
    this.selectedUser.set(user);
    this.isEditing.set(false);
    this.isCreating.set(false);
    this.isModalOpen.set(true);
  }

  editUser(user: User) {
    this.selectedUser.set({ ...user });
    this.isEditing.set(true);
    this.isCreating.set(false);
    this.isModalOpen.set(true);
  }

  openCreateModal() {
    this.selectedUser.set({
      id: '',
      email: '',
      displayName: '',
      role: 'user',
      status: 'active',
      shopifyUrl: '',
      woocommerceUrl: '',
      createdAt: null as any,
    });
    this.isCreating.set(true);
    this.isEditing.set(false);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedUser.set(null);
    this.isEditing.set(false);
    this.isCreating.set(false);
  }

  async saveUser() {
    const user = this.selectedUser();
    if (!user) return;

    // Validation
    if (!user.email || !user.email.includes('@')) {
      this.error.set('Please enter a valid email address');
      return;
    }

    try {
      this.loading.set(true);
      this.error.set(null);

      if (this.isCreating()) {
        // Create new user
        const userId = await this.firestoreService.createUser({
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          status: user.status,
          shopifyUrl: user.shopifyUrl,
          woocommerceUrl: user.woocommerceUrl,
        });

        // Log activity
        await this.firestoreService.logActivity(
          'create',
          'user',
          `Created user: ${user.email}`,
          {
            entityId: userId,
            entityName: user.displayName || user.email,
            adminEmail: this.authService.getUserEmail() || 'admin',
            metadata: { role: user.role, status: user.status },
          }
        );

        // Send welcome email
        try {
          await this.emailService.sendUserSignupNotification(
            user.email,
            user.displayName || 'User'
          );
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
        }

        this.successMessage.set('User created successfully!');
      } else {
        // Get original user for comparison
        const originalUser = this.users().find((u) => u.id === user.id);

        // Update existing user
        await this.firestoreService.updateUser(user.id, {
          displayName: user.displayName,
          role: user.role,
          status: user.status,
          shopifyUrl: user.shopifyUrl,
          woocommerceUrl: user.woocommerceUrl,
        });

        // Log activity
        await this.firestoreService.logActivity(
          'update',
          'user',
          `Updated user: ${user.email}`,
          {
            entityId: user.id,
            entityName: user.displayName || user.email,
            adminEmail: this.authService.getUserEmail() || 'admin',
            metadata: { changes: 'User profile updated' },
          }
        );

        // Send status change email if status changed
        if (originalUser && originalUser.status !== user.status) {
          try {
            await this.emailService.sendUserStatusChangeNotification(
              user.email,
              user.displayName || 'User',
              user.status
            );
          } catch (emailError) {
            console.error('Failed to send status change email:', emailError);
          }
        }

        this.successMessage.set('User updated successfully!');
      }

      this.closeModal();
      this.loadUsers();

      // Clear success message after 3 seconds
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to save user');
    } finally {
      this.loading.set(false);
    }
  }

  async deleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    const user = this.users().find((u) => u.id === userId);

    try {
      this.loading.set(true);
      await this.firestoreService.deleteUser(userId);

      // Log activity
      await this.firestoreService.logActivity(
        'delete',
        'user',
        `Deleted user: ${user?.email || 'Unknown'}`,
        {
          entityId: userId,
          entityName: user?.displayName || user?.email || 'Unknown',
          adminEmail: this.authService.getUserEmail() || 'admin',
        }
      );

      this.successMessage.set('User deleted successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
      this.loadUsers();
    } catch (error: any) {
      this.error.set(error.message || 'Failed to delete user');
    } finally {
      this.loading.set(false);
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'badge-success';
      case 'inactive':
        return 'badge-warning';
      case 'suspended':
        return 'badge-danger';
      default:
        return 'badge-default';
    }
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'badge-admin';
      case 'user':
        return 'badge-user';
      default:
        return 'badge-default';
    }
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

  // Bulk Operations
  toggleUserSelection(userId: string) {
    const selected = new Set(this.selectedUserIds());
    if (selected.has(userId)) {
      selected.delete(userId);
    } else {
      selected.add(userId);
    }
    this.selectedUserIds.set(selected);
    this.selectAll.set(selected.size === this.filteredUsers().length);
  }

  toggleSelectAll() {
    if (this.selectAll()) {
      this.selectedUserIds.set(new Set());
      this.selectAll.set(false);
    } else {
      const allIds = new Set(this.filteredUsers().map((u) => u.id));
      this.selectedUserIds.set(allIds);
      this.selectAll.set(true);
    }
  }

  async bulkDelete() {
    const selected = this.selectedUserIds();
    if (selected.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selected.size} user(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      this.loading.set(true);
      const deletePromises = Array.from(selected).map((id) =>
        this.firestoreService.deleteUser(id)
      );
      await Promise.all(deletePromises);

      // Log bulk delete activity
      await this.firestoreService.logActivity(
        'delete',
        'user',
        `Bulk deleted ${selected.size} users`,
        {
          adminEmail: this.authService.getUserEmail() || 'admin',
          metadata: { count: selected.size },
        }
      );

      this.selectedUserIds.set(new Set());
      this.selectAll.set(false);
      this.successMessage.set(`Successfully deleted ${selected.size} user(s)`);
      setTimeout(() => this.successMessage.set(null), 3000);
      this.loadUsers();
    } catch (error: any) {
      this.error.set(error.message || 'Failed to delete users');
    } finally {
      this.loading.set(false);
    }
  }

  async bulkUpdateStatus(status: 'active' | 'inactive' | 'suspended') {
    const selected = this.selectedUserIds();
    if (selected.size === 0) return;

    try {
      this.loading.set(true);
      const updatePromises = Array.from(selected).map((id) =>
        this.firestoreService.updateUser(id, { status })
      );
      await Promise.all(updatePromises);

      // Log bulk update activity
      await this.firestoreService.logActivity(
        'update',
        'user',
        `Bulk updated ${selected.size} users to ${status} status`,
        {
          adminEmail: this.authService.getUserEmail() || 'admin',
          metadata: { count: selected.size, newStatus: status },
        }
      );

      this.selectedUserIds.set(new Set());
      this.selectAll.set(false);
      this.successMessage.set(
        `Successfully updated ${selected.size} user(s) to ${status}`
      );
      setTimeout(() => this.successMessage.set(null), 3000);
      this.loadUsers();
    } catch (error: any) {
      this.error.set(error.message || 'Failed to update users');
    } finally {
      this.loading.set(false);
    }
  }

  // Export Functionality
  exportToCSV() {
    const users = this.filteredUsers();
    if (users.length === 0) {
      this.error.set('No users to export');
      setTimeout(() => this.error.set(null), 3000);
      return;
    }

    // CSV headers
    const headers = [
      'Email',
      'Display Name',
      'Role',
      'Status',
      'Shopify URL',
      'WooCommerce URL',
      'Created At',
      'Last Login',
    ];

    // CSV rows
    const rows = users.map((user) => [
      user.email,
      user.displayName || '',
      user.role,
      user.status,
      user.shopifyUrl || '',
      user.woocommerceUrl || '',
      this.formatDate(user.createdAt),
      user.lastLoginAt ? this.formatDate(user.lastLoginAt) : 'Never',
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
      `users_export_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Log export activity
    this.firestoreService.logActivity(
      'export',
      'user',
      `Exported ${users.length} users to CSV`,
      {
        adminEmail: this.authService.getUserEmail() || 'admin',
        metadata: { count: users.length, format: 'CSV' },
      }
    );

    this.successMessage.set(`Exported ${users.length} users to CSV`);
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}
