# System Architecture Documentation

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Next.js 14 Dashboard (App Router)                │  │
│  │  - Real-time product monitoring                          │  │
│  │  - SWR for auto-refresh                                  │  │
│  │  - Tailwind CSS + Shadcn UI                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                      FIREBASE SERVICES                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Auth       │  │  Firestore   │  │  Cloud Functions     │  │
│  │              │  │  (Database)  │  │  (Node.js 20)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUD FUNCTIONS LAYER                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  scheduleScrapes (PubSub Trigger - Hourly)              │   │
│  │    ↓                                                     │   │
│  │  Creates tasks → Cloud Tasks Queue                      │   │
│  │                      ↓                                   │   │
│  │  executeScrape (HTTP Trigger - Workers)                 │   │
│  │    ↓                                                     │   │
│  │  Calls Scraping Service                                 │   │
│  │    ↓                                                     │   │
│  │  Detects Changes (404, Price, Stock)                    │   │
│  │         ↓                         ↓                      │   │
│  │  handleProductRemoval      handlePriceChange            │   │
│  │         ↓                                                │   │
│  │  [AI Auto-Heal System]                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES LAYER                       │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  OpenAI      │  │ Google Vision│  │  Apify/Bright Data   │  │
│  │  GPT-4o      │  │  API         │  │  (Scraping)          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────────────────────────┐    │
│  │  SendGrid    │  │  Shopify / WooCommerce APIs          │    │
│  │  (Email)     │  │  (Platform Integration)              │    │
│  └──────────────┘  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Monitoring Flow (Every Hour)

```
1. PubSub Scheduler triggers scheduleScrapes()
   ↓
2. Query Firestore for all ACTIVE products
   ↓
3. For each product, create a Cloud Task
   ↓
4. Cloud Tasks dispatches to executeScrape (up to 100 concurrent)
   ↓
5. executeScrape calls Apify/Bright Data with URL
   ↓
6. Scraper returns: {statusCode, price, stock, rating}
   ↓
7. Update Firestore with results
   ↓
8. If 404 → trigger handleProductRemoval()
   If price changed → trigger handlePriceChange()
```

### 2. Auto-Heal Flow (When Product Removed)

```
1. executeScrape detects 404
   ↓
2. handleProductRemoval() called
   ↓
3. Immediately set stock to 0 in Shopify/WooCommerce
   ↓
4. Check user settings: auto_replace enabled?
   ↓ YES
5. Extract original product image
   ↓
6. Call Google Vision API (reverseImageSearch)
   ↓
7. Filter results for AliExpress URLs only
   ↓
8. Scrape top 10 candidate suppliers
   ↓
9. Filter by: price variance, rating, shipping
   ↓
10. Vet top 3 with GPT-4o AI
   ↓
11. Select best match based on AI confidence
   ↓
12. Update Firestore with new supplier URL
   ↓
13. Restore stock to 999 in Shopify/WooCommerce
   ↓
14. Send success email notification
```

---

## Database Schema (Firestore)

### Collections

#### `users/{userId}`
```typescript
{
  uid: string
  email: string
  plan: "free" | "pro" | "pro_enterprise"
  platforms: {
    shopify?: {
      shop_url: string
      access_token: string
      location_id?: string
    }
    woocommerce?: {
      url: string
      consumer_key: string
      consumer_secret: string
    }
  }
  settings: {
    auto_replace: boolean
    min_supplier_rating: number  // e.g., 4.5
    max_price_variance: number   // e.g., 10 (%)
    notification_email?: string
  }
  created_at: Timestamp
  updated_at: Timestamp
}
```

#### `products/{productId}`
```typescript
{
  product_id: string
  user_id: string
  platform: "shopify" | "woocommerce"
  platform_id: string  // ID in Shopify/WooCommerce
  name: string
  original_image_url: string
  monitored_supplier: {
    url: string
    status: "ACTIVE" | "REMOVED" | "OUT_OF_STOCK" | "PRICE_CHANGED"
    current_price: number
    stock_level: number
    last_checked: Timestamp
    supplier_rating?: number
    shipping_method?: string
  }
  ai_insights: {
    risk_score: number  // 0-100
    predicted_removal_date: Timestamp | null
    image_match_confidence?: number  // For auto-heal
    last_analyzed: Timestamp
  }
  automation_log: Array<{
    action: "PRICE_UPDATE" | "STOCK_UPDATE" | "AUTO_HEAL" | "PRODUCT_REMOVED"
    old_value?: any
    new_value?: any
    timestamp: Timestamp
    details?: string
  }>
  created_at: Timestamp
  updated_at: Timestamp
}
```

