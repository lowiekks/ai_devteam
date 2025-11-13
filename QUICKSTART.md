# 🚀 Quick Start Guide - Phase 4 Deployment

Get your Enterprise Dropshipping Monitor deployed in **under 1 hour**.

---

## ⚡ TL;DR - Deploy Now

```bash
# 1. Install dependencies
npm install -g firebase-tools vercel

# 2. Login to services
firebase login
vercel login

# 3. Configure environment
cp functions/.env.example functions/.env
cp dashboard/.env.local.example dashboard/.env.local
# Edit both files with your API keys

# 4. Update Firebase project
# Edit .firebaserc: Replace "your-firebase-project-id" with your actual project ID

# 5. Run preflight check
./scripts/preflight-check.sh

# 6. Deploy everything
./scripts/deploy.sh --all

# Done! ✨
```

**Total time: ~30-60 minutes** (including API key setup)

---

## 📋 Prerequisites Checklist

Before you begin, gather these:

- [ ] **Firebase Project**
  - Create at https://console.firebase.google.com
  - Enable: Firestore, Functions, Storage, Authentication
  - Copy your Project ID

- [ ] **OpenAI API Key** (REQUIRED)
  - Get at https://platform.openai.com/api-keys
  - Starts with `sk-proj-...`
  - Cost: ~$0.001-0.005 per product

- [ ] **Replicate API Token** (REQUIRED for images)
  - Get at https://replicate.com/account/api-tokens
  - Starts with `r8_...`
  - Cost: ~$0.02 per image

- [ ] **SendGrid API Key** (Recommended)
  - Get at https://app.sendgrid.com/settings/api_keys
  - Starts with `SG.`
  - Free tier: 100 emails/day

- [ ] **Apify API Key** (Recommended)
  - Get at https://console.apify.com/account/integrations
  - Starts with `apify_api_...`
  - Free tier: $5 credit

- [ ] **Stripe Account** (Optional - for plugin billing)
  - Create at https://dashboard.stripe.com
  - Get test keys first

- [ ] **Vercel Account** (Free)
  - Sign up at https://vercel.com/signup

---

## 🎯 Step-by-Step Deployment

### Step 1: Install CLI Tools (5 min)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Install Vercel CLI
npm install -g vercel

# Verify installation
firebase --version  # Should be >= 13.0.0
vercel --version    # Should be >= 32.0.0
```

### Step 2: Authenticate (5 min)

```bash
# Login to Firebase (opens browser)
firebase login

# Login to Vercel (opens browser)
vercel login

# Verify authentication
firebase projects:list
vercel whoami
```

### Step 3: Configure Firebase Project (5 min)

**Option A: Use Existing Project**

```bash
# List your projects
firebase projects:list

# Update .firebaserc with your project ID
# Edit line 3: "default": "your-actual-project-id"
```

**Option B: Create New Project**

```bash
# Go to https://console.firebase.google.com
# Click "Add project"
# Follow the wizard (name, analytics, etc.)
# Copy the Project ID

# Update .firebaserc
nano .firebaserc
```

**Enable Required Services:**

Go to Firebase Console → Your Project:

1. **Firestore Database**
   - Click "Create database"
   - Start in production mode
   - Choose location (us-central1 recommended)

2. **Cloud Functions**
   - Will be enabled automatically on first deploy

3. **Cloud Storage**
   - Click "Get started"
   - Use default settings

4. **Authentication**
   - Click "Get started"
   - Enable "Email/Password" provider

### Step 4: Configure Environment Variables (10 min)

**Functions Environment:**

```bash
cd functions

# Create .env from template
cp .env.example .env

# Edit with your keys
nano .env
```

Required values in `functions/.env`:

```env
# REQUIRED
GCP_PROJECT=your-actual-firebase-project-id
GCP_LOCATION=us-central1
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxx
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxx

# RECOMMENDED
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxx
APIFY_API_KEY=apify_api_xxxxxxxxxxxxxxxxxx

# OPTIONAL (for scraping)
SCRAPING_PROVIDER=apify

# OPTIONAL (for Shopify integration)
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=

# Feature flags
ENABLE_TEXT_REFINEMENT=true
ENABLE_IMAGE_REFINEMENT=true
ENABLE_AUTO_HEAL=true
ENABLE_AI_RISK_SCORING=true
```

**Dashboard Environment:**

```bash
cd dashboard

