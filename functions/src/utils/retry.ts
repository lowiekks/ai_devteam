/**
 * Retry utility with exponential backoff
 * Reusable across all Cloud Functions
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  onRetry: () => {},
};

/**
 * Sleep utility
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 *
 * @example
 * const result = await withRetry(
 *   async () => fetchFromAPI(),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt === opts.maxRetries) {
        console.error(
          `[Retry] Failed after ${opts.maxRetries + 1} attempts:`,
          error.message
        );
        throw error;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        console.error("[Retry] Non-retryable error:", error.message);
        throw error;
      }

      console.log(
        `[Retry] Attempt ${attempt + 1}/${opts.maxRetries + 1} failed: ${
          error.message
        }. Retrying in ${delay}ms...`
      );

      opts.onRetry(error, attempt + 1);

      await sleep(delay);

      // Exponential backoff with max delay cap
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
    return true;
  }

  // HTTP status codes that are retryable
  if (error.response?.status) {
    const status = error.response.status;
    return (
      status === 408 || // Request Timeout
      status === 429 || // Too Many Requests
      status === 500 || // Internal Server Error
      status === 502 || // Bad Gateway
      status === 503 || // Service Unavailable
      status === 504 // Gateway Timeout
    );
  }

  // Firestore errors
  if (error.code === "unavailable" || error.code === "deadline-exceeded") {
    return true;
  }

  // Default: retry unless explicitly non-retryable
  return true;
}

/**
 * Retry with jitter to prevent thundering herd
 */
export async function withRetryJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(fn, {
    ...options,
    onRetry: (error, attempt) => {
      // Add random jitter (0-50% of delay)
      const jitter = Math.random() * 0.5;
      sleep(options.initialDelay! * jitter);
      options.onRetry?.(error, attempt);
    },
  });
}

/**
 * Batch retry - retry multiple operations with exponential backoff
 */
export async function batchRetry<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<{ success: boolean; data?: T; error?: Error }>> {
  const results = await Promise.allSettled(
    operations.map((op) => withRetry(op, options))
  );

  return results.map((result) => {
    if (result.status === "fulfilled") {
      return { success: true, data: result.value };
    } else {
      return { success: false, error: result.reason };
    }
  });
}
