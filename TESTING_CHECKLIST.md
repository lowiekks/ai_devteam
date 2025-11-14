# 🧪 Testing Checklist

Quick reference guide for testing your DropshipAI application locally.

---

## 🚀 Quick Start

```bash
# 1. Start development environment
./scripts/start-local-dev.sh

# 2. Seed test data
npx ts-node scripts/seed-test-data.ts

# 3. Open in browser
open http://localhost:3000
```

---

## ✅ Pre-Testing Checklist

### Environment Setup

- [ ] Firebase CLI installed (`firebase --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] Dependencies installed
  - [ ] Root: `npm install`
  - [ ] Functions: `cd functions && npm install`
  - [ ] Dashboard: `cd dashboard && npm install`
- [ ] `.env.local` configured in dashboard/
- [ ] `.env` configured in functions/ (optional for basic testing)
- [ ] Emulators running (check http://localhost:4000)

### Test Data

- [ ] Test data seeded successfully
- [ ] Test users created:
  - [ ] test@example.com / password123
  - [ ] admin@example.com / admin123
- [ ] Sample products visible in Firestore
- [ ] Sample plugins visible in Firestore

---

## 🧪 Feature Testing Matrix

### 1. Authentication

| Feature | Test | Expected Result | Status |
|---------|------|-----------------|--------|
| Sign Up | Create new account | User created in Auth | ☐ |
| Login | Login with test credentials | Redirected to dashboard | ☐ |
| Logout | Click logout button | Redirected to login | ☐ |
| Forgot Password | Request password reset | Email sent notification | ☐ |
| Google OAuth | Sign in with Google | User created/logged in | ☐ |

**Steps:**
```bash
1. Navigate to http://localhost:3000/auth/login
2. Try login with test@example.com / password123
3. Verify you see the dashboard
4. Check Emulator UI > Authentication for user
```

---

### 2. Dashboard

| Feature | Test | Expected Result | Status |
|---------|------|-----------------|--------|
| Stats Cards | View product counts | Shows correct numbers | ☐ |
| Product List | View monitored products | Displays products table | ☐ |
| Search | Search for product | Filters results | ☐ |
| Status Filter | Filter by status | Shows filtered products | ☐ |
| Product Details | Click product | Opens detail modal | ☐ |

**Steps:**
```bash
1. Login to dashboard
2. Check stats cards show: Total, Live, Review, Processing
3. Verify products appear in table
4. Test search functionality
5. Test status filters
```

---

### 3. Products Page

| Feature | Test | Expected Result | Status |
|---------|------|-----------------|--------|
| Product Grid | View all products | Shows product cards | ☐ |
| Search | Search products | Filters grid | ☐ |
| Status Filter | Filter by status | Shows filtered products | ☐ |
| View Details | Click product | Opens modal with details | ☐ |
| Image Gallery | View images | Can switch between images | ☐ |
| Price Display | Check prices | Shows current/previous price | ☐ |

**Steps:**
```bash
1. Navigate to /products
2. Verify grid layout
3. Test search and filters
4. Click product to open modal
5. Test image gallery
```

---

### 4. Review Queue

| Feature | Test | Expected Result | Status |
|---------|------|-----------------|--------|
| Load Queue | View pending reviews | Shows products in REVIEW status | ☐ |
| Product Card | View product | Shows before/after content | ☐ |
| Approve | Approve product | Status changes to LIVE | ☐ |
| Reject | Reject product | Status changes to RAW_IMPORT | ☐ |
| Navigation | Next/Previous | Cycles through products | ☐ |
| Stats | View stats | Shows pending/approved/rejected | ☐ |

**Steps:**
```bash
1. Navigate to /review
2. Verify review queue loads
3. Test approve button
4. Check Firestore: product status changed to LIVE
5. Test reject button
6. Check Firestore: product status changed
```

---

### 5. Plugin Marketplace

| Feature | Test | Expected Result | Status |
|---------|------|-----------------|--------|
| Plugin List | View plugins | Shows all plugins | ☐ |
| Category Filter | Filter by category | Shows filtered plugins | ☐ |
| Install Plugin | Install a plugin | Shows success toast | ☐ |
| Uninstall Plugin | Uninstall plugin | Shows success toast | ☐ |
| My Plugins Panel | View installed | Shows installed plugins | ☐ |
| Monthly Cost | Check total cost | Shows correct total | ☐ |

**Steps:**
```bash
1. Navigate to /marketplace
2. Browse plugins
3. Test category filters
4. Install a plugin (e.g., AI Auto-Healer)
5. Check Firestore: user_plugins collection
6. Verify "My Plugins" panel updates
7. Test uninstall
```

---

### 6. Viral Store Builder

| Feature | Test | Expected Result | Status |
|---------|------|-----------------|--------|
| Category Selection | Select category | Loads trends | ☐ |
| Trend Display | View trends | Shows trending keywords | ☐ |
| Trend Selection | Select trend | Enables build button | ☐ |
| Store Creation | Build store | Creates store with products | ☐ |
| Result Display | View result | Shows store details | ☐ |

**Steps:**
```bash
1. Navigate to /onboarding/viral-store
2. Select a category (e.g., Beauty)
3. Wait for trends to load
4. Select a trend
5. Click "Build Viral Store"
6. Verify store created
7. Check Firestore: products added
```

---

### 7. Settings Page

| Feature | Test | Expected Result | Status |
|---------|------|-----------------|--------|
| Profile Update | Change display name | Shows success toast | ☐ |
| Password Change | Update password | Shows success toast | ☐ |
| Notifications | Toggle settings | Shows success toast | ☐ |
| Subscription | View plan info | Shows current plan | ☐ |
| Integrations | View connections | Shows connect buttons | ☐ |

**Steps:**
```bash
1. Navigate to /settings
2. Update display name
3. Check Firebase Auth: name updated
4. Test password change
5. Toggle notification settings
6. Verify settings persist
```

---

## 🔍 Emulator UI Checks

### Firestore Database

- [ ] Collections visible:
  - [ ] `users`
  - [ ] `products`
  - [ ] `plugins`
  - [ ] `user_plugins`
  - [ ] `blog_posts`
  - [ ] `trends`

### Authentication

- [ ] Test users exist
- [ ] User tokens valid
- [ ] Sign-in methods configured

### Functions

- [ ] Functions deployed to emulator
- [ ] Function logs visible
- [ ] No error logs

### Storage

- [ ] Buckets created
- [ ] Files uploadable

---

## 🐛 Common Issues & Fixes

### Emulators Won't Start

```bash
# Kill existing processes
lsof -ti:4000,5001,8080,9099,9199 | xargs kill -9

# Clear cache
rm -rf .firebase/

# Restart
firebase emulators:start
```

### Next.js Won't Connect

```bash
# Verify .env.local
cat dashboard/.env.local | grep EMULATORS
# Should show: NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true

# Restart Next.js
cd dashboard && npm run dev
```

### Functions Not Working

```bash
# Rebuild functions
cd functions
npm run build

# Check logs in Emulator UI
open http://localhost:4000
```

### No Test Data

```bash
# Re-seed data
npx ts-node scripts/seed-test-data.ts

# Verify in Emulator UI
open http://localhost:4000
```

---

## 📊 Performance Testing

### Load Testing

```bash
# Test product listing
time curl http://localhost:5001/PROJECT_ID/us-central1/getMonitoredProducts

# Test auth
time curl -X POST http://localhost:9099/.../accounts:signInWithPassword
```

### Memory Usage

```bash
# Monitor Next.js
cd dashboard
npm run dev -- --turbo

# Monitor Functions
firebase emulators:start --inspect-functions
```

---

## ✅ Sign-Off Checklist

Before marking testing complete:

- [ ] All authentication flows work
- [ ] All pages load without errors
- [ ] All CRUD operations work
- [ ] Toasts show for success/error
- [ ] No console errors in browser
- [ ] No errors in emulator logs
- [ ] Data persists correctly
- [ ] Navigation works smoothly
- [ ] Mobile responsive (test on small screen)

---

## 📝 Testing Log Template

```markdown
## Test Session: [Date]

**Tester:** [Your Name]
**Branch:** [Git Branch]
**Duration:** [Time]

### Environment
- Node: v18.x.x
- Firebase: vX.X.X
- Browser: Chrome/Firefox/Safari

### Tests Passed
- ✅ Authentication
- ✅ Dashboard
- ✅ Products
- ...

### Issues Found
1. **[Issue Title]**
   - Description: ...
   - Steps to reproduce: ...
   - Expected: ...
   - Actual: ...
   - Screenshot: ...

### Notes
- ...
```

---

## 🚀 Next Steps After Testing

```bash
# 1. Export test data
firebase emulators:export ./emulator-data

# 2. Commit changes
git add .
git commit -m "test: Verified all features working"

# 3. Deploy to staging/production
./scripts/deploy.sh --all
```

---

**Happy Testing! 🎉**

For detailed testing guide, see [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)
