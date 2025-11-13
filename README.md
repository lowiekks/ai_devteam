# Enterprise Dropshipping Monitor SaaS

**Production-Ready, Event-Driven Architecture with AI Auto-Healing**

This is a fully functional, enterprise-grade SaaS platform for monitoring dropshipping suppliers and automatically replacing removed products using AI. Built with Firebase, Next.js 14, OpenAI GPT-4o, and Google Cloud services.

---

## 🏗️ Architecture Overview

### Technology Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Backend:** Firebase Cloud Functions (Gen 2), Node.js 20
- **Database:** Google Cloud Firestore (NoSQL)
- **Task Queue:** Google Cloud Tasks
- **AI/ML:** OpenAI GPT-4o, Google Vision API
- **Scraping:** Apify / Bright Data with residential proxies
- **E-Commerce Platforms:** Shopify, WooCommerce
- **Payments:** Stripe Connect (ready to integrate)

### Key Features

✅ **Automated Supplier Monitoring** - Hourly scraping of supplier URLs
✅ **AI Auto-Healing** - Automatically finds and switches to new suppliers when products are removed
✅ **Event-Driven Queue System** - Handles thousands of concurrent scrapes with Cloud Tasks
✅ **AI Risk Scoring** - Predicts supplier removal likelihood
✅ **Real-Time Dashboard** - Live updates with SWR (Stale-While-Revalidate)
✅ **Platform Integration** - Shopify & WooCommerce stock/price sync
✅ **Reverse Image Search** - Google Vision API for finding alternative suppliers
✅ **Email Notifications** - SendGrid integration for alerts

---

## 📁 Project Structure

```
.
├── functions/                 # Firebase Cloud Functions (Backend)
│   ├── src/
│   │   ├── monitoring/        # Core scraping engine
│   │   │   ├── scheduler.ts   # Hourly scheduler (PubSub)
│   │   │   ├── worker.ts      # Queue worker for scraping
│   │   │   └── price-handler.ts
│   │   ├── ai-healing/        # AI Auto-Healing System
│   │   │   ├── auto-heal.ts   # Main auto-heal logic
│   │   │   ├── image-search.ts # Google Vision reverse search
│   │   │   └── ai-vetting.ts  # GPT-4o supplier vetting
│   │   ├── platform-integration/
│   │   │   ├── shopify.ts     # Shopify API client
│   │   │   ├── woocommerce.ts # WooCommerce API client
│   │   │   └── platform-controller.ts
│   │   ├── scraping/
│   │   │   └── scraper.ts     # Apify/Bright Data integration
│   │   ├── api/               # Dashboard API endpoints
│   │   ├── config/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── dashboard/                 # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx           # Main dashboard
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── DashboardTable.tsx # Product monitoring table
│   │   └── StatsCards.tsx     # Analytics cards
│   ├── lib/
│   │   └── firebase.ts        # Firebase client config
│   ├── types/
│   └── package.json
│
├── shared/
│   └── types/
│       └── database.ts        # Shared TypeScript types
│
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── ARCHITECTURE.md            # Detailed system architecture
└── README.md                  # This file
```

---

## 🚀 Deployment Guide

### Prerequisites

1. **Google Cloud / Firebase Project**
   - Create a new Firebase project at https://console.firebase.google.com
   - Enable Firestore, Cloud Functions, Cloud Tasks, and Cloud Vision API
   - Upgrade to Blaze (Pay-as-you-go) plan

2. **API Keys Required**
   - OpenAI API Key (GPT-4o access): https://platform.openai.com
   - Apify API Key: https://apify.com OR Bright Data API Key: https://brightdata.com
   - SendGrid API Key (optional): https://sendgrid.com

3. **Local Tools**
   - Node.js 20+
   - Firebase CLI: `npm install -g firebase-tools`
   - Git

---

## 📋 Step-by-Step Setup

### 1️⃣ Initialize Firebase

```bash
# Login to Firebase
firebase login

# Update .firebaserc with your project ID
# Replace "your-firebase-project-id" with your actual project ID
nano .firebaserc

# Initialize project
firebase use <your-project-id>
```

### 2️⃣ Configure Environment Variables

**Backend (Cloud Functions):**

```bash
cd functions
cp .env.example .env
nano .env
```

Update with your API keys:
```env
GCP_PROJECT=your-firebase-project-id
GCP_LOCATION=us-central1

OPENAI_API_KEY=sk-proj-...
APIFY_API_KEY=apify_api_...

SENDGRID_API_KEY=SG...
SCRAPING_PROVIDER=apify
```

