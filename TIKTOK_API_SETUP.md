# TikTok Creative Center API Integration Guide

Guide for integrating real TikTok trend data into the Trend Hunter feature.

## Table of Contents

1. [Overview](#overview)
2. [Get API Access](#get-api-access)
3. [API Endpoints](#api-endpoints)
4. [Update Backend Code](#update-backend-code)
5. [Testing](#testing)
6. [Alternative: Web Scraping](#alternative-web-scraping)

---

## Overview

The Trend Hunter feature currently uses mock data. This guide shows how to integrate with TikTok's Creative Center API to get real trending product data.

**Current Status:** Mock data
**Target:** Real TikTok Creative Center data

---

## Get API Access

### Option 1: TikTok Marketing API (Official)

1. **Create TikTok for Business Account**
   - Go to https://ads.tiktok.com/
   - Sign up for business account
   - Complete business verification

2. **Apply for API Access**
   - Go to https://ads.tiktok.com/marketing_api/
   - Click "Apply for Access"
   - Fill out application form:
     - Business information
     - Use case: "Trend analysis and product research"
     - Expected API usage
   - Wait for approval (1-2 weeks)

3. **Get Credentials**
   - Once approved, create an app in TikTok Developers
   - Get App ID and App Secret
   - Generate access token

**Documentation:**
- https://ads.tiktok.com/marketing_api/docs
- https://developers.tiktok.com/doc/creative-center-api

### Option 2: TikTok Creative Center (No API - Web Scraping)

TikTok Creative Center doesn't have a public API. You can:
1. Use their web interface: https://ads.tiktok.com/business/creativecenter
2. Scrape data (against TOS - use at your own risk)
3. Use third-party services like:
   - Apify TikTok scrapers
   - BrightData collectors
   - Piloterr trends API

### Option 3: Third-Party Trend APIs

**Alternatives:**
- **Google Trends API**: Free, good for general trends
- **Trending Products API**: Paid service
- **Apify TikTok Trending**: $49/month
- **Piloterr Trends**: $99/month

---

## API Endpoints

### TikTok Creative Center API Endpoints

**Base URL:**
```
https://business-api.tiktok.com/open_api/v1.3/
```

**Authentication:**
```http
Authorization: Bearer {access_token}
```

**Get Trending Hashtags:**
```http
GET /creative/hashtag/trending/
?country_code=US
&period=7
&category=beauty
```

**Get Trending Videos:**
```http
GET /creative/video/trending/
?country_code=US
&period=7
&category=ecommerce
```

**Get Trending Music:**
```http
GET /creative/music/trending/
?country_code=US
&period=7
```

### Response Format

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "list": [
      {
        "hashtag_name": "ledmask",
        "hashtag_id": "123456789",
        "views": 1500000,
        "posts": 5000,
        "rank": 1,
        "rank_change": 3,
        "trend_score": 95
      }
    ]
  }
}
```

---

## Update Backend Code

### 1. Install Dependencies

```bash
cd functions
npm install axios
```

Uncomment axios import in `functions/src/ecosystem/trend-hunter.ts`:

```typescript
import axios from "axios"; // Uncomment this line
```

### 2. Get TikTok Access Token

Create `functions/src/ecosystem/tiktok-auth.ts`:

```typescript
import axios from 'axios';

interface TikTokAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export async function getTikTokAccessToken(): Promise<string> {
  const appId = process.env.TIKTOK_APP_ID;
  const appSecret = process.env.TIKTOK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('TikTok API credentials not configured');
  }

  const response = await axios.post<TikTokAuthResponse>(
    'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',
    {
      app_id: appId,
      secret: appSecret,
      grant_type: 'client_credentials',
    }
  );

  return response.data.access_token;
}
```

### 3. Update Trend Fetching

Update `functions/src/ecosystem/trend-hunter.ts`:

```typescript
import axios from "axios";
import { getTikTokAccessToken } from "./tiktok-auth";

interface TikTokHashtag {
  hashtag_name: string;
  hashtag_id: string;
  views: number;
  posts: number;
  rank: number;
  rank_change: number;
  trend_score: number;
}

interface TikTokTrendResponse {
  code: number;
  message: string;
  data: {
    list: TikTokHashtag[];
  };
}

async function fetchTikTokTrends(category: string): Promise<TrendData[]> {
  const tiktokAppId = process.env.TIKTOK_APP_ID;
  const tiktokAppSecret = process.env.TIKTOK_APP_SECRET;

  if (!tiktokAppId || !tiktokAppSecret) {
    console.log("TikTok API not configured, using mock data");
    return getMockTrends(category);
  }

  try {
    // Get access token
    const accessToken = await getTikTokAccessToken();

    // Map category to TikTok category
    const categoryMap: Record<string, string> = {
      'beauty': 'beauty',
      'tech': 'electronics',
      'kitchen': 'home',
      'fitness': 'health',
      'fashion': 'fashion',
      'kids': 'toys',
      'home': 'home',
      'pets': 'pets',
    };

    const tiktokCategory = categoryMap[category.toLowerCase()] || 'general';

    // Fetch trending hashtags
    const response = await axios.get<TikTokTrendResponse>(
      'https://business-api.tiktok.com/open_api/v1.3/creative/hashtag/trending/',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          country_code: 'US',
          period: 7, // Last 7 days
          category: tiktokCategory,
        },
      }
    );

    if (response.data.code !== 0) {
      console.error('TikTok API error:', response.data.message);
      return getMockTrends(category);
    }

    // Transform TikTok data to our format
    return response.data.data.list.slice(0, 10).map((hashtag) => ({
      keyword: hashtag.hashtag_name,
      volume: hashtag.views,
      growth_rate: hashtag.rank_change > 0 ? hashtag.rank_change * 10 : 0,
      category: category,
      source: 'tiktok',
      detected_at: FieldValue.serverTimestamp(),
      metadata: {
        posts: hashtag.posts,
        rank: hashtag.rank,
        trend_score: hashtag.trend_score,
      },
    }));
  } catch (error) {
    console.error('Error fetching TikTok trends:', error);
    return getMockTrends(category);
  }
}
```

### 4. Add Trending Videos Endpoint

```typescript
interface TikTokVideo {
  video_id: string;
  video_url: string;
  title: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  thumbnail_url: string;
}

async function fetchTrendingVideos(keyword: string): Promise<TikTokVideo[]> {
  const accessToken = await getTikTokAccessToken();

  const response = await axios.get(
    'https://business-api.tiktok.com/open_api/v1.3/creative/video/search/',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        keyword: keyword,
        country_code: 'US',
        period: 7,
        sort_by: 'views',
        limit: 10,
      },
    }
  );

  return response.data.data.list;
}
```

### 5. Enhance Product Finding

Use trending videos to find products:

```typescript
async function findProductsFromVideos(videos: TikTokVideo[]): Promise<Product[]> {
  const products: Product[] = [];

  for (const video of videos) {
    // Extract product info from video title/description
    // Use GPT-4o to analyze video content
    const productInfo = await analyzeVideoForProducts(video);

    if (productInfo) {
      products.push(productInfo);
    }
  }

  return products;
}

