/**
 * Core Monitoring Engine - Worker
 * Executes individual scraping tasks from the queue
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { scrapeProductUrl } from "../scraping/scraper";
import { ScrapeTaskPayload, Product, AutomationAction } from "../../../shared/types/database";
import { handleProductRemoval } from "../ai-healing/auto-heal";
import { handlePriceChange } from "./price-handler";

/**
 * Worker function that executes a single scrape task
 * Triggered by Cloud Tasks queue
 */
export const executeScrape = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "512MB",
  })
  .https.onRequest(async (req, res) => {
    try {
      // Parse task payload
      const payload: ScrapeTaskPayload = req.body;
      const { productId, url, userId } = payload;

      if (!productId || !url || !userId) {
        res.status(400).send("Missing required parameters");
        return;
      }

      console.log(`Executing scrape for product: ${productId}, URL: ${url}`);

      const db = getFirestore();
      const productRef = db.collection("products").doc(productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        console.error(`Product ${productId} not found`);
        res.status(404).send("Product not found");
        return;
      }

      const product = { product_id: productDoc.id, ...productDoc.data() } as Product;

      // Execute the scrape
      const scrapeResult = await scrapeProductUrl(url);

      console.log(`Scrape result for ${productId}:`, {
        success: scrapeResult.success,
        statusCode: scrapeResult.statusCode,
        price: scrapeResult.price,
      });

      // Handle different scenarios
      if (scrapeResult.statusCode === 404 || !scrapeResult.success) {
        // Product removed or unavailable
        console.log(`Product ${productId} appears to be removed (404)`);
        await handleProductRemoval(productId, userId);
      } else if (scrapeResult.price && scrapeResult.price !== product.monitored_supplier.current_price) {
        // Price changed
        console.log(
          `Price changed for ${productId}: ${product.monitored_supplier.current_price} -> ${scrapeResult.price}`
        );
        await handlePriceChange(productId, userId, scrapeResult.price, product.monitored_supplier.current_price);
      } else {
        // No changes, just update last_checked
        console.log(`No changes detected for ${productId}`);
      }

      // Update product with scrape results
      const updateData: any = {
        "monitored_supplier.last_checked": FieldValue.serverTimestamp(),
      };

      if (scrapeResult.success) {
        if (scrapeResult.price) {
          updateData["monitored_supplier.current_price"] = scrapeResult.price;
        }
        if (scrapeResult.stock_level !== undefined) {
          updateData["monitored_supplier.stock_level"] = scrapeResult.stock_level;
        }
        if (scrapeResult.supplier_rating) {
          updateData["monitored_supplier.supplier_rating"] = scrapeResult.supplier_rating;
        }
        if (scrapeResult.shipping_method) {
          updateData["monitored_supplier.shipping_method"] = scrapeResult.shipping_method;
        }
      }

      await productRef.update(updateData);

      // Update analytics
      await db.collection("analytics").add({
        event_type: scrapeResult.statusCode === 404 ? "product_removed" : "scrape_completed",
        product_id: productId,
        user_id: userId,
        timestamp: FieldValue.serverTimestamp(),
        metadata: {
          statusCode: scrapeResult.statusCode,
          price: scrapeResult.price,
        },
      });

      res.status(200).send({ success: true, result: scrapeResult });
    } catch (error: any) {
      console.error("Worker error:", error);
      res.status(500).send({ success: false, error: error.message });
    }
  });
