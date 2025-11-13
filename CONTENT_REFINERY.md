# Phase 3: AI Content Refinery

**Transform raw AliExpress junk into premium, conversion-ready product listings**

The Content Refinery is an automated AI pipeline that takes ugly supplier content and transforms it into professional, high-converting product listings with refined copy and processed images.

---

## 🎯 What It Does

### The Problem
Raw AliExpress products are a mess:
- ❌ Titles like "New Hot 2025 Wireless Bluetooth Headphones Best Quality!!!"
- ❌ Broken English descriptions
- ❌ Images with watermarks and Chinese text
- ❌ Keyword stuffing instead of benefits
- ❌ No social media ready content

### The Solution
The Content Refinery automatically:
- ✅ Rewrites titles to be compelling and professional
- ✅ Creates benefit-focused product descriptions
- ✅ Generates feature bullet points
- ✅ Removes watermarks and backgrounds from images
- ✅ Upscales image quality
- ✅ Creates Instagram and Facebook captions
- ✅ Stages everything for one-click approval

---

## 🔄 Workflow

```
RAW_IMPORT (Product Created)
    ↓
    │ [AI Text Refiner]
    │ - GPT-4o rewrites title
    │ - Generates hook (2-sentence description)
    │ - Extracts 3-5 key features
    │ - Creates social media captions
    ↓
PROCESSING (Text Complete)
    ↓
    │ [AI Image Refiner]
    │ - Downloads first 3 images
    │ - Removes backgrounds (Replicate/rembg)
    │ - Optional: Upscale quality
    │ - Uploads to Firebase Storage
    ↓
REVIEW (Ready for Approval)
    ↓
    │ [Admin Review Dashboard]
    │ - User sees before/after
    │ - Can approve or reject
    │ - One-click publish
    ↓
LIVE (Published)
    ↓
    │ [Auto-Publish to Platform]
    │ - Sync to Shopify/WooCommerce
    │ - Set stock to 999
    │ - Monitor for changes
```

---

## 📁 Architecture

### New Database Fields

```typescript
interface Product {
  // Status tracking
  content_status: "RAW_IMPORT" | "PROCESSING" | "REVIEW" | "LIVE" | "REJECTED";

  // Flags
  content_flags: {
    text_refined: boolean;
    images_refined: boolean;
    auto_refine_images: boolean;  // User setting per product
  };

  // Refined content
  public_data: {
    title: string;                  // AI-rewritten title
    short_description: string;      // The "hook" - compelling 2-sentence copy
    features: string[];             // 3-5 bullet points
    images: string[];               // Clean, processed images
    original_title?: string;        // Keep for comparison
    original_description?: string;
    original_images?: string[];
  };

  // Auto-generated marketing content
  social_media?: {
    instagram_caption?: string;     // Ready-to-post caption
    facebook_post?: string;         // FB-optimized post
    generated_at?: Timestamp;
    posted: boolean;
  };
}
```

### User Settings

```typescript
interface UserSettings {
  // Content Refinery Settings
  auto_refine_text: boolean;        // Auto-run GPT-4o on imports
  auto_refine_images: boolean;      // Auto-process images (costs more)
  require_manual_review: boolean;   // Force REVIEW before LIVE
}
```

---

## 🧠 AI Text Refinement

### Module: `text-refiner.ts`

**Trigger:** Firestore onCreate for products with `content_status: "RAW_IMPORT"`

**Process:**
1. Extracts raw title and description
2. Calls GPT-4o with specialized copywriting prompt
3. Returns structured JSON:
   ```json
   {
     "title": "Premium Wireless Headphones with Active Noise Cancellation",
     "hook": "Experience studio-quality sound with all-day comfort. Perfect for work, travel, and everything in between.",
     "features": [
       "Superior 40mm drivers deliver crystal-clear audio",
       "Active noise cancellation blocks out distractions",
       "30-hour battery life keeps you powered all day"
     ],
     "instagram_caption": "Upgrade your audio game 🎧 Premium sound, all-day comfort. #WirelessHeadphones #AudioQuality",
     "facebook_post": "Looking for headphones that deliver on both sound AND comfort? Our Premium Wireless Headphones feature active noise cancellation and 30-hour battery life. Perfect for your daily commute or work-from-home setup. Shop now!"
   }
   ```
