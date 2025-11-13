# Stripe Plugin Billing Setup Guide

Complete guide for setting up Stripe billing for the Plugin Marketplace.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Stripe Account Setup](#stripe-account-setup)
3. [Create Products & Prices](#create-products--prices)
4. [Configure Webhooks](#configure-webhooks)
5. [Update Backend Code](#update-backend-code)
6. [Update Frontend Code](#update-frontend-code)
7. [Testing](#testing)

---

## Prerequisites

- Stripe account (sign up at https://stripe.com)
- Firebase project deployed
- Vercel dashboard deployed

---

## Stripe Account Setup

### 1. Create Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Complete account verification
3. Get your API keys:
   - Go to Developers → API keys
   - Copy **Publishable key** (starts with `pk_`)
   - Copy **Secret key** (starts with `sk_`)

### 2. Install Stripe SDK

```bash
cd functions
npm install stripe
cd ../dashboard
npm install @stripe/stripe-js stripe
```

---

## Create Products & Prices

### Option A: Using Stripe Dashboard (Recommended for beginners)

1. Go to https://dashboard.stripe.com/products
2. Click "Add product" for each plugin:

**Product 1: AI Auto-Healer**
```
Name: AI Auto-Healer
Description: Automatic supplier replacement when products go out of stock
Pricing: Recurring
Price: $10.00 USD / month
Price ID: (copy this - starts with price_)
Product ID: auto_healer (set in metadata)
```

**Product 2: SEO Blog Writer**
```
Name: SEO Blog Generator
Description: Auto-generate SEO-optimized blog posts
Pricing: Recurring
Price: $15.00 USD / month
Price ID: (copy this)
Product ID: seo_blog_writer (set in metadata)
```

**Product 3: Review Importer**
```
Name: Review Importer
Description: Import customer reviews from AliExpress
Pricing: Recurring
Price: $5.00 USD / month
Price ID: (copy this)
Product ID: review_importer (set in metadata)
```

**Product 4: Social Auto-Poster**
```
Name: Social Auto-Poster
Description: Auto-post products to Instagram and Facebook
Pricing: Recurring
Price: $12.00 USD / month
Price ID: (copy this)
Product ID: social_auto_poster (set in metadata)
```

**Product 5: Trend Hunter Pro**
```
Name: Trend Hunter Pro
Description: Advanced trend analytics and alerts
Pricing: Recurring
Price: $20.00 USD / month
Price ID: (copy this)
Product ID: trend_hunter_pro (set in metadata)
```

**Product 6: Dynamic Pricing AI**
```
Name: Dynamic Pricing AI
Description: Automatic price optimization based on competition
Pricing: Recurring
Price: $18.00 USD / month
Price ID: (copy this)
Product ID: dynamic_pricing_ai (set in metadata)
```

### Option B: Using Stripe CLI (Recommended for automation)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe
# or
curl -L https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_amd64.tar.gz | tar -xz

# Login
stripe login

# Create products
stripe products create \
  --name="AI Auto-Healer" \
  --description="Automatic supplier replacement when products go out of stock" \
  --metadata[plugin_id]=auto_healer

# Copy the product ID (prod_xxx)

# Create price for the product
stripe prices create \
  --product=prod_xxx \
  --unit-amount=1000 \
  --currency=usd \
  --recurring[interval]=month

# Copy the price ID (price_xxx)

# Repeat for all 6 plugins
```

### Option C: Using Node.js Script

Create `scripts/create-stripe-products.ts`:

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const plugins = [
  {
    plugin_id: 'auto_healer',
    name: 'AI Auto-Healer',
    description: 'Automatic supplier replacement when products go out of stock',
    price: 1000, // $10.00 in cents
  },
  {
    plugin_id: 'seo_blog_writer',
    name: 'SEO Blog Generator',
    description: 'Auto-generate SEO-optimized blog posts',
    price: 1500,
  },
  {
    plugin_id: 'review_importer',
    name: 'Review Importer',
    description: 'Import customer reviews from AliExpress',
    price: 500,
  },
  {
    plugin_id: 'social_auto_poster',
    name: 'Social Auto-Poster',
    description: 'Auto-post products to Instagram and Facebook',
    price: 1200,
  },
  {
    plugin_id: 'trend_hunter_pro',
    name: 'Trend Hunter Pro',
    description: 'Advanced trend analytics and alerts',
    price: 2000,
  },
  {
    plugin_id: 'dynamic_pricing_ai',
    name: 'Dynamic Pricing AI',
    description: 'Automatic price optimization based on competition',
    price: 1800,
  },
];

async function createProducts() {
  for (const plugin of plugins) {
    // Create product
    const product = await stripe.products.create({
      name: plugin.name,
      description: plugin.description,
      metadata: {
        plugin_id: plugin.plugin_id,
      },
    });

    console.log(`Created product: ${product.id} (${plugin.name})`);

    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plugin.price,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
    });

    console.log(`Created price: ${price.id} ($${plugin.price / 100}/month)`);
    console.log('---');
  }
}

createProducts().catch(console.error);
```

Run:
```bash
STRIPE_SECRET_KEY=sk_test_xxx npx ts-node scripts/create-stripe-products.ts
```

---

## Configure Webhooks

### 1. Create Webhook Endpoint

In Stripe Dashboard → Developers → Webhooks:

**Endpoint URL:**
```
https://your-domain.vercel.app/api/stripe/webhook
```

**Events to send:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `checkout.session.completed`

**Copy the webhook signing secret** (starts with `whsec_`)

### 2. Test Webhook Locally

```bash
# Forward Stripe events to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In another terminal, trigger test event
stripe trigger customer.subscription.created
```

---

## Update Backend Code

### 1. Update Plugin Types

Update `shared/types/plugins.ts`:

```typescript
export const BUILTIN_PLUGINS: Omit<Plugin, "created_at" | "updated_at" | "installs">[] = [
  {
    plugin_id: "auto_healer",
    name: "AI Auto-Healer",
    description: "Automatic supplier replacement when products go out of stock",
    category: "automation",
    monthly_cost: 10,
    features: [
      "Automatic supplier replacement",
      "AI-powered supplier vetting",
      "Zero downtime product swaps",
      "Email alerts for critical changes"
    ],
    cloud_function_trigger: "handleProductRemoval",
    enabled: true,
    stripe_price_id: "price_1ABC123...", // Add your Stripe price ID here
  },
  {
    plugin_id: "seo_blog_writer",
    name: "SEO Blog Generator",
    description: "Auto-generate SEO-optimized blog posts for your products",
    category: "marketing",
    monthly_cost: 15,
    features: [
      "Auto-generate blog posts",
      "Product comparison articles",
      "Best-of lists",
      "How-to guides",
      "Automatic internal linking"
    ],
    cloud_function_trigger: "generateProductBlog",
    enabled: true,
    stripe_price_id: "price_2ABC123...", // Add your Stripe price ID here
  },
  // ... add stripe_price_id for all plugins
];
```

### 2. Update Plugin Marketplace Functions

Update `functions/src/ecosystem/plugin-marketplace.ts`:

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export const installPlugin = functions.https.onCall(async (data, context) => {
  const { pluginId } = data;
  const userId = context.auth?.uid;

  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const db = getFirestore();

  // Get user data
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();

  if (!userData) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  // Get plugin data
  const pluginDoc = await db.collection('plugins').doc(pluginId).get();
  const plugin = pluginDoc.data() as Plugin;

  if (!plugin || !plugin.enabled) {
    throw new functions.https.HttpsError('not-found', 'Plugin not found or disabled');
  }

  // Check if already installed
  const existingPlugin = await db
    .collection('user_plugins')
    .where('user_id', '==', userId)
    .where('plugin_id', '==', pluginId)
    .where('status', '==', 'active')
    .get();

  if (!existingPlugin.empty) {
    throw new functions.https.HttpsError('already-exists', 'Plugin already installed');
  }

  // Create or retrieve Stripe customer
  let customerId = userData.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.email,
      name: userData.display_name || userData.email,
      metadata: {
        userId: userId,
        firebase_uid: userId,
      },
    });

    customerId = customer.id;

    // Save customer ID to user document
    await db.collection('users').doc(userId).update({
      stripe_customer_id: customerId,
    });
  }

  // Create Stripe subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price: plugin.stripe_price_id,
      },
    ],
    metadata: {
      userId: userId,
      pluginId: plugin.plugin_id,
    },
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });

  // Save user plugin record
  const userPluginRef = await db.collection('user_plugins').add({
    user_id: userId,
    plugin_id: plugin.plugin_id,
    installed_at: FieldValue.serverTimestamp(),
    status: 'active',
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
  });

  // Add to user's active plugins
  await db.collection('users').doc(userId).update({
    active_plugins: FieldValue.arrayUnion(plugin.plugin_id),
  });

  // Increment install count
  await db.collection('plugins').doc(pluginId).update({
    installs: FieldValue.increment(1),
  });

  // Get client secret for payment
  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

  return {
    success: true,
    subscriptionId: subscription.id,
    clientSecret: paymentIntent?.client_secret,
    userPluginId: userPluginRef.id,
  };
});