Set Firebase environment variables:
```bash
firebase functions:config:set \
  openai.api_key="sk-proj-..." \
  apify.api_key="apify_api_..." \
  sendgrid.api_key="SG..."
```

**Frontend (Next.js):**

```bash
cd dashboard
cp .env.local.example .env.local
nano .env.local
```

Get these values from Firebase Console > Project Settings:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 3️⃣ Enable Google Cloud APIs

```bash
gcloud services enable \
  cloudtasks.googleapis.com \
  vision.googleapis.com \
  firestore.googleapis.com \
  cloudfunctions.googleapis.com
```

### 4️⃣ Create Cloud Tasks Queue

```bash
gcloud tasks queues create scraper-queue \
  --location=us-central1 \
  --max-concurrent-dispatches=100 \
  --max-attempts=3
```

### 5️⃣ Deploy Cloud Functions

```bash
cd functions
npm install
npm run build

# Deploy all functions
firebase deploy --only functions

# Note: Copy the deployed function URLs and update functions/src/config/environment.ts
```

Update `functions/src/config/environment.ts` with deployed URLs:
```typescript
scraperWorkerUrl: "https://us-central1-YOUR_PROJECT.cloudfunctions.net/executeScrape"
```

Redeploy if needed:
```bash
firebase deploy --only functions:scheduleScrapes
```

### 6️⃣ Deploy Firestore Rules & Indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 7️⃣ Deploy Next.js Dashboard

**Option A: Vercel (Recommended)**

```bash
cd dashboard
npm install

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Then deploy to production
vercel --prod
```

**Option B: Firebase Hosting**

```bash
cd dashboard
npm install
npm run build

# Update firebase.json to add hosting config
firebase deploy --only hosting
```

### 8️⃣ Setup Shopify Integration (Optional)

1. Create a Shopify App in your Partner Dashboard
2. Install the app on a test store
3. Get Access Token and Shop URL
4. Add to user document in Firestore:

```javascript
db.collection('users').doc('user_id').update({
  platforms: {
    shopify: {
      shop_url: 'your-store.myshopify.com',
      access_token: 'shpat_...',
      location_id: '123456789'  // Get from Shopify API
    }
  }
});
```

### 9️⃣ Test the System

**Add a Test Product:**

```javascript
// In Firebase Console > Firestore
db.collection('products').add({
  user_id: 'your-user-id',
  platform: 'shopify',
  platform_id: 'shopify_product_id',
  name: 'Test Product',
  original_image_url: 'https://example.com/image.jpg',
  monitored_supplier: {
    url: 'https://www.aliexpress.com/item/1234567890.html',
    status: 'ACTIVE',
    current_price: 12.99,
    stock_level: 999,
    last_checked: new Date()
  },
  ai_insights: {
    risk_score: 30,
    predicted_removal_date: null,
    last_analyzed: new Date()
  },
  automation_log: [],
  created_at: new Date(),
  updated_at: new Date()
});
```

**Trigger Manual Scrape:**

```bash
# Call the Cloud Function via Firebase CLI
firebase functions:call triggerManualScrape --data='{"productId":"<product-doc-id>"}'
```

**Check Logs:**

```bash
firebase functions:log --only scheduleScrapes,executeScrape
```

---

## 🔧 Configuration

### Scraping Provider Setup

**Using Apify:**

1. Sign up at https://apify.com
2. Create API token
3. Set `SCRAPING_PROVIDER=apify` in environment
4. The system uses `apify/web-scraper` actor

**Using Bright Data:**

1. Sign up at https://brightdata.com
2. Create Web Unlocker zone
3. Get API key
4. Set `SCRAPING_PROVIDER=brightdata`

### Scheduler Configuration

The scheduler runs every hour by default. To change:

Edit `functions/src/monitoring/scheduler.ts`:
```typescript
.pubsub.schedule("every 30 minutes")  // Change frequency
```

### Auto-Heal Settings

Configure per-user in Firestore:

```javascript
{
  settings: {
    auto_replace: true,           // Enable/disable auto-healing
    min_supplier_rating: 4.5,     // Minimum acceptable rating
    max_price_variance: 10,       // Max % price increase allowed
    notification_email: "user@example.com"
  }
}
```

---

## 📊 Monitoring & Analytics

### View System Metrics

```bash
# Function logs
firebase functions:log

# Firestore data
# Go to Firebase Console > Firestore > analytics collection
```

### BigQuery Export (Optional)

Enable Firestore BigQuery export for advanced analytics:

```bash
gcloud firestore databases create \
  --type=firestore-native \
  --location=us-central1

gcloud alpha firestore export \
  gs://your-bucket/firestore-export
```

### Cost Monitoring

