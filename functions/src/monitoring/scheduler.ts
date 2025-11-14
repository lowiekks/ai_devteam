/**
 * Core Monitoring Engine - Scheduler
 * Runs every hour and enqueues scraping tasks
 */

import * as functions from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import { CloudTasksClient } from "@google-cloud/tasks";
import { config } from "../config/environment";
import { Product } from "../../../shared/types/database";

const tasksClient = new CloudTasksClient();

/**
 * Scheduled function that runs every hour
 * Queues all active products for scraping
 */
export const scheduleScrapes = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "1GB",
  })
  .pubsub.schedule("every 1 hours")
  .onRun(async (context) => {
    const db = getFirestore();
    const queuePath = tasksClient.queuePath(
      config.projectId,
      config.location,
      config.cloudTasks.queueName
    );

    functions.logger.info("Starting scheduled scrape job...");

    try {
      // Fetch all active products that need monitoring
      const productsSnapshot = await db
        .collection("products")
        .where("monitored_supplier.status", "in", ["ACTIVE", "PRICE_CHANGED"])
        .get();

      functions.logger.info(`Found ${productsSnapshot.size} products to monitor`);

      let queuedCount = 0;
      const batchSize = 50;
      const batches: Product[][] = [];

      // Split products into batches
      let currentBatch: Product[] = [];
      productsSnapshot.forEach((doc) => {
        const product = { product_id: doc.id, ...doc.data() } as Product;
        currentBatch.push(product);

        if (currentBatch.length >= batchSize) {
          batches.push(currentBatch);
          currentBatch = [];
        }
      });
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }

      // Process each batch
      for (const batch of batches) {
        const promises = batch.map(async (product) => {
          try {
            const payload = {
              productId: product.product_id,
              url: product.monitored_supplier.url,
              userId: product.user_id,
            };

            // Create Cloud Task
            const task = {
              httpRequest: {
                httpMethod: "POST" as const,
                url: config.cloudTasks.scraperWorkerUrl,
                headers: {
                  "Content-Type": "application/json",
                },
                body: Buffer.from(JSON.stringify(payload)).toString("base64"),
              },
            };

            await tasksClient.createTask({
              parent: queuePath,
              task: task,
            });

            queuedCount++;
          } catch (error) {
            functions.logger.error(`Failed to queue task for product ${product.product_id}`, { error });
          }
        });

        await Promise.all(promises);

        // Small delay between batches to avoid rate limits
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      functions.logger.info(`Successfully queued ${queuedCount} scraping tasks`);

      // Log analytics
      await db.collection("system_metrics").add({
        event: "scheduled_scrape",
        products_queued: queuedCount,
        timestamp: new Date(),
      });

      return { success: true, queuedTasks: queuedCount };
    } catch (error) {
      functions.logger.error("Scheduler error", { error });
      throw error;
    }
  });

/**
 * Manual trigger for immediate scraping (useful for testing)
 */
export const triggerManualScrape = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { productId } = data;
  if (!productId) {
    throw new functions.https.HttpsError("invalid-argument", "productId is required");
  }

  const db = getFirestore();
  const productDoc = await db.collection("products").doc(productId).get();

  if (!productDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Product not found");
  }

  const product = productDoc.data() as Product;

  // Verify ownership
  if (product.user_id !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not authorized");
  }

  const queuePath = tasksClient.queuePath(
    config.projectId,
    config.location,
    config.cloudTasks.queueName
  );

  const payload = {
    productId: product.product_id,
    url: product.monitored_supplier.url,
    userId: product.user_id,
  };

  const task = {
    httpRequest: {
      httpMethod: "POST" as const,
      url: config.cloudTasks.scraperWorkerUrl,
      headers: {
        "Content-Type": "application/json",
      },
      body: Buffer.from(JSON.stringify(payload)).toString("base64"),
    },
  };

  await tasksClient.createTask({
    parent: queuePath,
    task: task,
  });

  return { success: true, message: "Scrape task queued" };
});