#### `analytics/{eventId}`
```typescript
{
  event_id: string
  user_id: string
  event_type: "product_removed" | "auto_heal_success" | "auto_heal_failed" | "price_changed"
  product_id: string
  timestamp: Timestamp
  metadata: {
    // Event-specific data
  }
}
```

---

## Security Model

### Firestore Rules

```javascript
// Users can only access their own data
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}

// Products filtered by user_id
match /products/{productId} {
  allow read, write: if request.auth.uid == resource.data.user_id;
}

// Analytics read-only for users
match /analytics/{eventId} {
  allow read: if request.auth.uid == resource.data.user_id;
  allow write: if false; // Only Cloud Functions
}
```

### Cloud Functions Authentication

All callable functions check `context.auth`:

```typescript
if (!context.auth) {
  throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
}
```

---

## Scalability Considerations

### Current Limits

- **Cloud Tasks**: 500 dispatches/second (queue level)
- **Firestore**: 10,000 writes/second (database level)
- **Cloud Functions**: Auto-scales to demand
- **Concurrent Scrapes**: Configurable via Cloud Tasks (default: 100)

### Optimization Strategies

1. **Batching**: Scheduler processes products in batches of 50
2. **Queueing**: Cloud Tasks prevents function timeouts
3. **Caching**: SWR on frontend reduces API calls
4. **Indexes**: Composite indexes for common queries
5. **Throttling**: Rate limiting on scraping APIs

### Cost Optimization

- Use Firestore caching (5-minute TTL)
- Compress images before storage
- Batch Firestore writes where possible
- Use Cloud Scheduler instead of cron
- Enable Cloud CDN for static assets

---

## Error Handling Strategy

### Retry Logic

```typescript
// Cloud Tasks Configuration
{
  max_attempts: 3,
  max_retry_duration: 3600s,
  min_backoff: 10s,
  max_backoff: 3600s,
  max_doublings: 5
}
```

### Fallbacks

1. **Scraping fails** → Retry with exponential backoff
2. **AI vetting fails** → Conservative rejection (don't auto-replace)
3. **Platform API fails** → Queue for retry, send alert
4. **Vision API fails** → Fall back to SerpApi (if configured)

### Logging

```typescript
// All critical operations log to Cloud Functions
console.log(`[${timestamp}] ${module}: ${message}`, metadata);

// Errors trigger automatic alerts
console.error('Critical error:', error);
```

---

## Performance Benchmarks

### Expected Latencies

- **Scrape (Apify)**: 5-15 seconds
- **Reverse Image Search**: 2-5 seconds
- **AI Vetting**: 1-3 seconds
- **Firestore Write**: 50-200ms
- **Platform Stock Update**: 500ms-2s

### Throughput

- **1000 products**: ~15-20 minutes (hourly scan)
- **10,000 products**: ~2-3 hours (requires optimization)
- **100,000 products**: Requires sharding + distributed queue

---

## Monitoring & Observability

### Cloud Function Metrics

```bash
# View invocation count
gcloud monitoring metrics-descriptors list --filter="cloudfunctions.googleapis.com"

# Custom metrics
- scrapes_per_hour
- auto_heal_success_rate
- average_risk_score
```

### Alerts Setup

```yaml
Alert Policies:
  - Function execution time > 120s
  - Error rate > 5%
  - Cloud Tasks queue depth > 1000
  - Firestore write errors > 100/min
```

---

## Deployment Pipeline

### CI/CD Workflow

```yaml
# Recommended GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-functions:
    - npm install
    - npm run build
    - firebase deploy --only functions

  deploy-frontend:
    - npm install
    - npm run build
    - vercel --prod
```

### Environments

- **Development**: Firebase emulators + localhost:3000
- **Staging**: Separate Firebase project + Vercel preview
- **Production**: Production Firebase + Vercel production

---

## Disaster Recovery

### Backup Strategy

```bash
# Automated daily Firestore backup
gcloud firestore export gs://your-bucket/backups/$(date +%Y%m%d)

# Retention: 30 days
```

### Recovery Procedures

1. **Data Loss**: Restore from Firestore export
2. **Function Failure**: Auto-retries via Cloud Tasks
3. **Scraper Block**: Switch to backup provider (Bright Data ↔ Apify)
4. **API Quota Exceeded**: Implement rate limiting + alerts

---

This architecture is designed for production use and can scale from 10 to 100,000+ products with minimal changes.