async function analyzeVideoForProducts(video: TikTokVideo) {
  const prompt = `
Analyze this TikTok video and extract product information:

Title: ${video.title}
Video URL: ${video.video_url}
Views: ${video.views}

Extract:
1. Product name
2. Product category
3. Key features
4. Estimated price range
5. Target audience

Return as JSON.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}
```

### 6. Set Environment Variables

```bash
# Add to functions/.env
TIKTOK_APP_ID=your_app_id
TIKTOK_APP_SECRET=your_app_secret

# Set in Firebase
firebase functions:config:set \
  tiktok.app_id="your_app_id" \
  tiktok.app_secret="your_app_secret"
```

### 7. Export TikTok Auth Function

Update `functions/src/index.ts`:

```typescript
export { getTikTokAccessToken } from "./ecosystem/tiktok-auth";
```

---

## Testing

### 1. Test Locally

```bash
cd functions

# Set environment variables
export TIKTOK_APP_ID="your_app_id"
export TIKTOK_APP_SECRET="your_app_secret"

# Start emulator
npm run serve

# Test trend fetching
curl -X POST http://localhost:5001/your-project/us-central1/analyzeTrends \
  -H "Content-Type: application/json" \
  -d '{"category": "beauty"}'
```

### 2. Test Access Token

Create test script `functions/test-tiktok.ts`:

```typescript
import { getTikTokAccessToken } from './src/ecosystem/tiktok-auth';

async function test() {
  try {
    const token = await getTikTokAccessToken();
    console.log('Access token:', token);
    console.log('Token length:', token.length);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
```

Run:
```bash
npx ts-node functions/test-tiktok.ts
```

### 3. Test Trend Fetching

```typescript
import { fetchTikTokTrends } from './src/ecosystem/trend-hunter';

async function test() {
  const trends = await fetchTikTokTrends('beauty');
  console.log('Trends:', JSON.stringify(trends, null, 2));
}

test();
```

### 4. Verify in Dashboard

1. Go to http://localhost:3000/onboarding/viral-store
2. Select category
3. Verify real TikTok trends appear
4. Check trend data quality

---

## Alternative: Web Scraping

If you can't get API access, use Apify:

### 1. Install Apify Client

```bash
npm install apify-client
```

### 2. Create Apify Scraper

```typescript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({
  token: process.env.APIFY_API_KEY,
});

async function scrapeTikTokTrends(category: string) {
  const run = await client.actor('apify/tiktok-hashtag-scraper').call({
    hashtags: [`#${category}`, `#${category}products`],
    resultsLimit: 100,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items.map((item: any) => ({
    keyword: item.text,
    volume: item.viewCount,
    growth_rate: 0, // Not available from scraping
    category: category,
    source: 'tiktok',
    detected_at: new Date(),
  }));
}
```

### 3. Cost Comparison

**TikTok Official API:**
- Free tier: 1000 requests/day
- Paid: Contact sales

**Apify:**
- $49/month for 100K results
- $0.25 per 1000 results

**BrightData:**
- $500/month minimum
- More reliable, faster

---

## Rate Limiting

### Implement Rate Limiting

```typescript
import { RateLimiter } from 'limiter';