4. Updates Firestore with refined content
5. Sets `content_flags.text_refined: true`
6. Moves to `content_status: "PROCESSING"`

**Cost:** ~$0.01 per 10 products (using GPT-4o)

---

## 🖼️ AI Image Refinement

### Module: `image-refiner.ts`

**Trigger:** Firestore onUpdate when `text_refined: true` and `images_refined: false`

**Process:**
1. Fetches first 3 images from supplier URL
2. For each image:
   - Calls Replicate API (`rembg` model) to remove background
   - Optional: Upscale with Real-ESRGAN (2x)
   - Downloads processed image
   - Uploads to Firebase Storage
   - Returns public URL
3. Updates `public_data.images` with new URLs
4. Sets `content_flags.images_refined: true`
5. Moves to `content_status: "REVIEW"`

**Models Used:**
- **Background Removal:** `cjwbw/rembg` (Replicate)
- **Upscaling (optional):** `nightmareai/real-esrgan` (Replicate)

**Cost:**
- Background removal: ~$0.01-0.02 per image
- Upscaling: ~$0.03-0.05 per image
- **Total:** ~$0.05-0.15 per product (3 images)

**Tip:** Set `auto_refine_images: false` for low-margin products

---

## 👀 Admin Review Dashboard

### Component: `/dashboard/app/review/page.tsx`

**Features:**
- **Tinder-style interface** - Swipe through products
- **Before/After comparison** - Toggle to see original vs refined
- **Image carousel** - View all processed images
- **Social media preview** - See Instagram/Facebook captions
- **Quick actions:**
  - ✅ Approve (publish to LIVE)
  - ❌ Reject (send back to RAW)
  - ✏️ Edit (manual tweaks)

**Keyboard Shortcuts:**
- `→` Next product
- `←` Previous product
- `A` Approve
- `R` Reject
- `E` Edit

### API Endpoints

```typescript
// Get all products in REVIEW status
getReviewQueue()

// Approve and publish
approveProduct({ productId })

// Reject and flag for re-refinement
rejectProduct({ productId, reason? })

// Resubmit rejected product
resubmitProduct({ productId })
```

---

## 🚀 Deployment

### 1. Install Dependencies

```bash
cd functions
npm install
# New packages: replicate, @google-cloud/storage
```

### 2. Configure API Keys

**OpenAI API Key** (required for text refinement):
```bash
firebase functions:config:set openai.api_key="sk-proj-..."
```

**Replicate API Token** (required for image refinement):
```bash
# Get token from https://replicate.com/account/api-tokens
firebase functions:config:set replicate.token="r8_..."
```

Or use environment variables:
```bash
# functions/.env
OPENAI_API_KEY=sk-proj-...
REPLICATE_API_TOKEN=r8_...
ENABLE_TEXT_REFINEMENT=true
ENABLE_IMAGE_REFINEMENT=true
```

### 3. Deploy Cloud Functions

```bash
firebase deploy --only functions:refineProductText,functions:refineProductImages
```

### 4. Deploy Review Dashboard

```bash
cd dashboard
npm run build
vercel --prod
```

---

## 📊 Cost Breakdown

### Per Product (1000 products/month)

| Service | Cost per Product | Monthly (1000) |
|---------|-----------------|----------------|
| **Text Refinement** (GPT-4o) | $0.001 | $1.00 |
| **Image Processing** (3 images) | $0.05-0.15 | $50-150 |
| **Firebase Storage** | $0.001 | $1.00 |
| **Cloud Functions** | $0.0001 | $0.10 |
| **Total** | **$0.05-0.15** | **$52-152** |

### Cost Optimization Strategies

1. **Text Only Mode** (recommended for low-margin products):
   ```typescript
   auto_refine_images: false  // Skip image processing
   ```
   **Cost:** ~$1-2/month for 1000 products

2. **Background Removal Only** (skip upscaling):
   - Comment out `upscaleImage()` call in `image-refiner.ts`
   - **Saves:** ~50% on image costs

3. **Batch Processing** (process during off-peak hours):
   - Set user preference: "Refine overnight"
   - Lower Replicate API costs during low-demand periods

---

## 🧪 Testing

### Manual Test: Text Refinement