# Create .env.local from template
cp .env.local.example .env.local

# Get Firebase config from console
# Firebase Console → Project Settings → General → Your apps → Web app
```

Add to `dashboard/.env.local`:

```env
# Get these from Firebase Console
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Optional: Stripe (add later)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Step 5: Install Dependencies (5 min)

```bash
# Functions dependencies
cd functions
npm install

# Dashboard dependencies
cd ../dashboard
npm install

# Go back to root
cd ..
```

### Step 6: Run Preflight Check (2 min)

```bash
# This validates everything is ready
./scripts/preflight-check.sh
```

**Expected output:**
- ✓ All system requirements met
- ✓ CLI tools installed
- ✓ Authenticated to Firebase and Vercel
- ✓ Project configured
- ✓ Environment variables set

**If you see errors:**
- Review the error messages
- Fix the issues
- Run preflight check again

### Step 7: Deploy Cloud Functions (15 min)

```bash
# Build and deploy functions
./scripts/deploy.sh --functions

# Or manually:
cd functions
npm run build
firebase deploy --only functions
```

**What gets deployed (28 functions):**

- Content Refinery: `refineProductText`, `refineProductImages`
- Review Queue: `getReviewQueue`, `approveProduct`, `rejectProduct`
- Trend Hunter: `analyzeTrends`, `buildViralStore`, `dailyTrendScan`
- Blog Generator: `generateProductBlog`, `getBlogPosts`
- Plugin Marketplace: `initializePlugins`, `installPlugin`, `uninstallPlugin`
- Core monitoring, AI healing, platform integration, analytics

**Time:** ~10-15 minutes for first deployment

### Step 8: Deploy Dashboard (10 min)

```bash
# Deploy to Vercel
./scripts/deploy.sh --dashboard

# Or manually:
cd dashboard
vercel --prod
```

**Configuration prompts:**
- Link to existing project? → Choose or create new
- Root directory? → `dashboard` (or leave as `.` if already in dashboard/)
- Build command? → `npm run build`
- Output directory? → `.next`

**Time:** ~5-10 minutes

**Result:** You'll get a URL like `https://your-app.vercel.app`

### Step 9: Initialize Plugins (2 min)

After functions deploy, initialize the built-in plugins:

```bash
# Get your functions URL
firebase functions:list | grep initializePlugins

# Call the function
curl -X POST https://[region]-[project].cloudfunctions.net/initializePlugins

# Or use Firebase console: Functions → initializePlugins → Test
```

**This creates 6 plugins in Firestore:**
- AI Auto-Healer ($10/mo)
- SEO Blog Writer ($15/mo)
- Review Importer ($5/mo)
- Social Auto-Poster ($12/mo)
- Trend Hunter Pro ($20/mo)
- Dynamic Pricing AI ($18/mo)

### Step 10: Deploy Firestore Rules (2 min)

```bash
firebase deploy --only firestore

# This deploys:
# - firestore.rules (security rules)
# - firestore.indexes.json (database indexes)
```

### Step 11: Test Your Deployment (10 min)

**Test 1: Dashboard Access**

1. Go to your Vercel URL
2. Create an account
3. Login
4. You should see the dashboard

**Test 2: Content Refinery**

1. Go to Products → Add Product
2. Paste an AliExpress URL
3. Click "Import"
4. Watch the status:
   - RAW_IMPORT → PROCESSING → REVIEW
5. Go to Review page
6. See your refined product
7. Approve it

**Test 3: Viral Store Builder**

1. Go to Viral Store Onboarding
2. Select category: "Beauty"
3. Choose a trend
4. Click "Build My Store"
5. Wait 30 seconds
6. See 5 products created

**Test 4: Plugin Marketplace**

1. Go to Marketplace
2. See 6 plugins available
3. (Optional) Install a plugin
4. Verify it appears in "My Plugins"

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Dashboard loads at Vercel URL
- [ ] Can create account and login
- [ ] Firebase Functions deployed (28 functions)
- [ ] Firestore rules deployed
- [ ] Environment variables configured
- [ ] Can import a product
- [ ] Content refinery works (text + images)
- [ ] Review queue shows products
- [ ] Can approve/reject products
- [ ] Plugin marketplace visible
- [ ] Viral store builder works