export const uninstallPlugin = functions.https.onCall(async (data, context) => {
  const { pluginId } = data;
  const userId = context.auth?.uid;

  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const db = getFirestore();

  // Get user plugin record
  const userPluginQuery = await db
    .collection('user_plugins')
    .where('user_id', '==', userId)
    .where('plugin_id', '==', pluginId)
    .where('status', '==', 'active')
    .get();

  if (userPluginQuery.empty) {
    throw new functions.https.HttpsError('not-found', 'Plugin not installed');
  }

  const userPluginDoc = userPluginQuery.docs[0];
  const userPluginData = userPluginDoc.data();

  // Cancel Stripe subscription
  if (userPluginData.stripe_subscription_id) {
    await stripe.subscriptions.cancel(userPluginData.stripe_subscription_id);
  }

  // Update user plugin status
  await userPluginDoc.ref.update({
    status: 'cancelled',
    uninstalled_at: FieldValue.serverTimestamp(),
  });

  // Remove from user's active plugins
  await db.collection('users').doc(userId).update({
    active_plugins: FieldValue.arrayRemove(pluginId),
  });

  // Decrement install count
  await db.collection('plugins').doc(pluginId).update({
    installs: FieldValue.increment(-1),
  });

  return { success: true };
});
```

### 3. Create Webhook Handler

Create `functions/src/ecosystem/stripe-webhook.ts`:

```typescript
import * as functions from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export const handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    res.status(500).send('Webhook secret not configured');
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const db = getFirestore();

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.userId;
      const pluginId = subscription.metadata.pluginId;

      if (userId && pluginId) {
        // Update user plugin status
        const userPluginQuery = await db
          .collection('user_plugins')
          .where('user_id', '==', userId)
          .where('plugin_id', '==', pluginId)
          .get();

        if (!userPluginQuery.empty) {
          await userPluginQuery.docs[0].ref.update({
            status: subscription.status,
            stripe_status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
          });
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.userId;
      const pluginId = subscription.metadata.pluginId;

      if (userId && pluginId) {
        // Mark plugin as cancelled
        const userPluginQuery = await db
          .collection('user_plugins')
          .where('user_id', '==', userId)
          .where('plugin_id', '==', pluginId)
          .get();

        if (!userPluginQuery.empty) {
          await userPluginQuery.docs[0].ref.update({
            status: 'cancelled',
            stripe_status: 'canceled',
            uninstalled_at: FieldValue.serverTimestamp(),
          });
        }

        // Remove from active plugins
        await db.collection('users').doc(userId).update({
          active_plugins: FieldValue.arrayRemove(pluginId),
        });
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`Payment succeeded for invoice ${invoice.id}`);
      // TODO: Send receipt email
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`Payment failed for invoice ${invoice.id}`);
      // TODO: Send payment failure email
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});
```

Export in `functions/src/index.ts`:

```typescript
export { handleStripeWebhook } from './ecosystem/stripe-webhook';
```

### 4. Set Environment Variables

```bash
firebase functions:config:set \
  stripe.secret_key="sk_test_..." \
  stripe.publishable_key="pk_test_..." \
  stripe.webhook_secret="whsec_..."
