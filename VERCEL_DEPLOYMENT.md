# Vercel Deployment Guide

This is a monorepo containing both the dashboard (Next.js) and functions (Firebase Functions).

## Important: Vercel Project Configuration

Since this is a monorepo, you **must** configure Vercel to deploy from the correct directory:

### Option 1: Vercel Project Settings (Recommended)

1. Go to your Vercel project settings
2. Navigate to **Settings** → **General**
3. Under **Build & Development Settings**, set:
   - **Root Directory**: `dashboard`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (or leave as default)
   - **Output Directory**: `.next` (or leave as default)
   - **Install Command**: `npm install` (or leave as default)

### Option 2: Deploy from Dashboard Directory

When deploying via CLI:
```bash
cd dashboard
vercel
```

## Environment Variables

Add these environment variables in Vercel project settings:

Required for Firebase:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Deployment Checklist

- [ ] Root Directory set to `dashboard` in Vercel settings
- [ ] All environment variables configured
- [ ] Latest changes pushed to GitHub
- [ ] Vercel connected to the repository

## Build Output

The build should complete successfully with:
- ✓ Next.js 14.2.33
- ✓ Optimized production build
- ✓ Static page generation
- ✓ Image optimization enabled

## Troubleshooting

### Build fails with "Cannot find module"
- Ensure Root Directory is set to `dashboard`
- Check that all dependencies are in `dashboard/package.json`

### Undici webpack error
- This has been fixed with the undici@5.28.4 override in root `package.json`
- Ensure the override is present

### Image optimization errors
- Images are configured to use Next.js Image component
- Allowed domains are configured in `next.config.js`

### Font loading errors during build
- This is expected in environments without network access
- Vercel will successfully load Google Fonts during deployment

## Package Information

- **Next.js**: 14.2.33 (security patches applied)
- **React**: 18.2.0
- **Firebase**: 10.7.1
- **Node**: >=18.0.0
