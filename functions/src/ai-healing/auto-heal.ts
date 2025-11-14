/**
 * AI Auto-Healing System
 * Automatically finds and switches to new suppliers when products are removed
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { reverseImageSearch } from "./image-search";
import { vetSupplierWithAI } from "./ai-vetting";
import { updatePlatformStock } from "../platform-integration/platform-controller";
import { sendNotificationEmail } from "../utils/notifications";
import { hasPlugin } from "../ecosystem/plugin-marketplace";
import { Product, User, SupplierCandidate, AutomationLogEntry } from "../../../shared/types/database";

/**
 * Main auto-healing function
 * Called when a product is detected as removed/404
 */
export async function handleProductRemoval(productId: string, userId: string): Promise<void> {
  const db = getFirestore();
  const productRef = db.collection("products").doc(productId);
  const userRef = db.collection("users").doc(userId);

  try {
    console.log(`Starting auto-heal process for product: ${productId}`);

    const [productDoc, userDoc] = await Promise.all([productRef.get(), userRef.get()]);

    if (!productDoc.exists || !userDoc.exists) {
      throw new Error("Product or user not found");
    }

    const product = { product_id: productDoc.id, ...productDoc.data() } as Product;
    const user = userDoc.data() as User;

    // Step 1: Immediately mark as removed and set stock to 0
    console.log(`Step 1: Marking product ${productId} as REMOVED and setting stock to 0`);

    await productRef.update({
      "monitored_supplier.status": "REMOVED",
      automation_log: FieldValue.arrayUnion({
        action: "PRODUCT_REMOVED",
        timestamp: new Date(),
        details: "Supplier product removed or unavailable (404)",
      } as AutomationLogEntry),
    });

    // Update platform stock to prevent sales
    await updatePlatformStock(product.platform, product.platform_id, user.platforms, 0);

    // Step 2: Check if user has Auto-Healer plugin installed
    const hasAutoHealerPlugin = await hasPlugin(userId, "auto_healer");

    if (!hasAutoHealerPlugin) {
      console.log(`Auto-Healer plugin not installed for user ${userId}`);
      await sendAlertEmail(product, user, "Auto-Healer plugin required for automatic replacement");
      return;
    }

    // Step 3: Check if auto-replace is enabled in settings
    if (!user.settings.auto_replace) {
      console.log(`Auto-replace disabled for user ${userId}, sending alert email`);
      await sendAlertEmail(product, user);
      return;
    }

    console.log(`Step 2: Auto-replace enabled, starting AI recovery`);

    // Step 3: Reverse image search to find alternatives
    const originalImage = product.original_image_url;
    const candidates = await reverseImageSearch(originalImage);

    console.log(`Step 3: Found ${candidates.length} potential supplier candidates`);

    if (candidates.length === 0) {
      console.log("No candidates found, sending alert email");
      await sendAlertEmail(product, user, "No alternative suppliers found");
      return;
    }

    // Step 4: Filter and vet candidates
    const bestMatch = await findBestMatch(candidates, product, user);

    if (!bestMatch) {
      console.log("No suitable match found after vetting, sending alert email");
      await sendAlertEmail(product, user, "No suitable alternative suppliers found");
      return;
    }

    console.log(`Step 4: Best match found: ${bestMatch.url}`);

    // Step 5: Automatically swap the supplier
    console.log(`Step 5: Swapping to new supplier`);

    await productRef.update({
      "monitored_supplier.url": bestMatch.url,
      "monitored_supplier.status": "ACTIVE",
      "monitored_supplier.current_price": bestMatch.price,
      "monitored_supplier.supplier_rating": bestMatch.rating,
      "monitored_supplier.shipping_method": bestMatch.shipping_method,
      "ai_insights.image_match_confidence": bestMatch.image_match_confidence,
      automation_log: FieldValue.arrayUnion({
        action: "AUTO_HEAL",
        old_value: product.monitored_supplier.url,
        new_value: bestMatch.url,
        timestamp: new Date(),
        details: `Automatically switched to new supplier. Confidence: ${bestMatch.image_match_confidence}%, Rating: ${bestMatch.rating}`,
      } as AutomationLogEntry),
    });

    // Step 6: Restore stock on platform
    await updatePlatformStock(product.platform, product.platform_id, user.platforms, 999);

    console.log(`Auto-heal successful for product ${productId}`);

    // Send success notification
    if (user.settings.notification_email) {
      await sendNotificationEmail({
        to: user.settings.notification_email,
        subject: `✅ Product Automatically Restored`,
        body: `
          <h2>Auto-Heal Success!</h2>
          <p>Product: ${product.name}</p>
          <p>Your product was automatically restored with a new supplier.</p>
          <h3>New Supplier Details:</h3>
          <ul>
            <li>Price: $${bestMatch.price.toFixed(2)}</li>
            <li>Rating: ${bestMatch.rating}/5.0</li>
            <li>Match Confidence: ${bestMatch.image_match_confidence}%</li>
            <li>Shipping: ${bestMatch.shipping_method}</li>
          </ul>
          <p><a href="${bestMatch.url}">View New Supplier</a></p>
          <p><a href="https://yourdashboard.com/products/${productId}">View in Dashboard</a></p>
        `,
      });
    }

    // Log analytics
    await db.collection("analytics").add({
      event_type: "auto_heal_success",
      product_id: productId,
      user_id: userId,
      timestamp: FieldValue.serverTimestamp(),
      metadata: {
        old_supplier: product.monitored_supplier.url,
        new_supplier: bestMatch.url,
        confidence: bestMatch.image_match_confidence,
        price_difference: bestMatch.price - product.monitored_supplier.current_price,
      },
    });
  } catch (error) {
    console.error("Auto-heal error:", error);

    // Log failed attempt
    await db.collection("analytics").add({
      event_type: "auto_heal_failed",
      product_id: productId,
      user_id: userId,
      timestamp: FieldValue.serverTimestamp(),
      metadata: {
        error: (error as Error).message,
      },
    });

    throw error;
  }
}