```

---

## Update Frontend Code

### 1. Create Stripe Context

Create `dashboard/lib/stripe.ts`:

```typescript
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    );
  }
  return stripePromise;
};
```

### 2. Update Plugin Card Component

Update `dashboard/components/PluginCard.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { getStripe } from '@/lib/stripe';
import { getFunctions, httpsCallable } from 'firebase/functions';

export function PluginCard({ plugin, isInstalled, onInstallComplete }) {
  const [loading, setLoading] = useState(false);

  const handleInstall = async () => {
    setLoading(true);
    try {
      const functions = getFunctions();
      const installPlugin = httpsCallable(functions, 'installPlugin');

      const result = await installPlugin({ pluginId: plugin.plugin_id });
      const { clientSecret, subscriptionId } = result.data as any;

      // Redirect to Stripe Checkout or use Stripe Elements
      const stripe = await getStripe();
      if (!stripe) throw new Error('Stripe not loaded');

      const { error } = await stripe.confirmCardPayment(clientSecret);

      if (error) {
        console.error('Payment failed:', error);
        alert('Payment failed: ' + error.message);
      } else {
        // Payment succeeded
        onInstallComplete?.();
        alert('Plugin installed successfully!');
      }
    } catch (error: any) {
      console.error('Install error:', error);
      alert('Failed to install plugin: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-6">
      <h3>{plugin.name}</h3>
      <p>{plugin.description}</p>
      <p className="font-bold">${plugin.monthly_cost}/month</p>

      {isInstalled ? (
        <button disabled className="opacity-50">
          Installed
        </button>
      ) : (
        <button
          onClick={handleInstall}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'Processing...' : `Install - $${plugin.monthly_cost}/mo`}
        </button>
      )}
    </div>
  );
}
```

### 3. Create Webhook API Route

Create `dashboard/app/api/stripe/webhook/route.ts`:

```typescript
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Forward to Firebase function or handle here
  console.log('Received event:', event.type);

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## Testing

### 1. Test in Development

```bash
# Terminal 1: Run Stripe webhook forwarding
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# Terminal 2: Run dashboard
cd dashboard
npm run dev

# Terminal 3: Run functions emulator
cd functions
npm run serve
```

### 2. Test Plugin Installation

1. Go to http://localhost:3000/marketplace
2. Click "Install" on a plugin
3. Use test card: `4242 4242 4242 4242`
4. Expiry: Any future date
5. CVC: Any 3 digits
6. Verify subscription created in Stripe Dashboard

### 3. Test Webhook Events

```bash
# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

### 4. Test Subscription Cancellation

1. Go to installed plugins
2. Click "Uninstall"
3. Verify subscription cancelled in Stripe Dashboard
4. Verify plugin removed from user's active_plugins

---

## Going Live

### 1. Switch to Live Mode

1. In Stripe Dashboard, toggle from "Test mode" to "Live mode"
2. Get new live API keys
3. Create new products in live mode
4. Create new webhook endpoint for production URL

### 2. Update Environment Variables

```bash
# Production environment
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Activate Stripe Account

Complete Stripe account verification:
- Business details
- Bank account information
- Identity verification

---

## Monitoring

### Track Key Metrics

1. **MRR (Monthly Recurring Revenue)**
   - Track in Stripe Dashboard → Reports
   - Monitor growth trends

2. **Churn Rate**
   - Track subscription cancellations
   - Set up alerts for high churn

3. **Failed Payments**
   - Monitor failed payments
   - Set up retry logic and dunning emails

### Set Up Alerts

```typescript
// Send alert on failed payment
case 'invoice.payment_failed': {
  // Send email to user
  // Notify admin
  // Retry payment after 3 days
}
```

---

## Troubleshooting

### Payment Fails Silently

- Check webhook is receiving events
- Verify webhook signature
- Check Stripe logs for errors

### Subscription Not Creating

- Verify price ID is correct
- Check customer ID is valid
- Review Stripe Dashboard logs

### Webhook Not Receiving Events

- Verify endpoint URL is correct
- Check webhook signing secret
- Test with Stripe CLI

---

**Stripe integration complete! 🎉**

Your plugin marketplace is now ready to accept payments.
