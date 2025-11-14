# 🧪 Local Development Guide

Complete guide for setting up and testing your DropshipAI application locally using Firebase Emulators.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Starting the Dev Environment](#starting-the-dev-environment)
4. [Using Firebase Emulators](#using-firebase-emulators)
5. [Testing Workflow](#testing-workflow)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

Before starting, ensure you have:

- **Node.js** 18+ installed
- **npm** or **yarn** package manager
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Git** for version control

### Verify Installation

```bash
node --version    # Should be 18+
npm --version
firebase --version
```

---

## 🚀 Initial Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd ai_devteam

# Install root dependencies
npm install

# Install functions dependencies
cd functions
npm install
cd ..

# Install dashboard dependencies
cd dashboard
npm install
cd ..
```

### 2. Configure Environment Variables

#### Dashboard (.env.local)

```bash
# Copy the example file
cp dashboard/.env.local.example dashboard/.env.local
```

Edit `dashboard/.env.local`:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Enable Firebase Emulators for local development
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true

NODE_ENV=development
```

#### Functions (.env)

```bash
# Copy the example file
cp functions/.env.example functions/.env
```

Edit `functions/.env` with your API keys (these are optional for basic testing):

```env
OPENAI_API_KEY=your-openai-key
REPLICATE_API_TOKEN=your-replicate-token
SENDGRID_API_KEY=your-sendgrid-key
# ... other API keys
```

---

## 🎯 Starting the Dev Environment

### Option 1: Automated Script (Recommended)

```bash
# Make the script executable
chmod +x scripts/start-local-dev.sh

# Start everything at once
./scripts/start-local-dev.sh
```

This will:
- ✅ Start Firebase Emulators (Auth, Firestore, Functions, Storage)
- ✅ Start Next.js dev server
- ✅ Open Emulator UI at http://localhost:4000
- ✅ Open Dashboard at http://localhost:3000

### Option 2: Manual Start

**Terminal 1 - Firebase Emulators:**
```bash
firebase emulators:start --import=./emulator-data --export-on-exit
```

**Terminal 2 - Next.js Dashboard:**
```bash
cd dashboard
npm run dev
```

---

## 🔥 Using Firebase Emulators

### Emulator URLs

Once started, you'll have access to:

| Service | URL | Purpose |
|---------|-----|---------|
| **Emulator UI** | http://localhost:4000 | Visual interface for all emulators |
| **Dashboard** | http://localhost:3000 | Your Next.js application |
| **Auth** | http://localhost:9099 | Authentication service |
| **Firestore** | http://localhost:8080 | Database |
| **Functions** | http://localhost:5001 | Cloud Functions |
| **Storage** | http://localhost:9199 | File storage |

### Emulator UI Features

The Emulator UI (http://localhost:4000) provides:

1. **Authentication** tab
   - View/create test users
   - Manage user tokens
   - Test sign-in flows

2. **Firestore** tab
   - Browse collections
   - Add/edit/delete documents
   - Query data

3. **Functions** tab
   - View function logs
   - See function invocations
   - Debug errors

4. **Storage** tab
   - Browse uploaded files
   - Manage buckets

---

## 🌱 Seeding Test Data

### Automatic Seed

```bash
# Install dependencies first (one-time)
cd scripts
npm install firebase-admin typescript ts-node
cd ..

# Run the seed script
npx ts-node scripts/seed-test-data.ts
```

This creates:
- ✅ 2 test users
- ✅ 3 sample products
- ✅ 3 plugins
- ✅ User settings

### Test Credentials

After seeding, you can login with:

**Regular User:**
- Email: `test@example.com`
- Password: `password123`

**Admin User:**
- Email: `admin@example.com`
- Password: `admin123`

---

## 🧪 Testing Workflow

### Complete Local Testing Loop

1. **Start Emulators**
   ```bash
   ./scripts/start-local-dev.sh
   ```

2. **Seed Test Data**
   ```bash
   npx ts-node scripts/seed-test-data.ts
   ```

3. **Test in Browser**
   - Navigate to http://localhost:3000
   - Login with test credentials
   - Test features:
     - Product management
     - Plugin marketplace
     - Review queue
     - Settings

4. **Monitor in Emulator UI**
   - Open http://localhost:4000
   - Watch Firestore changes
   - Check function logs
   - Debug authentication

### Testing Cloud Functions

You can test functions directly using the Firebase CLI:

```bash
# Call a function
firebase functions:shell

# Inside the shell:
getMonitoredProducts({}, {auth: {uid: 'test-user-id'}})
```

Or via your app:
```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const getProducts = httpsCallable(functions, 'getMonitoredProducts');
const result = await getProducts();
console.log(result.data);
```

### Testing Authentication

```typescript
// In your React component
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const handleLogin = async () => {
  try {
    await signInWithEmailAndPassword(auth, 'test@example.com', 'password123');
    console.log('✅ Logged in successfully');
  } catch (error) {
    console.error('❌ Login failed:', error);
  }
};
```

---

## 🐛 Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Kill processes on emulator ports
lsof -ti:4000,5001,8080,9099,9199 | xargs kill -9

# Or use different ports in firebase.json
```

### Emulators Won't Start

```bash
# Clear emulator cache
rm -rf .firebase/

# Restart with fresh data
firebase emulators:start --import=./emulator-data
```

### Functions Not Loading

```bash
# Rebuild functions
cd functions
npm run build
cd ..

# Restart emulators
firebase emulators:start
```

### Next.js Not Connecting to Emulators

1. Verify `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local`
2. Check browser console for connection errors
3. Ensure emulators started before Next.js
4. Clear browser cache and reload

### Data Not Persisting

By default, data is saved to `./emulator-data` on exit:

```bash
# Export current data
firebase emulators:export ./emulator-data

# Start with existing data
firebase emulators:start --import=./emulator-data --export-on-exit
```

---

## 📊 Development vs Production

### Local Development (Emulators)

```env
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
NODE_ENV=development
```

- ✅ Fast iteration
- ✅ No costs
- ✅ Safe testing
- ✅ Offline support

### Production

```env
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
NODE_ENV=production
```

- ✅ Real Firebase services
- ✅ Production data
- ✅ Live monitoring
- ⚠️ Costs apply

---

## 🔄 Data Export/Import

### Export Data from Emulators

```bash
# While emulators are running
firebase emulators:export ./my-backup
```

### Import Data to Emulators

```bash
firebase emulators:start --import=./my-backup
```

### Share Test Data with Team

```bash
# Commit emulator-data to git (optional)
git add emulator-data/
git commit -m "Add test data snapshot"
git push
```

---

## 🚀 Quick Reference

```bash
# Start everything
./scripts/start-local-dev.sh

# Seed test data
npx ts-node scripts/seed-test-data.ts

# Stop all services
Ctrl+C

# View emulator logs
firebase emulators:start --inspect-functions

# Clear all data
rm -rf emulator-data/
```

---

## 📚 Additional Resources

- [Firebase Emulator Suite Docs](https://firebase.google.com/docs/emulator-suite)
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

**Happy Testing! 🎉**

For issues or questions, check the [Troubleshooting](#troubleshooting) section or open an issue.
