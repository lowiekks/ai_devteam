/**
 * Price Change Handler
 * Handles logic when supplier prices change
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { AutomationLogEntry } from "../../../shared/types/database";
import { sendNotificationEmail } from "../utils/notifications";

export async function handlePriceChange(
  productId: string,
  userId: string,
  newPrice: number,
  oldPrice: number
): Promise<void> {
  const db = getFirestore();
  const productRef = db.collection("products").doc(productId);
  const userRef = db.collection("users").doc(userId);

  try {
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    const priceChangePercent = ((newPrice - oldPrice) / oldPrice) * 100;

    console.log(`Price changed by ${priceChangePercent.toFixed(2)}% for product ${productId}`);

    // Update product status
    await productRef.update({
      "monitored_supplier.current_price": newPrice,
      "monitored_supplier.status": "PRICE_CHANGED",
      automation_log: FieldValue.arrayUnion({
        action: "PRICE_UPDATE",
        old_value: oldPrice,
        new_value: newPrice,
        timestamp: new Date(),
        details: `Price ${priceChangePercent > 0 ? "increased" : "decreased"} by ${Math.abs(priceChangePercent).toFixed(2)}%`,
      } as AutomationLogEntry),
    });

    // Check if price variance exceeds threshold
    const maxVariance = userData?.settings?.max_price_variance || 10;

    if (Math.abs(priceChangePercent) > maxVariance) {
      console.log(`Price variance (${priceChangePercent.toFixed(2)}%) exceeds threshold (${maxVariance}%)`);

      // Send alert
      if (userData?.settings?.notification_email) {
        await sendNotificationEmail({
          to: userData.settings.notification_email,
          subject: `⚠️ Significant Price Change Alert`,
          body: `
            <h2>Price Change Detected</h2>
            <p>Product: ${productId}</p>
            <p>Old Price: $${oldPrice.toFixed(2)}</p>
            <p>New Price: $${newPrice.toFixed(2)}</p>
            <p>Change: ${priceChangePercent > 0 ? "+" : ""}${priceChangePercent.toFixed(2)}%</p>
            <p>This exceeds your threshold of ${maxVariance}%.</p>
            <p><a href="https://yourdashboard.com/products/${productId}">View Product</a></p>
          `,
        });
      }
    }

    // Log analytics
    await db.collection("analytics").add({
      event_type: "price_changed",
      product_id: productId,
      user_id: userId,
      timestamp: FieldValue.serverTimestamp(),
      metadata: {
        old_price: oldPrice,
        new_price: newPrice,
        change_percent: priceChangePercent,
      },
    });
  } catch (error) {
    console.error("Error handling price change:", error);
    throw error;
  }
}
