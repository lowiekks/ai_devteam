# Phase 4 Testing Guide

Complete end-to-end testing guide for all Phase 4 features.

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Content Refinery Tests](#content-refinery-tests)
3. [Viral Store Generation Tests](#viral-store-generation-tests)
4. [SEO Blog Generator Tests](#seo-blog-generator-tests)
5. [Plugin Marketplace Tests](#plugin-marketplace-tests)
6. [Integration Tests](#integration-tests)
7. [Performance Tests](#performance-tests)
8. [Security Tests](#security-tests)

---

## Test Environment Setup

### 1. Local Development Environment

```bash
# Terminal 1: Start Firebase Emulators
cd functions
npm run serve

# Terminal 2: Start Next.js Dashboard
cd dashboard
npm run dev

# Terminal 3: Start Stripe CLI (for webhook testing)
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

### 2. Test Data Setup

Create test user:

```typescript
// In Firebase Console or via script
const testUser = {
  email: 'test@example.com',
  display_name: 'Test User',
  plan: 'pro',
  active_plugins: [],
  settings: {
    auto_refine_text: true,
    auto_refine_images: true,
  }
};
```

### 3. Environment Variables

Ensure all test API keys are set:

```bash
# functions/.env
OPENAI_API_KEY=sk-test-...
REPLICATE_API_TOKEN=r8_test-...
STRIPE_SECRET_KEY=sk_test_...
APIFY_API_KEY=apify_api_test_...
```

---

## Content Refinery Tests

### Test 1: Text Refinement

**Objective:** Verify GPT-4o refines product text correctly

**Steps:**

1. Create test product with raw data:

```typescript
const testProduct = {
  user_id: 'test-user-123',
  supplier_url: 'https://aliexpress.com/item/123.html',
  content_status: 'RAW_IMPORT',
  supplier_data: {
    title: 'LED Face Mask Beauty Device Anti Aging Wrinkle Removal Photon Therapy',
    description: 'Good quality LED mask for skin care...',
    images: ['https://example.com/image1.jpg'],
  },
};

// Add to Firestore
await db.collection('products').add(testProduct);
```

2. Wait for `refineProductText` function to trigger (~10-30 seconds)

3. Verify product updated:

```typescript
// Check Firestore
const updatedProduct = await db.collection('products').doc(productId).get();
const data = updatedProduct.data();

// Assertions
assert(data.content_status === 'PROCESSING');
assert(data.content_flags.text_refined === true);
assert(data.public_data.title !== data.supplier_data.title);
assert(data.public_data.title.length < 100); // Optimized length
assert(data.public_data.features.length >= 5);
assert(data.public_data.social_media?.instagram_caption?.length > 0);
```

**Expected Results:**
- ✅ Title is concise and compelling
- ✅ Short description is 1-2 sentences
- ✅ Features array has 5-7 items
- ✅ Instagram and Facebook captions generated
- ✅ Original data preserved in `supplier_data`

**Logs to Check:**
```bash
firebase functions:log --only refineProductText
```

---

### Test 2: Image Refinement

**Objective:** Verify Replicate API processes images correctly

**Steps:**

1. Ensure text refinement completed first
2. Wait for `refineProductImages` function (~60-120 seconds per image)
3. Verify images processed:

```typescript
const product = await db.collection('products').doc(productId).get();
const data = product.data();

// Assertions
assert(data.content_status === 'REVIEW');
assert(data.content_flags.images_refined === true);
assert(data.public_data.images.length > 0);
assert(data.public_data.images[0].includes('firebase'));
assert(data.public_data.images[0] !== data.supplier_data.images[0]);
```

**Expected Results:**
- ✅ Background removed from product images
- ✅ Images uploaded to Firebase Storage
- ✅ Original images preserved
- ✅ Status changed to REVIEW

**Check Firebase Storage:**
```
products/{userId}/{productId}/image_0.png
products/{userId}/{productId}/image_1.png
```

---

### Test 3: Product Review & Approval

**Objective:** Test the review queue and approval workflow

**Steps:**

1. Navigate to `/review` page
2. Verify products with `REVIEW` status appear
3. Click through product details
4. Test approve action:

```typescript
// Frontend
const approveProduct = httpsCallable(functions, 'approveProduct');
const result = await approveProduct({ productId: 'test-123' });

// Verify
const product = await db.collection('products').doc('test-123').get();
assert(product.data().content_status === 'LIVE');
assert(product.data().published_at !== null);
```

5. Test reject action:

```typescript
const rejectProduct = httpsCallable(functions, 'rejectProduct');
await rejectProduct({
  productId: 'test-123',
  reason: 'Poor image quality'
});

// Verify
const product = await db.collection('products').doc('test-123').get();
assert(product.data().content_status === 'REJECTED');
```

**Expected Results:**
- ✅ Review queue shows only REVIEW status products
- ✅ Before/After comparison visible
- ✅ Approve moves product to LIVE
- ✅ Reject moves product to REJECTED
- ✅ Keyboard shortcuts work (A for approve, R for reject)

---

## Viral Store Generation Tests

### Test 4: Trend Analysis

**Objective:** Verify trend detection works (mock data for now)

**Steps:**

1. Navigate to `/onboarding/viral-store`
2. Select category: "Beauty"
3. Click "Analyze Trends"
4. Verify trends appear:

```typescript
const analyzeTrends = httpsCallable(functions, 'analyzeTrends');
const result = await analyzeTrends({ category: 'beauty' });

// Assertions
assert(result.data.trends.length > 0);
assert(result.data.trends[0].keyword);
assert(result.data.trends[0].volume > 0);
assert(result.data.trends[0].growth_rate >= 0);
```

**Expected Results:**
- ✅ At least 5 trends returned
- ✅ Trends sorted by growth rate
- ✅ Each trend has keyword, volume, growth_rate
- ✅ Category filter works

---

### Test 5: Viral Store Builder

**Objective:** Test end-to-end viral store creation

**Steps:**

1. Select trend: "LED Face Mask"
2. Click "Build My Store"
3. Wait for completion (~30-60 seconds)
4. Verify store created:

```typescript
const buildViralStore = httpsCallable(functions, 'buildViralStore');
const result = await buildViralStore({
  trendKeyword: 'LED Face Mask',
  productCount: 5,
});

// Assertions
assert(result.data.productsCreated === 5);
assert(result.data.branding.store_name);
assert(result.data.branding.tagline);
assert(result.data.branding.color_palette);

// Verify products in Firestore
const products = await db
  .collection('products')
  .where('trend_keyword', '==', 'LED Face Mask')
  .get();

assert(products.size === 5);
assert(products.docs[0].data().content_status === 'RAW_IMPORT');
```

**Expected Results:**
- ✅ 5 products created
- ✅ AI-generated branding (name, tagline, colors)
- ✅ Products have RAW_IMPORT status
- ✅ Products tagged with trend_keyword
- ✅ Content refinery auto-triggers

**Timeline:**
- Store creation: ~30 seconds
- Text refinement: +30 seconds per product
- Image refinement: +120 seconds per product
- Total: ~15 minutes for 5 products

---

## SEO Blog Generator Tests

### Test 6: Automatic Blog Generation

**Objective:** Verify blog posts auto-generate when products go live

**Steps:**

1. Ensure user has `seo_blog_writer` plugin installed
2. Approve a product (move to LIVE status)
3. Wait for `generateProductBlog` function (~20-40 seconds)
4. Verify blog created:

```typescript
// Check Firestore
const blogs = await db
  .collection('blog_posts')
  .where('product_id', '==', productId)
  .get();

assert(blogs.size === 1);

const blog = blogs.docs[0].data();
assert(blog.title.length > 0);
assert(blog.content.length > 500); // At least 500 words
assert(blog.keywords.length > 0);
assert(blog.generated_by_ai === true);
assert(blog.post_type === 'product_review');
```

**Expected Results:**
- ✅ Blog post created automatically
- ✅ Title is SEO-optimized
- ✅ Content is 1000+ words
- ✅ Keywords extracted
- ✅ Slug is URL-friendly
- ✅ Post includes product link

---

### Test 7: Manual Blog Generation

**Objective:** Test on-demand blog creation

**Steps:**

1. Call `triggerBlogGeneration` function:

```typescript
const triggerBlogGeneration = httpsCallable(functions, 'triggerBlogGeneration');
const result = await triggerBlogGeneration({
  productId: 'test-123',
  postType: 'how_to_guide',
});

assert(result.data.blogPostId);
```

2. Verify blog with specific type:

```typescript
const blog = await db.collection('blog_posts').doc(result.data.blogPostId).get();
assert(blog.data().post_type === 'how_to_guide');
assert(blog.data().title.includes('How to'));
```

**Expected Results:**
- ✅ Blog created with specified type
- ✅ Different types have different formats:
  - `product_review`: "X Review: Is It Worth It?"
  - `comparison`: "X vs Y: Which is Better?"
  - `best_of_list`: "Top 10 Best X in 2024"
  - `how_to_guide`: "How to Use X Like a Pro"
  - `trend_article`: "Why X is Trending Right Now"

---

## Plugin Marketplace Tests

### Test 8: Plugin Installation

**Objective:** Test plugin purchase flow with Stripe

**Steps:**

1. Navigate to `/marketplace`
2. Find "SEO Blog Writer" plugin
3. Click "Install - $15/mo"
4. Verify Stripe payment flow:

```typescript
const installPlugin = httpsCallable(functions, 'installPlugin');
const result = await installPlugin({ pluginId: 'seo_blog_writer' });

// Should return Stripe client secret
assert(result.data.clientSecret);
assert(result.data.subscriptionId);

// Complete payment with test card
const stripe = await getStripe();
const { error } = await stripe.confirmCardPayment(result.data.clientSecret, {
  payment_method: {
    card: { token: 'tok_visa' }, // Stripe test token
  },
});

assert(!error);
```

5. Verify plugin installed:

```typescript
const user = await db.collection('users').doc(userId).get();
assert(user.data().active_plugins.includes('seo_blog_writer'));

const userPlugin = await db
  .collection('user_plugins')
  .where('user_id', '==', userId)
  .where('plugin_id', '==', 'seo_blog_writer')
  .get();

assert(userPlugin.docs[0].data().status === 'active');
assert(userPlugin.docs[0].data().stripe_subscription_id);
```

**Expected Results:**
- ✅ Stripe checkout initiated
- ✅ Payment processed successfully
- ✅ Plugin added to user's active_plugins
- ✅ Subscription created in Stripe
- ✅ Install count incremented

---

### Test 9: Plugin Feature Gate

**Objective:** Verify plugins properly gate features

**Steps:**

1. Create product without plugin installed
2. Approve product (move to LIVE)
3. Verify NO blog generated:

```typescript
// Wait 60 seconds
await new Promise(resolve => setTimeout(resolve, 60000));

const blogs = await db
  .collection('blog_posts')
  .where('product_id', '==', productId)
  .get();

assert(blogs.size === 0); // No blog created without plugin
```

4. Install `seo_blog_writer` plugin
5. Approve another product
6. Verify blog IS generated:

```typescript
await new Promise(resolve => setTimeout(resolve, 60000));

const blogs = await db
  .collection('blog_posts')
  .where('product_id', '==', productId2)
  .get();

assert(blogs.size === 1); // Blog created with plugin
```

**Expected Results:**
- ✅ Features disabled without plugin
- ✅ Features enabled after installation
- ✅ hasPlugin() check works correctly

---

### Test 10: Plugin Uninstallation

**Objective:** Test plugin cancellation flow

**Steps:**

1. Navigate to installed plugins
2. Click "Uninstall" on a plugin
3. Verify cancellation:

```typescript
const uninstallPlugin = httpsCallable(functions, 'uninstallPlugin');
await uninstallPlugin({ pluginId: 'seo_blog_writer' });

// Check user record
const user = await db.collection('users').doc(userId).get();
assert(!user.data().active_plugins.includes('seo_blog_writer'));

// Check user_plugin record
const userPlugin = await db
  .collection('user_plugins')
  .where('user_id', '==', userId)
  .where('plugin_id', '==', 'seo_blog_writer')
  .get();

assert(userPlugin.docs[0].data().status === 'cancelled');
assert(userPlugin.docs[0].data().uninstalled_at !== null);

// Check Stripe
const subscription = await stripe.subscriptions.retrieve(
  userPlugin.docs[0].data().stripe_subscription_id
);
assert(subscription.status === 'canceled');
```

**Expected Results:**
- ✅ Subscription cancelled in Stripe
- ✅ Plugin removed from active_plugins
- ✅ Status changed to cancelled
- ✅ Uninstall timestamp recorded
- ✅ Install count decremented

---

## Integration Tests

### Test 11: End-to-End Viral Store Flow

**Objective:** Test complete user journey from trend to live store

**Steps:**

1. User signs up → Pro plan
2. Install required plugins:
   - SEO Blog Writer ($15/mo)
   - Auto-Healer ($10/mo)
3. Navigate to Viral Store Onboarding
4. Select category: "Beauty"
5. Choose trend: "LED Face Mask"
6. Build store (5 products)
7. Wait for AI refinement (~15 min)
8. Review all products
9. Approve all products
10. Verify blogs generated (5 blog posts)

**Expected Timeline:**
- Store creation: 30s
- Text refinement: 2.5 min (5 products × 30s)
- Image refinement: 10 min (5 products × 2 min)
- Review & approval: 5 min (manual)
- Blog generation: 2.5 min (5 products × 30s)
- **Total: ~20 minutes**

**Expected Results:**
- ✅ 5 products with status LIVE
- ✅ 5 blog posts published
- ✅ All images processed
- ✅ All text refined
- ✅ Store branding applied

---

### Test 12: Auto-Healing Integration

**Objective:** Verify auto-heal works with plugin

**Steps:**

1. Install Auto-Healer plugin
2. Create product with supplier URL
3. Simulate product removal:

```typescript
// Update product to trigger removal
await db.collection('products').doc(productId).update({
  supplier_data: {
    available: false,
    stock: 0,
  },
});
```

4. Trigger monitoring worker
5. Verify auto-heal triggered:

```typescript
// Check logs
// Should see: "Auto-Healer plugin installed, initiating replacement"

// Check product updated with new supplier
const product = await db.collection('products').doc(productId).get();
assert(product.data().healing_status === 'healed');
assert(product.data().replacement_supplier_url !== null);
```

**Expected Results:**
- ✅ Auto-heal detects removal
- ✅ Plugin check passes
- ✅ New supplier found
- ✅ Product updated automatically

---

## Performance Tests

### Test 13: Load Testing

**Objective:** Verify system handles concurrent requests

**Tools:** Artillery, k6, or Apache JMeter

**Artillery Config:**

```yaml
# load-test.yml
config:
  target: 'https://your-domain.com'
  phases:
    - duration: 60
      arrivalRate: 10 # 10 requests per second
    - duration: 120
      arrivalRate: 50 # Ramp up to 50 rps
scenarios:
  - name: "Build Viral Store"
    flow:
      - post:
          url: "/api/build-viral-store"
          json:
            category: "beauty"
            trendKeyword: "LED Face Mask"
```

Run:
```bash
artillery run load-test.yml
```

**Success Criteria:**
- ✅ < 500ms response time (p95)
- ✅ < 1% error rate
- ✅ 100 concurrent viral store builds complete

---

### Test 14: Database Performance

**Objective:** Ensure Firestore queries are optimized

**Check Indexes:**

```bash
# Deploy indexes
firebase deploy --only firestore:indexes

# Verify indexes exist:
# - products: (user_id, content_status)
# - products: (trend_keyword, created_at)
# - blog_posts: (user_id, status)
# - user_plugins: (user_id, status)
```

**Query Performance:**

```typescript
// Should use index (< 100ms)
const products = await db
  .collection('products')
  .where('user_id', '==', userId)
  .where('content_status', '==', 'REVIEW')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get();

console.log('Query time:', performance.now() - start);
assert(queryTime < 100); // ms
```

---

## Security Tests

### Test 15: Authentication & Authorization

**Objective:** Verify security rules prevent unauthorized access

**Test Cases:**

1. **Unauthenticated user cannot read products:**

```typescript
// Should fail
const products = await db
  .collection('products')
  .where('user_id', '==', 'other-user')
  .get();

// Should throw permission denied error
```

2. **User can only access own products:**

```typescript
// As user A
const myProducts = await db
  .collection('products')
  .where('user_id', '==', 'user-a')
  .get();
// Should succeed

const otherProducts = await db
  .collection('products')
  .where('user_id', '==', 'user-b')
  .get();
// Should fail
```

3. **Plugin installation requires authentication:**

```typescript
// Without auth
const installPlugin = httpsCallable(functions, 'installPlugin');
await installPlugin({ pluginId: 'test' });
// Should throw "unauthenticated" error
```

---

### Test 16: Input Validation

**Objective:** Verify all inputs are validated

**Test Cases:**

1. **SQL Injection Prevention:**

```typescript
// Malicious input
const maliciousKeyword = "'; DROP TABLE products; --";

const result = await buildViralStore({
  trendKeyword: maliciousKeyword,
});

// Should sanitize input, not execute SQL
assert(result.data.branding.store_name !== maliciousKeyword);
```

2. **XSS Prevention:**

```typescript
const xssTitle = '<script>alert("XSS")</script>';

await db.collection('products').add({
  public_data: {
    title: xssTitle,
  },
});

// Frontend should escape HTML
// Rendered: &lt;script&gt;alert("XSS")&lt;/script&gt;
```

3. **Rate Limiting:**

```typescript
// Make 100 rapid requests
const promises = Array(100).fill(0).map(() =>
  analyzeTrends({ category: 'beauty' })
);

const results = await Promise.allSettled(promises);

// Some should be rate limited
const rateLimited = results.filter(r =>
  r.status === 'rejected' && r.reason.includes('rate limit')
);

assert(rateLimited.length > 0);
```

---

## Test Automation

### Unit Tests

Create `functions/test/content-refinery.test.ts`:

```typescript
import { expect } from 'chai';
import { refineProductText } from '../src/content-refinery/text-refiner';

describe('Content Refinery', () => {
  it('should refine product title', async () => {
    const rawTitle = 'LED Face Mask Beauty Device Anti Aging Wrinkle Removal Photon Therapy';
    const refined = await refineTitle(rawTitle);

    expect(refined.length).to.be.lessThan(100);
    expect(refined).to.not.equal(rawTitle);
  });

  it('should generate features list', async () => {
    const description = 'Good quality LED mask for skin care...';
    const features = await generateFeatures(description);

    expect(features).to.be.an('array');
    expect(features.length).to.be.at.least(5);
  });
});
```

Run:
```bash
cd functions
npm test
```

### Integration Tests

Create `functions/test/integration/viral-store.test.ts`:

```typescript
describe('Viral Store Generation', () => {
  it('should create store from trend', async () => {
    const result = await buildViralStore({
      trendKeyword: 'LED Face Mask',
      productCount: 5,
    });

    expect(result.productsCreated).to.equal(5);
    expect(result.branding.store_name).to.exist;
  });
});
```

---

## Test Checklist

### Pre-Deployment Testing

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Content refinery works end-to-end
- [ ] Viral store generation works
- [ ] SEO blog generator works
- [ ] Plugin marketplace works
- [ ] Stripe billing works
- [ ] Security rules tested
- [ ] Performance benchmarks met
- [ ] Error handling works
- [ ] Logs are clean (no errors)

### Post-Deployment Testing

- [ ] Production functions deployed
- [ ] Production dashboard deployed
- [ ] Stripe webhooks receiving events
- [ ] Email notifications working
- [ ] Monitoring and alerts active
- [ ] Backups configured
- [ ] SSL certificates valid
- [ ] Custom domain working

---

## Continuous Testing

### Set Up CI/CD

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd functions
          npm install

      - name: Run tests
        run: |
          cd functions
          npm test

      - name: Build
        run: |
          cd functions
          npm run build
```

---

**Testing complete! ✅**

Your Phase 4 implementation is production-ready.