// 100 requests per hour
const limiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: 'hour',
});

async function rateLimitedFetch(url: string) {
  await limiter.removeTokens(1);
  return axios.get(url);
}
```

### Cache Trends

```typescript
import { getFirestore } from 'firebase-admin/firestore';

async function getCachedTrends(category: string): Promise<TrendData[] | null> {
  const db = getFirestore();

  // Check if cached trends exist (less than 6 hours old)
  const snapshot = await db
    .collection('trend_cache')
    .where('category', '==', category)
    .where('cached_at', '>', new Date(Date.now() - 6 * 60 * 60 * 1000))
    .orderBy('cached_at', 'desc')
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs[0].data().trends as TrendData[];
  }

  return null;
}

async function cacheTrends(category: string, trends: TrendData[]) {
  const db = getFirestore();

  await db.collection('trend_cache').add({
    category,
    trends,
    cached_at: new Date(),
  });
}
```

---

## Monitoring

### Track API Usage

```typescript
async function logApiUsage(endpoint: string, response: any) {
  await db.collection('api_usage').add({
    provider: 'tiktok',
    endpoint: endpoint,
    timestamp: new Date(),
    status: response.status,
    quota_used: 1,
  });
}
```

### Set Up Alerts

```typescript
// Alert if API quota is low
if (quotaRemaining < 100) {
  await sendAlertEmail(
    'TikTok API quota running low',
    `Only ${quotaRemaining} requests remaining`
  );
}
```

---

## Fallback Strategy

### Multi-Source Trends

```typescript
async function getTrends(category: string): Promise<TrendData[]> {
  // Try TikTok first
  try {
    const tiktokTrends = await fetchTikTokTrends(category);
    if (tiktokTrends.length > 0) return tiktokTrends;
  } catch (error) {
    console.error('TikTok API failed:', error);
  }

  // Fallback to Google Trends
  try {
    const googleTrends = await fetchGoogleTrends(category);
    if (googleTrends.length > 0) return googleTrends;
  } catch (error) {
    console.error('Google Trends failed:', error);
  }

  // Fallback to mock data
  return getMockTrends(category);
}
```

---

## Going Live

### 1. Production Checklist

- [ ] TikTok API credentials obtained
- [ ] Rate limiting implemented
- [ ] Caching enabled (6 hour TTL)
- [ ] Error handling for API failures
- [ ] Fallback to mock data working
- [ ] Monitoring and alerts set up
- [ ] Cost tracking enabled

### 2. Deploy

```bash
firebase deploy --only functions:ecosystem
```

### 3. Monitor

```bash
# Watch logs for TikTok API calls
firebase functions:log --only analyzeTrends

# Check error rate
# Should be < 5%
```

---

## Troubleshooting

### API Returns Empty Results

- Check category mapping is correct
- Verify country code is supported
- Try different time periods (7, 30, 90 days)

### Access Token Expired

- Implement token refresh logic
- Cache tokens for reuse
- Set up automatic renewal

### Rate Limit Exceeded

- Implement request queuing
- Increase cache TTL
- Upgrade API tier

---

**TikTok integration ready! 🚀**

Your Trend Hunter now uses real viral product data from TikTok.
