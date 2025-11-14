import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { permissionGuard } from './guards/permission.guard';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Users } from './pages/users/users';
import { Products } from './pages/products/products';
import { Analytics } from './pages/analytics/analytics';
import { Settings } from './pages/settings/settings';
import { ActivityLogs } from './pages/activity-logs/activity-logs';
import { Integrations } from './pages/integrations/integrations';
import { Import } from './pages/import/import';
import { Review } from './pages/review/review';

// Auth guard function
const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

// Redirect to dashboard if already authenticated
const loginGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login,
    canActivate: [loginGuard]
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard]
  },
  {
    path: 'users',
    component: Users,
    canActivate: [authGuard]
  },
  {
    path: 'products',
    component: Products,
    canActivate: [authGuard, permissionGuard('canViewProducts')]
  },
  {
    path: 'analytics',
    component: Analytics,
    canActivate: [authGuard, permissionGuard('canViewAnalytics')]
  },
  {
    path: 'settings',
    component: Settings,
    canActivate: [authGuard, permissionGuard('canChangeSettings')]
  },
  {
    path: 'activity-logs',
    component: ActivityLogs,
    canActivate: [authGuard, permissionGuard('canViewActivityLogs')]
  },
  {
    path: 'integrations',
    component: Integrations,
    canActivate: [authGuard, permissionGuard('canChangeSettings')]
  },
  {
    path: 'import',
    component: Import,
    canActivate: [authGuard]
  },
  {
    path: 'review',
    component: Review,
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
