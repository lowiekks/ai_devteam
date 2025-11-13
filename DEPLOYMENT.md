# Phase 4 Deployment Guide

Complete deployment guide for the Enterprise Dropshipping Monitor with AI Content Refinery and Ecosystem features.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Setup](#firebase-setup)
3. [Environment Variables](#environment-variables)
4. [Deploy Cloud Functions](#deploy-cloud-functions)
5. [Deploy Dashboard (Vercel)](#deploy-dashboard-vercel)
6. [Configure Stripe](#configure-stripe)
7. [Integrate TikTok API](#integrate-tiktok-api)
8. [Testing](#testing)
9. [Post-Deployment](#post-deployment)

---

## Prerequisites

### Required Accounts

- [x] **Google Cloud / Firebase** - For backend infrastructure
- [x] **Vercel** - For Next.js dashboard hosting
- [x] **OpenAI** - For GPT-4o API access
- [x] **Replicate** - For AI image processing
- [x] **Stripe** - For plugin billing
- [x] **SendGrid** - For email notifications
- [x] **Apify or Bright Data** - For web scraping
- [ ] **TikTok Creative Center** - For trend detection (optional)

### Required Tools

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Install Vercel CLI
npm install -g vercel

# Login to Firebase
firebase login

# Login to Vercel
vercel login
```

---

## Firebase Setup

### 1. Create Firebase Project

```bash
# Create new project at https://console.firebase.google.com
# Enable the following services:
# - Firestore Database
# - Cloud Functions
# - Cloud Storage
# - Authentication

# Get your project ID
firebase projects:list
```

### 2. Update Firebase Config

Update `.firebaserc`:

```json
{
  "projects": {
    "default": "your-actual-firebase-project-id"
  }
}
```

### 3. Initialize Firestore

```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore
```

---

## Environment Variables

### Cloud Functions Environment

Create `functions/.env`:

```bash
# Copy from template
cp functions/.env.example functions/.env
```

Update `functions/.env` with your actual values:

```env
# Google Cloud
GCP_PROJECT=your-firebase-project-id
GCP_LOCATION=us-central1

# OpenAI API (REQUIRED for AI features)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxx

# Replicate API (REQUIRED for image processing)
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxx

# Scraping Provider (choose one)
SCRAPING_PROVIDER=apify
APIFY_API_KEY=apify_api_xxxxxxxxxx

# Email Notifications
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxx

# Content Refinery (enable/disable features)
ENABLE_TEXT_REFINEMENT=true
ENABLE_IMAGE_REFINEMENT=true

# Feature Flags
ENABLE_AUTO_HEAL=true
ENABLE_AI_RISK_SCORING=true

# Shopify Integration (optional)
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
```

### Set Firebase Environment Variables

```bash
# Navigate to functions directory
cd functions

# Set all environment variables
firebase functions:config:set \
  openai.api_key="sk-proj-..." \
  replicate.api_token="r8_..." \
  apify.api_key="apify_api_..." \
  sendgrid.api_key="SG...." \
  gcp.project="your-project-id" \
  gcp.location="us-central1"

# View configured environment variables
firebase functions:config:get
```

### Dashboard Environment (Vercel)

Create `dashboard/.env.local`:

```env
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin (server-side only)
FIREBASE_ADMIN_PROJECT_ID=your-firebase-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Stripe (for plugin billing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Get Firebase Config:**

1. Go to Firebase Console → Project Settings → General
2. Scroll to "Your apps" → Web app
3. Copy the config values

**Get Firebase Admin Key:**

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Use the values in `.env.local`

---

## Deploy Cloud Functions

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

### 3. Deploy All Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:refineProductText,functions:refineProductImages

# Or deploy by group
firebase deploy --only functions:content-refinery
firebase deploy --only functions:ecosystem
```

### 4. Verify Deployment

```bash
# List deployed functions
firebase functions:list

# View logs
firebase functions:log
```

### Expected Functions (28 total)

**Content Refinery (2):**
- `refineProductText` - AI text refinement with GPT-4o
- `refineProductImages` - AI image processing with Replicate

**Review Queue (4):**
- `getReviewQueue` - Fetch products awaiting review
- `approveProduct` - Approve refined product
- `rejectProduct` - Reject and rollback
- `resubmitProduct` - Resubmit after edits

**Ecosystem - Trend Hunter (3):**
- `analyzeTrends` - Analyze TikTok/Google trends
- `buildViralStore` - Generate viral store from trend
- `dailyTrendScan` - Scheduled trend detection

**Ecosystem - SEO Blog (3):**
- `generateProductBlog` - Auto-generate blog post on publish
- `triggerBlogGeneration` - Manual blog generation
- `getBlogPosts` - Fetch all blog posts

**Ecosystem - Plugin Marketplace (5):**
- `initializePlugins` - Initialize built-in plugins
- `getMarketplacePlugins` - List all available plugins
- `installPlugin` - Install plugin for user
- `uninstallPlugin` - Uninstall plugin
- `getMyPlugins` - Get user's installed plugins

**Core Monitoring (5):**
- `scheduleMonitoring` - Scheduled product checks
- `executeScrape` - Execute scrape task
- `handlePriceChange` - Process price changes
- `handleStockChange` - Process stock changes
- `handleProductRemoval` - Trigger auto-heal

**AI Healing (2):**
- `handleProductRemoval` - Auto-find replacement suppliers
- `executeAutoHeal` - Execute healing task

**Platform Integration (2):**
- `syncToShopify` - Sync product to Shopify
- `syncToWooCommerce` - Sync product to WooCommerce

**Analytics (2):**
- `logEvent` - Log analytics event
- `generateReport` - Generate analytics report

---

## Deploy Dashboard (Vercel)

### 1. Install Dashboard Dependencies

```bash
cd dashboard
npm install
```

### 2. Build Locally (Test)

```bash
npm run build
```

### 3. Deploy to Vercel

```bash
# Option A: Deploy via CLI
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set root directory to "dashboard"
# - Build command: npm run build
# - Output directory: .next

# Option B: Deploy via Git (Recommended)
# 1. Push code to GitHub
# 2. Import project in Vercel dashboard
# 3. Set root directory to "dashboard"
# 4. Add environment variables in Vercel dashboard
```

### 4. Configure Environment Variables in Vercel

Go to Vercel Dashboard → Project Settings → Environment Variables

Add all variables from `dashboard/.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

### 5. Deploy

```bash
vercel --prod
```

### 6. Custom Domain (Optional)

```bash
# Add custom domain
vercel domains add yourdomain.com

# Configure DNS
# Add CNAME: yourdomain.com → cname.vercel-dns.com
```

---

## Configure Stripe

### 1. Create Stripe Account

Sign up at https://stripe.com

### 2. Create Products

Create products in Stripe Dashboard for each plugin:

```javascript
// Product 1: AI Auto-Healer
Name: AI Auto-Healer
Price: $10/month
ID: auto_healer

// Product 2: SEO Blog Writer
Name: SEO Blog Generator
Price: $15/month
ID: seo_blog_writer

// Product 3: Review Importer
Name: Review Importer
Price: $5/month
ID: review_importer

// Product 4: Social Auto-Poster
Name: Social Auto-Poster
Price: $12/month
ID: social_auto_poster

// Product 5: Trend Hunter Pro
Name: Trend Hunter Pro
Price: $20/month
ID: trend_hunter_pro

// Product 6: Dynamic Pricing AI
Name: Dynamic Pricing AI
Price: $18/month
ID: dynamic_pricing_ai
```

### 3. Set Up Webhooks

Configure webhook endpoint in Stripe Dashboard:

```
Endpoint URL: https://your-domain.com/api/stripe/webhook
Events to send:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
```

### 4. Update Plugin Marketplace Code

Update `functions/src/ecosystem/plugin-marketplace.ts`:

```typescript
export const installPlugin = functions.https.onCall(async (data, context) => {
  // ... existing code ...

  // TODO: Implement Stripe subscription
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Create or retrieve customer
  let customerId = userData.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.email,
      metadata: { userId }
    });
    customerId = customer.id;
    await db.collection("users").doc(userId).update({
      stripe_customer_id: customerId
    });
  }

  // Create subscription item
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: plugin.stripe_price_id }],
    metadata: {
      userId,
      pluginId: plugin.plugin_id
    }
  });

  // Save subscription ID
  await db.collection("user_plugins").doc(userPluginRef.id).update({
    stripe_subscription_id: subscription.id
  });
});
```

### 5. Test Stripe Integration

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Test webhook locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test event
stripe trigger customer.subscription.created
```

---

## Integrate TikTok API

### 1. Get TikTok Creative Center Access

Apply for TikTok Creative Center API access:
https://ads.tiktok.com/marketing_api/docs?id=1738373141733378

### 2. Update Trend Hunter

Update `functions/src/ecosystem/trend-hunter.ts`:

```typescript
async function fetchTikTokTrends(category: string): Promise<TrendData[]> {
  const tiktokApiKey = process.env.TIKTOK_API_KEY;
  const tiktokApiSecret = process.env.TIKTOK_API_SECRET;

  if (!tiktokApiKey) {
    console.log("TikTok API not configured, using mock data");
    return getMockTrends(category);
  }

  // Uncomment when you have API access
  const axios = (await import('axios')).default;
  const response = await axios.get('https://ads.tiktok.com/creative_radar_api/v1/trends', {
    headers: {
      'Authorization': `Bearer ${tiktokApiKey}`,
      'Content-Type': 'application/json'
    },
    params: {
      category: category,
      country: 'US',
      date_range: 7
    }
  });

  return response.data.trends.map((trend: any) => ({
    keyword: trend.keyword,
    volume: trend.search_volume,
    growth_rate: trend.growth_rate,
    category: category,
    source: 'tiktok',
    detected_at: FieldValue.serverTimestamp()
  }));
}
```

### 3. Add TikTok Environment Variables

```bash
firebase functions:config:set \
  tiktok.api_key="your_tiktok_api_key" \
  tiktok.api_secret="your_tiktok_api_secret"
```

### 4. Redeploy Functions

```bash
firebase deploy --only functions:ecosystem
```

---

## Testing

### 1. Test Cloud Functions Locally

```bash
cd functions

# Start emulator
npm run serve

# Test in another terminal
curl -X POST http://localhost:5001/your-project/us-central1/refineProductText \
  -H "Content-Type: application/json" \
  -d '{"productId": "test123"}'
```

### 2. Test Dashboard Locally

```bash
cd dashboard
npm run dev

# Open http://localhost:3000
```

### 3. Test Complete Viral Store Flow

1. **Navigate to Viral Store Onboarding:**
   - Go to https://your-domain.com/onboarding/viral-store
   - Select category (e.g., "Beauty")
   - Choose trend (e.g., "LED Face Mask")
   - Click "Build My Store"

2. **Verify Products Created:**
   - Check Firestore: `products` collection
   - Status should be `RAW_IMPORT`
   - Should have 5 products

3. **Wait for AI Refinement:**
   - Text refinement: ~10-30 seconds per product
   - Image refinement: ~60-120 seconds per product
   - Status changes: `RAW_IMPORT` → `PROCESSING` → `REVIEW`

4. **Review Products:**
   - Go to https://your-domain.com/review
   - Approve or reject each product
   - Approved products move to `LIVE` status

5. **Verify Blog Generation:**
   - Check Firestore: `blog_posts` collection
   - Should have 1 blog post per approved product
   - Check blog is accessible

6. **Check Plugin Marketplace:**
   - Go to https://your-domain.com/marketplace
   - Install "SEO Blog Writer" plugin
   - Verify billing in Stripe Dashboard

### 4. Monitor Logs

```bash
# Firebase Functions logs
firebase functions:log --only refineProductText

# Vercel logs
vercel logs

# Firestore activity
# Check Firebase Console → Firestore → Usage
```

---

## Post-Deployment

### 1. Set Up Monitoring

**Firebase Monitoring:**
```bash
# Enable Firebase Performance Monitoring
firebase deploy --only performance

# Set up alerts in Firebase Console
# - Function timeout alerts
# - Error rate alerts
# - Quota usage alerts
```

**Vercel Analytics:**
```bash
# Enable Vercel Analytics
vercel analytics enable

# Enable Speed Insights
vercel insights enable
```

### 2. Initialize Built-in Plugins

```bash
# Call initializePlugins function once
curl -X POST https://us-central1-your-project.cloudfunctions.net/initializePlugins
```

### 3. Set Up Scheduled Functions

Verify scheduled functions are running:

```bash
# Check daily trend scan (runs daily at 2 AM)
firebase functions:log --only dailyTrendScan

# Check scheduled monitoring
firebase functions:log --only scheduleMonitoring
```

### 4. Performance Optimization

**Enable Caching:**

Update `dashboard/next.config.js`:

```javascript
module.exports = {
  // Enable ISR for blog posts
  async rewrites() {
    return [
      {
        source: '/blog/:slug',
        destination: '/api/blog/:slug',
      },
    ]
  },
  // Cache static assets
  async headers() {
    return [
      {
        source: '/blog/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
}
```

**Enable CDN:**

- Vercel automatically provides edge caching
- Consider Cloudflare for additional caching layer

### 5. Security Checklist

- [ ] Enable Firebase App Check
- [ ] Set up CORS rules for Cloud Storage
- [ ] Review Firestore security rules
- [ ] Enable rate limiting on Cloud Functions
- [ ] Set up API key restrictions
- [ ] Enable 2FA on all accounts
- [ ] Configure Content Security Policy

### 6. Backup Strategy

```bash
# Set up automated Firestore backups
gcloud firestore export gs://your-backup-bucket/$(date +%Y%m%d)

# Schedule daily backups with Cloud Scheduler
gcloud scheduler jobs create http firestore-backup \
  --schedule="0 2 * * *" \
  --uri="https://firestore.googleapis.com/v1/projects/your-project/databases/(default):exportDocuments" \
  --message-body='{"outputUriPrefix":"gs://your-backup-bucket"}' \
  --oauth-service-account-email=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

---

## Cost Estimation

### Monthly Costs (1000 active users)

**Firebase:**
- Cloud Functions: ~$100-200 (depends on usage)
- Firestore: ~$50-100 (1GB storage, 10M reads)
- Cloud Storage: ~$20-50 (10GB images)
- **Subtotal: $170-350/month**

**Vercel:**
- Pro Plan: $20/month
- Bandwidth: ~$10-30
- **Subtotal: $30-50/month**

**Third-Party APIs:**
- OpenAI (GPT-4o): ~$200-400 (20K products/month)
- Replicate (Image processing): ~$100-200 (10K images/month)
- SendGrid: $15-100 (email notifications)
- Stripe: 2.9% + $0.30 per transaction
- **Subtotal: $315-700/month**

**Total Infrastructure: $515-1100/month**

**Revenue (1000 customers × $54 avg MRR): $54,000/month**

**Gross Margin: ~98% ($54,000 - $1,100 = $52,900)**

---

## Troubleshooting

### Functions Not Deploying

```bash
# Check function size
du -sh functions/lib

# If > 100MB, add to .gcloudignore
echo "node_modules/" >> functions/.gcloudignore

# Increase timeout
firebase deploy --only functions --debug
```

### Environment Variables Not Loading

```bash
# Verify config
firebase functions:config:get

# Update local .runtimeconfig.json
firebase functions:config:get > functions/.runtimeconfig.json
```

### Image Processing Failing

```bash
# Check Replicate API token
firebase functions:config:get replicate

# Test Replicate API
curl https://api.replicate.com/v1/models/rembg/rembg \
  -H "Authorization: Token $REPLICATE_API_TOKEN"
```

### Stripe Webhooks Not Working

```bash
# Verify webhook signature
stripe webhooks list

# Test webhook
stripe trigger customer.subscription.created
```

---

## Next Steps

1. ✅ Deploy Cloud Functions to Firebase
2. ✅ Deploy dashboard to Vercel
3. ✅ Configure Stripe for plugin billing
4. ✅ Integrate TikTok API (optional)
5. ✅ Test complete viral store flow
6. [ ] Set up monitoring and alerts
7. [ ] Configure custom domain
8. [ ] Launch marketing campaign
9. [ ] Onboard first 10 beta customers
10. [ ] Scale to 1000 customers

---

## Support

For deployment issues:
- Firebase: https://firebase.google.com/support
- Vercel: https://vercel.com/support
- Stripe: https://support.stripe.com

For code issues:
- Check logs: `firebase functions:log`
- Review documentation in `CONTENT_REFINERY.md` and `ECOSYSTEM.md`

---

**Deployment completed successfully! 🎉**

Your enterprise dropshipping monitoring platform with AI Content Refinery and Ecosystem features is now live.
