import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService, RolePermissions } from '../services/auth.service';

/**
 * Permission guard factory
 * Creates a guard that checks if the current user has a specific permission
 */
export function permissionGuard(permission: keyof RolePermissions): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.hasPermission(permission)) {
      return true;
    }

    // Redirect to dashboard with error message
    console.warn(`Access denied: Missing permission "${permission}"`);
    return router.createUrlTree(['/dashboard'], {
      queryParams: { error: 'insufficient_permissions' },
    });
  };
}

/**
 * Role guard factory
 * Creates a guard that checks if the current user has one of the specified roles
 */
export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const userRole = authService.getRole();

    if (allowedRoles.includes(userRole)) {
      return true;
    }

    // Redirect to dashboard with error message
    console.warn(`Access denied: User role "${userRole}" not in allowed roles [${allowedRoles.join(', ')}]`);
    return router.createUrlTree(['/dashboard'], {
      queryParams: { error: 'insufficient_role' },
    });
  };
}