- **Cloud Functions:** ~$0.0000025/invocation
- **Firestore:** ~$0.06/100K reads
- **Cloud Tasks:** ~$0.40/1M tasks
- **OpenAI GPT-4o:** ~$0.015/1K tokens
- **Google Vision API:** ~$1.50/1K images

**Estimated Monthly Cost (1000 products):**
- Scraping (hourly): $72/month
- AI Auto-Heal: $10-30/month (usage-based)
- Total: ~$100-150/month

---

## 🔐 Security Best Practices

1. **Never commit API keys** - Use Firebase config or environment variables
2. **Enable Firestore Rules** - Already configured in `firestore.rules`
3. **Use Firebase App Check** - Prevent unauthorized API access
4. **Rotate API keys** quarterly
5. **Enable Cloud Armor** for DDoS protection (production)

---

## 🐛 Troubleshooting

### Issue: "Function deployment failed"

**Solution:**
```bash
# Check Node version
node --version  # Should be 20.x

# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Cloud Tasks permission denied"

**Solution:**
```bash
# Grant permissions to Cloud Functions service account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/cloudtasks.enqueuer"
```

### Issue: "Scraper returning 403 errors"

**Solution:**
- AliExpress blocks non-residential IPs
- Ensure you're using Apify or Bright Data
- Check your scraping service credits/quota

### Issue: "Auto-heal not triggering"

**Solution:**
```bash
# Check logs
firebase functions:log --only executeScrape

# Verify OpenAI API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Verify Google Vision API is enabled
gcloud services list --enabled | grep vision
```

---

## 📚 API Documentation

### Cloud Functions (Callable)

#### `getMonitoredProducts()`
Returns all products for authenticated user.

**Request:**
```javascript
const result = await httpsCallable(functions, 'getMonitoredProducts')();
```

**Response:**
```javascript
{
  success: true,
  products: [Product[]]
}
```

#### `addProductToMonitoring(data)`
Add a new product to monitoring.

**Request:**
```javascript
await httpsCallable(functions, 'addProductToMonitoring')({
  platformProductId: 'shopify_123',
  platform: 'shopify',
  supplierUrl: 'https://aliexpress.com/item/...',
  productName: 'Product Name',
  imageUrl: 'https://...'
});
```

#### `triggerManualScrape(data)`
Manually trigger a scrape for a product.

**Request:**
```javascript
await httpsCallable(functions, 'triggerManualScrape')({
  productId: 'product_doc_id'
});
```

---

## 🔄 Workflow Overview

### 1. Product Monitoring Flow

```
[Scheduler (Hourly)]
    ↓
[Fetch Active Products from Firestore]
    ↓
[Create Cloud Task for each product]
    ↓
[Worker: executeScrape]
    ↓
[Scrape via Apify/Bright Data]
    ↓
[Detect Changes: 404, Price, Stock]
    ↓
[Trigger appropriate handler]
```

### 2. Auto-Heal Flow

```
[Product detected as 404]
    ↓
[Mark as REMOVED, set stock to 0]
    ↓
[Check if auto_replace enabled]
    ↓
[Reverse image search (Google Vision)]
    ↓
[Scrape candidate suppliers]
    ↓
[Filter by: price, rating, shipping]
    ↓
[AI vetting with GPT-4o (top 3)]
    ↓
[Auto-swap to best match]
    ↓
[Restore stock, send notification]
```

---

## 🚧 Future Enhancements

- [ ] Multi-language support for international suppliers
- [ ] Chrome extension for one-click product import
- [ ] Telegram bot for instant notifications
- [ ] Stripe Connect for subscription billing
- [ ] Competitor price tracking
- [ ] Automatic margin optimization
- [ ] CSV bulk import
- [ ] Mobile app (React Native)

---

## 📄 License

This is a production-ready codebase. Customize and deploy as needed for your business.

---

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Firebase Functions logs: `firebase functions:log`
3. Check Firestore data integrity
4. Verify all API keys are valid

See also: [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system design documentation.

---

## 🎯 Quick Start Commands

```bash
# Clone and setup
git clone <repo>
cd ai_devteam

# Setup Firebase Functions
cd functions
npm install
cp .env.example .env
# Edit .env with your API keys
npm run build

# Deploy backend
firebase deploy --only functions,firestore

# Setup dashboard
cd ../dashboard
npm install
cp .env.local.example .env.local
# Edit .env.local with Firebase config
npm run dev

# Visit http://localhost:3000
```

---

**Built with ❤️ for Dropshippers**

This system replaces manual monitoring with intelligent automation, saving hours daily and preventing lost sales from supplier removals.