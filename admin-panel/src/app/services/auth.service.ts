import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
} from '@angular/fire/firestore';

export type UserRole = 'admin' | 'manager' | 'viewer';

export interface RolePermissions {
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canViewProducts: boolean;
  canEditProducts: boolean;
  canDeleteProducts: boolean;
  canViewAnalytics: boolean;
  canViewActivityLogs: boolean;
  canDeleteActivityLogs: boolean;
  canChangeSettings: boolean;
  canExportData: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private firestore = inject(Firestore);

  // Signals for reactive state
  currentUser = signal<User | null>(null);
  isAuthenticated = signal(false);
  isLoading = signal(true);
  currentUserRole = signal<UserRole>('viewer');
  permissions = signal<RolePermissions>(this.getPermissionsForRole('viewer'));

  constructor() {
    // Listen to auth state changes
    onAuthStateChanged(this.auth, async (user) => {
      this.currentUser.set(user);
      this.isAuthenticated.set(!!user);

      if (user) {
        // Fetch user role from Firestore
        await this.fetchUserRole(user.uid);
      } else {
        this.currentUserRole.set('viewer');
        this.permissions.set(this.getPermissionsForRole('viewer'));
      }

      this.isLoading.set(false);
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      this.currentUser.set(credential.user);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUser.set(null);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  getUserEmail(): string | null {
    return this.currentUser()?.email || null;
  }

  getUid(): string | null {
    return this.currentUser()?.uid || null;
  }

  // ==================== Role Management ====================

  private async fetchUserRole(uid: string): Promise<void> {
    try {
      const userDoc = doc(this.firestore, `users/${uid}`);
      const userSnap = await getDoc(userDoc);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const role = (userData['role'] as UserRole) || 'viewer';
        this.currentUserRole.set(role);
        this.permissions.set(this.getPermissionsForRole(role));
      } else {
        // Create user document with default viewer role
        await setDoc(userDoc, {
          email: this.currentUser()?.email,
          role: 'viewer',
          createdAt: new Date(),
        });
        this.currentUserRole.set('viewer');
        this.permissions.set(this.getPermissionsForRole('viewer'));
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      // Default to viewer on error
      this.currentUserRole.set('viewer');
      this.permissions.set(this.getPermissionsForRole('viewer'));
    }
  }

  private getPermissionsForRole(role: UserRole): RolePermissions {
    const rolePermissions: Record<UserRole, RolePermissions> = {
      admin: {
        canCreateUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        canViewProducts: true,
        canEditProducts: true,
        canDeleteProducts: true,
        canViewAnalytics: true,
        canViewActivityLogs: true,
        canDeleteActivityLogs: true,
        canChangeSettings: true,
        canExportData: true,
      },
      manager: {
        canCreateUsers: false,
        canEditUsers: true,
        canDeleteUsers: false,
        canViewProducts: true,
        canEditProducts: true,
        canDeleteProducts: false,
        canViewAnalytics: true,
        canViewActivityLogs: true,
        canDeleteActivityLogs: false,
        canChangeSettings: false,
        canExportData: true,
      },
      viewer: {
        canCreateUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canViewProducts: true,
        canEditProducts: false,
        canDeleteProducts: false,
        canViewAnalytics: true,
        canViewActivityLogs: false,
        canDeleteActivityLogs: false,
        canChangeSettings: false,
        canExportData: false,
      },
    };

    return rolePermissions[role];
  }

  hasPermission(permission: keyof RolePermissions): boolean {
    return this.permissions()[permission];
  }

  hasRole(role: UserRole): boolean {
    return this.currentUserRole() === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    return roles.includes(this.currentUserRole());
  }

  getRole(): UserRole {
    return this.currentUserRole();
  }
}