/**
 * Find the best matching supplier from candidates
 */
async function findBestMatch(
  candidates: SupplierCandidate[],
  product: Product,
  user: User
): Promise<SupplierCandidate | null> {
  const minRating = user.settings.min_supplier_rating || 4.5;
  const maxPriceVariance = user.settings.max_price_variance || 10;
  const maxAcceptablePrice = product.monitored_supplier.current_price * (1 + maxPriceVariance / 100);

  // Filter candidates based on user settings
  let qualifiedCandidates = candidates.filter((candidate) => {
    const meetsRating = candidate.rating >= minRating;
    const meetsPrice = candidate.price <= maxAcceptablePrice;
    const meetsConfidence = candidate.image_match_confidence >= 85;
    const hasTracking = candidate.shipping_method.toLowerCase().includes("tracking") ||
                        candidate.shipping_method.toLowerCase().includes("epacket");

    return meetsRating && meetsPrice && meetsConfidence && hasTracking;
  });

  if (qualifiedCandidates.length === 0) {
    console.log("No candidates meet the qualification criteria");
    return null;
  }

  console.log(`${qualifiedCandidates.length} candidates meet basic criteria`);

  // Vet top 3 candidates with AI
  const topCandidates = qualifiedCandidates
    .sort((a, b) => {
      // Sort by: confidence * rating / price (value score)
      const scoreA = (a.image_match_confidence * a.rating) / a.price;
      const scoreB = (b.image_match_confidence * b.rating) / b.price;
      return scoreB - scoreA;
    })
    .slice(0, 3);

  console.log(`Vetting top ${topCandidates.length} candidates with AI`);

  for (const candidate of topCandidates) {
    const vetResult = await vetSupplierWithAI(candidate, product);

    if (vetResult.approved) {
      console.log(`AI approved candidate: ${candidate.url}`);
      return candidate;
    }

    console.log(`AI rejected candidate: ${candidate.url}. Reason: ${vetResult.reason}`);
  }

  return null;
}

/**
 * Send alert email to user
 */
async function sendAlertEmail(product: Product, user: User, additionalInfo?: string): Promise<void> {
  if (!user.settings.notification_email) {
    return;
  }

  await sendNotificationEmail({
    to: user.settings.notification_email,
    subject: `⚠️ Product Removed - Action Required`,
    body: `
      <h2>Product Supplier Removed</h2>
      <p>Product: ${product.name}</p>
      <p>Your supplier has removed this product or it's no longer available.</p>
      ${additionalInfo ? `<p><strong>${additionalInfo}</strong></p>` : ""}
      <p>The product has been automatically set to out of stock to prevent sales.</p>
      <p><a href="https://yourdashboard.com/products/${product.product_id}">View Product in Dashboard</a></p>
      <hr>
      <p><small>To enable automatic supplier replacement, turn on Auto-Replace in your settings.</small></p>
    `,
  });
}
