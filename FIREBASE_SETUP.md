# Firebase Setup Guide

This guide will help you set up Firebase for the Enterprise Dropshipping Monitor application.

## Prerequisites

- Node.js 20+ installed
- Firebase account ([firebase.google.com](https://firebase.google.com))
- Firebase CLI installed globally: `npm install -g firebase-tools`

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or "Create a Project"
3. Enter a project name (e.g., "dropship-monitor-prod")
4. Enable Google Analytics (optional but recommended)
5. Click "Create Project"

## Step 2: Enable Required Firebase Services

### Firestore Database

1. In the Firebase Console, navigate to **Firestore Database**
2. Click "Create database"
3. Choose "Start in production mode" (we have custom rules)
4. Select a location closest to your users
5. Click "Enable"

### Firebase Authentication

1. Navigate to **Authentication**
2. Click "Get Started"
3. Enable the sign-in methods you want:
   - Email/Password
   - Google
   - Other providers as needed

### Cloud Storage

1. Navigate to **Storage**
2. Click "Get Started"
3. Start in production mode (we have custom rules)
4. Choose the same location as Firestore
5. Click "Done"

### Cloud Functions

1. Navigate to **Functions**
2. Click "Get Started"
3. Upgrade to the Blaze (pay-as-you-go) plan if prompted
   - Required for Cloud Functions
   - Free tier is generous for development

## Step 3: Configure Firebase Project Locally

### Update .firebaserc

1. Open `.firebaserc` in the project root
2. Replace `your-firebase-project-id` with your actual Firebase project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

You can find your project ID in the Firebase Console under Project Settings.

### Set Up Dashboard Environment Variables

1. Copy the example environment file:
   ```bash
   cd dashboard
   cp .env.local.example .env.local
   ```

2. Get your Firebase Web App configuration:
   - In Firebase Console, click the gear icon → Project Settings
   - Scroll down to "Your apps"
   - Click "Add app" → Web (</>) if you haven't already
   - Give it a nickname (e.g., "Dashboard")
   - Register the app

3. Copy the config values to `dashboard/.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

## Step 4: Set Up Firebase Admin SDK (for Cloud Functions)

### Generate Service Account Key

1. In Firebase Console, go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely (DO NOT commit to git)

### Set Environment Variables for Functions

For local development with the emulator:
```bash
cd functions
# Set the path to your service account key
export GOOGLE_APPLICATION_CREDENTIALS="../path-to-service-account-key.json"
```

For production deployment, Firebase Functions automatically has access to the service account.

### Configure Additional Environment Variables

If using external services (OpenAI, Replicate, etc.), set them in Firebase:

```bash
firebase functions:config:set \
  openai.api_key="sk-..." \
  replicate.api_key="r8_..." \
  shopify.api_key="..." \
  shopify.api_secret="..." \
  woocommerce.consumer_key="..." \
  woocommerce.consumer_secret="..."
```

View current config:
```bash
firebase functions:config:get
```

## Step 5: Deploy Security Rules

Deploy Firestore and Storage security rules:

```bash
# Deploy all rules
firebase deploy --only firestore:rules,storage:rules

# Or deploy individually
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## Step 6: Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

## Step 7: Install Dependencies

```bash
# Install dashboard dependencies
cd dashboard
npm install

# Install functions dependencies
cd ../functions
npm install
```

## Step 8: Test with Firebase Emulators (Local Development)

The Firebase Emulators allow you to develop and test locally without using production resources.

### Start the Emulators

```bash
# From project root
firebase emulators:start
```

This will start:
- **Firestore Emulator** on port 8080
- **Authentication Emulator** on port 9099
- **Functions Emulator** on port 5001
- **Emulator UI** on port 4000

### Connect Dashboard to Emulators

Update `dashboard/lib/firebase.ts` to connect to emulators in development:

```typescript
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectFunctionsEmulator } from 'firebase/functions';

// After initializing
if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

### Run the Dashboard

```bash
cd dashboard
npm run dev
```

Visit http://localhost:3000 to see your app running with emulators.

## Step 9: Deploy to Production

### Deploy Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Deploy Hosting (if configured)

```bash
cd dashboard
npm run build
firebase deploy --only hosting
```

### Deploy Everything

```bash
firebase deploy
```

## Monitoring and Logs

### View Function Logs

```bash
firebase functions:log
```

### View Firestore Usage

Check the Firebase Console → Firestore Database → Usage tab

### Set Up Alerts

1. Go to Firebase Console → Alerts
2. Set up billing alerts
3. Set up performance alerts

## Security Best Practices

1. **Never commit sensitive keys** to version control
   - Use `.env.local` for local development
   - Use Firebase Functions Config for production
   - Add `.env.local` to `.gitignore`

2. **Review security rules regularly**
   - Test rules using the Firebase Console Rules Playground
   - Use the Firebase Emulator to test rules locally

3. **Enable App Check** (recommended for production)
   - Protects backend resources from abuse
   - Go to Firebase Console → App Check

4. **Set up billing alerts**
   - Prevent unexpected charges
   - Firebase Console → Project Settings → Usage and Billing

5. **Use service account keys securely**
   - Store in secure location
   - Rotate periodically
   - Never expose in client-side code

## Troubleshooting

### "Permission Denied" Errors

- Check your Firestore/Storage security rules
- Ensure user is authenticated
- Verify the user has the correct permissions

### Functions Not Deploying

- Ensure you're on the Blaze plan
- Check `functions/package.json` for correct Node version
- Run `npm run build` in functions directory
- Check logs: `firebase functions:log`

### Emulators Not Starting

- Check if ports are already in use
- Kill existing processes: `lsof -ti:8080 | xargs kill`
- Clear emulator data: `firebase emulators:start --export-on-exit=./emulator-data`

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

## Next Steps

1. Set up CI/CD pipeline for automated deployments
2. Configure custom domain for hosting
3. Set up Firebase Analytics
4. Implement monitoring and alerting
5. Set up staging environment