```bash
# Create a test product
firebase firestore:add products '{
  "user_id": "test_user_123",
  "content_status": "RAW_IMPORT",
  "content_flags": {
    "text_refined": false,
    "images_refined": false
  },
  "public_data": {
    "original_title": "New Hot 2025 Wireless Headphones Best Quality!!!",
    "original_description": "Very good product, many customer buy, fast ship"
  },
  "monitored_supplier": {
    "current_price": 12.99
  }
}'

# Watch logs
firebase functions:log --only refineProductText

# Check Firestore for refined content
```

### Manual Test: Image Refinement

```javascript
// In Firestore Console, update a product:
{
  "content_flags.text_refined": true,
  "content_flags.images_refined": false,
  "content_flags.auto_refine_images": true,
  "public_data.original_images": [
    "https://example.com/product-image.jpg"
  ]
}

// Watch logs
firebase functions:log --only refineProductImages
```

### Test Review Dashboard

```bash
cd dashboard
npm run dev
# Visit http://localhost:3000/review
```

---

## 🐛 Troubleshooting

### Issue: "Text refinement not triggering"

**Cause:** OpenAI API key not set or user has `auto_refine_text: false`

**Solution:**
```bash
# Check config
firebase functions:config:get

# Set API key
firebase functions:config:set openai.api_key="sk-..."

# Check user settings in Firestore
db.collection('users').doc('user_id').get()
```

### Issue: "Image refinement timeout"

**Cause:** Replicate API taking too long or hitting rate limits

**Solution:**
```typescript
// Increase timeout in image-refiner.ts
.runWith({
  timeoutSeconds: 540,  // Max is 540 (9 minutes)
  memory: "1GB"
})
```

### Issue: "Images not uploading to Firebase Storage"

**Cause:** Storage bucket not configured or permissions issue

**Solution:**
```bash
# Enable Firebase Storage
firebase init storage

# Set bucket permissions in Firebase Console
# Storage > Rules > Allow authenticated writes
```

### Issue: "GPT-4o returning invalid JSON"

**Cause:** Model hallucinating or prompt issues

**Solution:**
- Check `response_format: { type: "json_object" }` is set
- Validate JSON with try-catch
- Add fallback:
  ```typescript
  try {
    const result = JSON.parse(completion.choices[0].message.content);
  } catch {
    // Use original title as fallback
    return { title: rawTitle, ... };
  }
  ```

---

## 📈 Analytics

Track refinement performance:

```typescript
// Analytics events logged automatically:
{
  event_type: "text_refined",
  event_type: "images_refined",
  event_type: "product_approved",
  event_type: "product_rejected"
}

// Query in Firestore:
db.collection('analytics')
  .where('event_type', '==', 'text_refined')
  .where('timestamp', '>=', startDate)
  .get()
```

### Key Metrics

- **Approval Rate:** `approved / (approved + rejected)`
- **Avg Time to Approve:** `published_at - created_at`
- **Refinement Success Rate:** `text_refined / total_imports`
- **Cost per Product:** Track Replicate API usage

---

## 🎨 Customization

### Custom GPT-4o Prompts

Edit `text-refiner.ts` to match your brand voice:

```typescript
const prompt = `You are a copywriter for a LUXURY brand...`;
// vs
const prompt = `You are a copywriter for a BUDGET brand...`;
```

### Custom Image Processing

Add more Replicate models:

```typescript
// Watermark removal
await replicate.run("philz1337x/lama-cleaner", {
  input: { image: imageUrl }
});

// AI background generation
await replicate.run("bytedance/sdxl-lightning-4step", {
  input: { prompt: "white studio background" }
});
```

### Webhook Notifications

Alert when products are ready for review:

```typescript
// In image-refiner.ts after moving to REVIEW:
await sendWebhookNotification(userData.webhook_url, {
  event: "product_ready_for_review",
  product_id: productId,
  title: product.public_data.title
});
```

---

## 🚧 Future Enhancements

- [ ] A/B testing different titles
- [ ] SEO keyword optimization
- [ ] Multi-language support (translate for international markets)
- [ ] Video thumbnail generation
- [ ] Auto-detect product category and adjust tone
- [ ] Competitor price-aware copy ("30% cheaper than Brand X")
- [ ] Bulk edit interface (approve multiple at once)
- [ ] AI-powered A+ content generation

---

## 📚 Related Documentation

- [README.md](README.md) - Main deployment guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [Replicate API Docs](https://replicate.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)

---

**The Content Refinery is what turns a basic dropshipping tool into a premium product launch platform.**
