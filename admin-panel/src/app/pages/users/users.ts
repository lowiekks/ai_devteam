import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../components/sidebar/sidebar';
import { FirestoreService, User } from '../../services/firestore.service';
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

    // Search filter
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.displayName?.toLowerCase().includes(query)
      );
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
    this.isModalOpen.set(true);
  }

  editUser(user: User) {
    this.selectedUser.set({ ...user });
    this.isEditing.set(true);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedUser.set(null);
    this.isEditing.set(false);
  }

  async saveUser() {
    const user = this.selectedUser();
    if (!user) return;

    try {
      this.loading.set(true);
      await this.firestoreService.updateUser(user.id, {
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        shopifyUrl: user.shopifyUrl,
        woocommerceUrl: user.woocommerceUrl,
      });
      this.closeModal();
      this.loadUsers();
    } catch (error: any) {
      this.error.set(error.message || 'Failed to update user');
    } finally {
      this.loading.set(false);
    }
  }

  async deleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      this.loading.set(true);
      await this.firestoreService.deleteUser(userId);
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
}
