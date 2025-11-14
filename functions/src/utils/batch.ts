/**
 * Batch processing utilities
 * Process large datasets efficiently with concurrency control
 */

/**
 * Process items in batches with concurrency control
 *
 * @param items - Array of items to process
 * @param processor - Function to process each item
 * @param batchSize - Number of items to process in parallel (default: 10)
 * @returns Array of results
 *
 * @example
 * const results = await batchProcess(
 *   imageUrls,
 *   async (url) => downloadImage(url),
 *   5 // Process 5 images at a time
 * );
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(
      `[Batch] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        items.length / batchSize
      )} (${batch.length} items)`
    );

    const batchResults = await Promise.all(
      batch.map((item, idx) => processor(item, i + idx))
    );

    results.push(...batchResults);
  }

  return results;
}

/**
 * Process items in batches with error handling
 */
export async function batchProcessWithErrors<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  batchSize: number = 10
): Promise<Array<{ success: boolean; result?: R; error?: Error; index: number }>> {
  const results: Array<{
    success: boolean;
    result?: R;
    error?: Error;
    index: number;
  }> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(
      `[Batch] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        items.length / batchSize
      )} (${batch.length} items)`
    );

    const batchResults = await Promise.allSettled(
      batch.map((item, idx) => processor(item, i + idx))
    );

    batchResults.forEach((result, idx) => {
      const index = i + idx;
      if (result.status === "fulfilled") {
        results.push({ success: true, result: result.value, index });
      } else {
        results.push({ success: false, error: result.reason, index });
      }
    });
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(
    `[Batch] Completed: ${successCount}/${items.length} successful (${Math.round(
      (successCount / items.length) * 100
    )}%)`
  );

  return results;
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

/**
 * Firestore batch write helper (max 500 operations per batch)
 */
import { getFirestore } from "firebase-admin/firestore";

export async function firestoreBatchWrite(
  operations: Array<{
    type: "set" | "update" | "delete";
    ref: FirebaseFirestore.DocumentReference;
    data?: any;
  }>
): Promise<void> {
  const db = getFirestore();
  const chunks = chunkArray(operations, 500); // Firestore limit

  for (let i = 0; i < chunks.length; i++) {
    const batch = db.batch();
    const chunk = chunks[i];

    console.log(
      `[Firestore Batch] Writing chunk ${i + 1}/${chunks.length} (${chunk.length} operations)`
    );

    chunk.forEach((operation) => {
      switch (operation.type) {
        case "set":
          batch.set(operation.ref, operation.data);
          break;
        case "update":
          batch.update(operation.ref, operation.data);
          break;
        case "delete":
          batch.delete(operation.ref);
          break;
      }
    });

    await batch.commit();
  }

  console.log(
    `[Firestore Batch] Completed ${operations.length} operations in ${chunks.length} batches`
  );
}

/**
 * Process with progress reporting
 */
export async function batchProcessWithProgress<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  batchSize: number = 10,
  onProgress?: (completed: number, total: number, percentage: number) => void
): Promise<R[]> {
  const results: R[] = [];
  const total = items.length;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((item, idx) => processor(item, i + idx))
    );

    results.push(...batchResults);

    const completed = Math.min(i + batchSize, total);
    const percentage = Math.round((completed / total) * 100);

    if (onProgress) {
      onProgress(completed, total, percentage);
    }

    console.log(`[Progress] ${completed}/${total} (${percentage}%)`);
  }

  return results;
}

/**
 * Rate-limited batch processing (respects API rate limits)
 */
export async function rateLimitedBatchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  requestsPerSecond: number = 10
): Promise<R[]> {
  const results: R[] = [];
  const delayMs = 1000 / requestsPerSecond;

  console.log(
    `[Rate Limited] Processing ${items.length} items at ${requestsPerSecond} req/s`
  );

  for (let i = 0; i < items.length; i++) {
    const result = await processor(items[i], i);
    results.push(result);

    // Wait before next request
    if (i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if ((i + 1) % 10 === 0) {
      console.log(`[Rate Limited] Progress: ${i + 1}/${items.length}`);
    }
  }

  return results;
}