---

## 🐛 Troubleshooting

### "Firebase login required"

```bash
firebase login --reauth
```

### "Permission denied" errors

- Check Firestore rules are deployed
- Verify user is authenticated
- Check Firebase console → Firestore → Rules

### Functions not deploying

```bash
# Check build succeeds
cd functions
npm run build

# Check for errors
firebase deploy --only functions --debug
```

### Dashboard not building

```bash
cd dashboard

# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Environment variables not working

```bash
# Functions: Check .env exists and has correct values
cat functions/.env | grep API_KEY

# Also set in Firebase config
firebase functions:config:set openai.api_key="sk-proj-..."

# Dashboard: Check .env.local exists
cat dashboard/.env.local | grep FIREBASE
```

### Images not processing

- Verify `REPLICATE_API_TOKEN` in functions/.env
- Check Replicate dashboard for quota
- Review function logs: `firebase functions:log --only refineProductImages`

### Plugins not showing

```bash
# Initialize plugins
curl -X POST https://[region]-[project].cloudfunctions.net/initializePlugins

# Or check Firestore Console → plugins collection
```

---

## 💰 Cost Estimate

**Monthly costs for 100 products:**

- Firebase Functions: ~$5-10
- Firestore: ~$5-10
- Cloud Storage: ~$2-5
- OpenAI (GPT-4o): ~$2-5 (100 products × $0.002)
- Replicate: ~$10-20 (100 products × $0.10-0.20)
- SendGrid: Free (100 emails/day tier)
- Apify: Free ($5 credit)
- Vercel: Free (hobby tier)

**Total: ~$24-50/month for 100 products**

**At scale (1000 products, 100 users):**
- Infrastructure: $515-1100/month
- Revenue: $54,000/month MRR
- Profit: $52,900/month (98% margin)

---

## 📚 Next Steps

### Immediate (Today)

1. ✅ Complete deployment
2. ✅ Test core workflows
3. ✅ Import 5-10 test products
4. ✅ Review and approve them

### This Week

1. **Configure Stripe** (see STRIPE_SETUP.md)
   - Create plugin products
   - Set up webhooks
   - Test plugin installation

2. **Customize branding**
   - Update colors in dashboard/tailwind.config.ts
   - Add your logo
   - Customize email templates

3. **Set up monitoring**
   - Firebase Console → Performance
   - Set up error alerts
   - Enable analytics

### This Month

1. **TikTok API** (see TIKTOK_API_SETUP.md)
   - Apply for API access
   - Integrate real trend data
   - Replace mock data

2. **Launch beta**
   - Onboard 10 beta users
   - Collect feedback
   - Fix bugs

3. **Marketing**
   - Create landing page
   - Start content marketing
   - Launch on Product Hunt

---

## 🎉 You're Live!

Your enterprise dropshipping monitoring platform is now deployed!

**What you built:**
- ✅ AI-powered content refinement (GPT-4o + Replicate)
- ✅ Viral store generation (TikTok trends)
- ✅ Automatic SEO blog creation
- ✅ Plugin marketplace monetization
- ✅ Admin review dashboard
- ✅ Social media content generation

**What you can do:**
- Import products from AliExpress
- Refine content with AI
- Generate viral stores
- Create SEO blog posts
- Sell plugin subscriptions
- Monitor supplier changes
- Auto-heal out-of-stock products

**Revenue potential:**
- 10 customers × $54/mo = $540 MRR
- 100 customers × $54/mo = $5,400 MRR
- 1000 customers × $54/mo = $54,000 MRR ($648K ARR)

---

## 📞 Get Help

**Documentation:**
- DEPLOYMENT.md - Detailed deployment guide
- STRIPE_SETUP.md - Payment setup
- TESTING_GUIDE.md - Testing procedures
- TIKTOK_API_SETUP.md - Trend API integration

**Resources:**
- Firebase Console: https://console.firebase.google.com
- Vercel Dashboard: https://vercel.com/dashboard
- Stripe Dashboard: https://dashboard.stripe.com

**Support:**
- Firebase: https://firebase.google.com/support
- Vercel: https://vercel.com/support
- Stripe: https://support.stripe.com

---

**Deployment time: 30-60 minutes**

**Ready to scale to $648K ARR? Let's go! 🚀**
