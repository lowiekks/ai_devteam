# Deployment Guide

This guide covers deploying the Enterprise Dropshipping Monitor to Firebase.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Deployment Workflows](#deployment-workflows)
- [Environment Management](#environment-management)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring](#monitoring)

## Prerequisites

Before deploying, ensure you have:

1. ✅ Completed the [Firebase Setup](./FIREBASE_SETUP.md)
2. ✅ Firebase CLI installed: `npm install -g firebase-tools`
3. ✅ Authenticated with Firebase: `firebase login`
4. ✅ All dependencies installed in `/dashboard` and `/functions`
5. ✅ Environment variables configured

## Initial Setup

### 1. Configure Firebase Project

```bash
# View current project
firebase projects:list

# Use your project
firebase use <project-id>

# Or set it as default in .firebaserc
```

### 2. Verify Configuration

```bash
# Test connection
firebase projects:list

# Check current configuration
firebase functions:config:get
```

## Deployment Workflows

### Full Deployment

Deploy everything (rules, indexes, functions):

```bash
# From project root
npm run deploy:all

# Or manually
firebase deploy
```

### Deploy Functions Only

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Deploy Specific Function

```bash
# Deploy only one function
firebase deploy --only functions:scheduleScrapes

# Deploy multiple specific functions
firebase deploy --only functions:scheduleScrapes,functions:executeScrape
```

### Deploy Security Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules

# Deploy both
firebase deploy --only firestore:rules,storage:rules
```

### Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

## Environment Management

### Development vs Production

#### Development (Emulators)

```bash
# Start all emulators
firebase emulators:start

# Start with data import
firebase emulators:start --import=./emulator-data

# Start and export data on exit
firebase emulators:start --export-on-exit=./emulator-data
```

#### Staging Environment

Set up a staging project:

```bash
# Add staging project to .firebaserc
firebase use --add

# Select staging project
firebase use staging

# Deploy to staging
firebase deploy
```

Example `.firebaserc` with multiple environments:

```json
{
  "projects": {
    "default": "dropship-monitor-prod",
    "staging": "dropship-monitor-staging",
    "dev": "dropship-monitor-dev"
  }
}
```

#### Production

```bash
# Switch to production
firebase use production

# Deploy with confirmation
firebase deploy --only functions

# Non-interactive deployment (for CI/CD)
firebase deploy --non-interactive --token $FIREBASE_TOKEN
```

### Environment Variables for Functions

#### Local Development

Create `functions/.runtimeconfig.json`:

```json
{
  "openai": {
    "api_key": "sk-..."
  },
  "replicate": {
    "api_key": "r8_..."
  }
}
```

**⚠️ Never commit this file!** Add to `.gitignore`.

#### Production

Set environment variables using Firebase CLI:

```bash
# Set individual config
firebase functions:config:set openai.api_key="sk-..."

# Set multiple configs
firebase functions:config:set \
  openai.api_key="sk-..." \
  replicate.api_key="r8_..." \
  shopify.api_key="..." \
  shopify.api_secret="..."

# View current config
firebase functions:config:get

# Export config for local emulator
firebase functions:config:get > functions/.runtimeconfig.json
```

#### Update Environment Variables

```bash
# Update a value
firebase functions:config:set openai.api_key="sk-new-key"

# Remove a value
firebase functions:config:unset openai

# After changes, redeploy functions
firebase deploy --only functions
```

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests pass locally
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Security rules reviewed
- [ ] Database indexes created
- [ ] Backup recent data
- [ ] Notify team of deployment
- [ ] Check Firebase quota limits

## Deployment Commands

### Quick Reference

```bash
# Full deployment
firebase deploy

# Functions only
firebase deploy --only functions

# Specific function
firebase deploy --only functions:functionName

# Rules only
firebase deploy --only firestore:rules,storage:rules

# Indexes only
firebase deploy --only firestore:indexes

# Multiple targets
firebase deploy --only functions,firestore:rules

# Force deployment (skip warnings)
firebase deploy --force

# Dry run (see what would be deployed)
firebase deploy --dry-run
```

## Rollback Procedures

### Rollback Functions

Firebase keeps previous versions of functions:

```bash
# List function versions
gcloud functions list --project=your-project-id

# Rollback to previous version
firebase functions:delete functionName
# Then redeploy previous code
git checkout <previous-commit>
firebase deploy --only functions:functionName
```

### Rollback Rules

```bash
# Checkout previous version
git checkout <previous-commit> firestore.rules storage.rules

# Deploy old rules
firebase deploy --only firestore:rules,storage:rules

# Or edit in Firebase Console and restore from history
```

### Emergency Rollback

```bash
# 1. Switch to previous commit
git log --oneline -10
git checkout <stable-commit>

# 2. Quick deploy
firebase deploy --only functions --force

# 3. Verify deployment
firebase functions:log --limit 50

# 4. Return to main branch
git checkout main
```

## Monitoring

### View Logs

```bash
# View recent logs
firebase functions:log

# Limit output
firebase functions:log --limit 50

# Specific function
firebase functions:log --only functionName

# Follow logs in real-time (requires additional setup)
gcloud functions logs read --project=your-project-id --limit=50
```

### Monitor Performance

1. **Firebase Console**
   - Go to Functions → Dashboard
   - Monitor invocations, execution time, errors
   - Set up alerts for failures

2. **Cloud Console**
   - Visit [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to Logging → Logs Explorer
   - Create log-based metrics

### Set Up Alerts

```bash
# Install Firebase CLI if needed
npm install -g firebase-tools

# Set up budget alerts in Firebase Console:
# Project Settings → Usage and Billing → Budget Alerts
```

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Dependencies
        run: |
          cd functions
          npm ci

      - name: Build Functions
        run: |
          cd functions
          npm run build

      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### Get CI Token

```bash
# Generate token for CI/CD
firebase login:ci

# Use the token in your CI environment
# Add as secret: FIREBASE_TOKEN
```

## Post-Deployment

### Verify Deployment

```bash
# Check function status
firebase functions:list

# Test function endpoint
curl https://us-central1-your-project.cloudfunctions.net/functionName

# Check logs for errors
firebase functions:log --limit 20
```

### Smoke Tests

After deployment, verify:

1. ✅ Dashboard loads correctly
2. ✅ Authentication works
3. ✅ Functions are responding
4. ✅ Firestore reads/writes work
5. ✅ No errors in console/logs

## Troubleshooting

### Common Issues

#### Deployment Fails

```bash
# Clear cache and retry
rm -rf functions/lib
cd functions && npm run build
firebase deploy --only functions --force
```

#### Function Timeout

- Increase timeout in function options:
  ```typescript
  export const myFunction = functions
    .runWith({ timeoutSeconds: 540 }) // Max 9 minutes
    .https.onRequest(handler);
  ```

#### Out of Memory

- Increase memory allocation:
  ```typescript
  export const myFunction = functions
    .runWith({ memory: '2GB' })
    .https.onRequest(handler);
  ```

#### Permission Errors

- Ensure service account has correct roles:
  - Cloud Functions Developer
  - Cloud Datastore User
  - Storage Admin (if using Cloud Storage)

## Best Practices

1. **Always test in staging first**
2. **Deploy during low-traffic hours**
3. **Monitor logs after deployment**
4. **Keep backups of configuration**
5. **Document breaking changes**
6. **Use semantic versioning for functions**
7. **Tag releases in git**
8. **Maintain deployment changelog**

## Cost Optimization

### Monitor Costs

- Set up billing alerts
- Review Firebase Usage dashboard weekly
- Optimize function execution time
- Use appropriate memory allocation
- Implement caching strategies

### Function Best Practices

- Use `runWith()` to set minimum instances for critical functions
- Set maxInstances to prevent runaway costs
- Implement request throttling
- Use Cloud Tasks for heavy processing
- Optimize cold start times

## Support and Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Functions Best Practices](https://firebase.google.com/docs/functions/best-practices)
- [Firebase Support](https://firebase.google.com/support)
- [Stack Overflow - Firebase](https://stackoverflow.com/questions/tagged/firebase)

## Maintenance Schedule

### Weekly
- Review error logs
- Check usage metrics
- Monitor costs

### Monthly
- Update dependencies
- Review security rules
- Optimize function performance

### Quarterly
- Update Firebase SDK versions
- Review and optimize indexes
- Conduct security audit
