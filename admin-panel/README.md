# Admin Panel - Angular Application

Enterprise admin panel built with Angular 20 for managing the Dropship Monitor platform.

## Overview

This is the administrative interface for managing:
- User accounts and permissions
- Product catalog and monitoring
- Analytics and reporting
- System configuration

## Technology Stack

- **Framework**: Angular 20.3
- **Language**: TypeScript 5.9
- **Styling**: SCSS
- **State Management**: RxJS 7.8
- **Build Tool**: Angular CLI with esbuild

## Development

### Prerequisites
- Node.js >= 18.0.0
- npm

### Install Dependencies
From the root of the monorepo:
```bash
npm install
```

### Start Development Server
```bash
npm run dev:admin
```

The admin panel will be available at `http://localhost:4200`

### Build for Production
```bash
npm run build:admin
```

Production build will be output to `admin-panel/dist/`

## Project Structure

```
admin-panel/
├── src/
│   ├── app/              # Application components
│   │   ├── app.ts        # Root component
│   │   ├── app.routes.ts # Route configuration
│   │   └── app.config.ts # App configuration
│   ├── assets/           # Static assets
│   ├── styles.scss       # Global styles
│   └── main.ts          # Application entry point
├── public/              # Public assets
├── angular.json         # Angular CLI configuration
└── tsconfig.json        # TypeScript configuration
```

## Available Scripts

- `npm start` - Start development server (port 4200)
- `npm run build` - Build for production
- `npm run watch` - Build in watch mode
- `npm test` - Run unit tests
- `ng generate component [name]` - Generate new component

## Code Scaffolding

Angular CLI includes powerful code scaffolding tools:

```bash
# Generate a new component
ng generate component components/user-list

# Generate a service
ng generate service services/auth

# Generate a module
ng generate module features/dashboard --routing
```

For a complete list of available schematics, run:
```bash
ng generate --help
```

## Environment Configuration

Create environment files for different deployment targets:

**src/environments/environment.ts** (Development)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_AUTH_DOMAIN',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID'
  }
};
```

## Integration with Dashboard

The admin panel works alongside the main dashboard (Next.js):
- **Dashboard** (port 3000): Customer-facing interface
- **Admin Panel** (port 4200): Administrative interface

Both applications can share:
- Firebase backend
- API endpoints
- Authentication state

## Deployment

### Standalone Deployment
The admin panel can be deployed separately:
1. Build: `npm run build:admin`
2. Deploy `dist/admin-panel/browser/` folder to any static hosting

### Vercel Deployment
To deploy on Vercel alongside the dashboard, create a separate Vercel project:
- Set Root Directory to `admin-panel`
- Framework: Other (or Angular if available)
- Build Command: `npm run build`
- Output Directory: `dist/admin-panel/browser`

## Firebase Integration

To connect with Firebase (same as dashboard):

1. Install Firebase (if not already in workspace):
```bash
npm install firebase --workspace=admin-panel
```

2. Initialize in `src/app/app.config.ts`

## Features to Implement

- [ ] Authentication with Firebase
- [ ] User management interface
- [ ] Product catalog management
- [ ] Analytics dashboard
- [ ] System settings
- [ ] Role-based access control (RBAC)
- [ ] Real-time notifications
- [ ] Data export functionality

## Architecture

The admin panel uses Angular 20 features:
- **Standalone Components** (default)
- **Signals** for reactive state management
- **Inject function** for dependency injection
- **Routing** with lazy loading
- **HttpClient** for API calls
- **RxJS** for async operations

## Code Quality

- TypeScript strict mode enabled
- ESLint ready
- Prettier configuration included
- Angular best practices enforced

## Performance Optimizations

Build optimizations enabled:
- Production builds use esbuild (faster builds)
- Tree-shaking for smaller bundles
- Lazy loading for routes
- Budget limits configured:
  - Initial bundle: < 1MB
  - Component styles: < 8KB

## Testing

### Unit Tests
```bash
npm test
```

Tests run with Jasmine and Karma in Chrome.

### E2E Tests
Angular CLI does not include e2e by default. Consider adding:
- Playwright
- Cypress
- Protractor

## Monorepo Context

This Angular app is part of a larger monorepo:
- `/dashboard` - Next.js customer dashboard
- `/functions` - Firebase Cloud Functions
- `/admin-panel` - Angular admin interface (this project)

All workspaces share the same `node_modules` at the root level.

## Additional Resources

- [Angular Documentation](https://angular.dev)
- [Angular CLI Reference](https://angular.dev/tools/cli)
- [RxJS Documentation](https://rxjs.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
