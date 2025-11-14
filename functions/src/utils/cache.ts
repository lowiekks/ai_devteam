/**
 * In-memory cache utility for Cloud Functions
 * Reduces redundant API calls and database queries
 * Uses global scope for persistence across warm starts
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get cached value if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      // Expired, remove from cache
      this.cache.delete(key);
      return null;
    }

    console.log(`[Cache] HIT: ${key} (age: ${Math.round(age / 1000)}s)`);
    return entry.data as T;
  }

  /**
   * Set cached value with TTL in milliseconds
   */
  set<T>(key: string, data: T, ttl: number = 300000): void {
    // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    console.log(
      `[Cache] SET: ${key} (ttl: ${Math.round(ttl / 1000)}s, size: ${
        this.cache.size
      })`
    );
  }

  /**
   * Delete cached value
   */
  delete(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`[Cache] DELETE: ${key}`);
    }
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[Cache] CLEAR: Removed ${size} entries`);
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Cache] CLEANUP: Removed ${removed} expired entries`);
    }
  }
}

// Global cache instance (persists across warm Cloud Function invocations)
const cache = new MemoryCache();

/**
 * Cached fetch wrapper
 * Caches HTTP GET requests
 */
export async function cachedFetch<T>(
  url: string,
  fetcher: () => Promise<T>,
  ttl: number = 300000 // 5 minutes default
): Promise<T> {
  const cacheKey = `fetch:${url}`;
  const cached = cache.get<T>(cacheKey);

  if (cached !== null) {
    return cached;
  }

  console.log(`[Cache] MISS: ${cacheKey}`);
  const data = await fetcher();
  cache.set(cacheKey, data, ttl);

  return data;
}

/**
 * Cached database query wrapper
 */
export async function cachedQuery<T>(
  queryKey: string,
  query: () => Promise<T>,
  ttl: number = 60000 // 1 minute default
): Promise<T> {
  const cacheKey = `query:${queryKey}`;
  const cached = cache.get<T>(cacheKey);

  if (cached !== null) {
    return cached;
  }

  console.log(`[Cache] MISS: ${cacheKey}`);
  const data = await query();
  cache.set(cacheKey, data, ttl);

  return data;
}

/**
 * Invalidate cache by key or pattern
 */
export function invalidateCache(keyOrPattern: string): void {
  const stats = cache.stats();

  if (keyOrPattern.includes("*")) {
    // Wildcard pattern
    const pattern = keyOrPattern.replace("*", "");
    let removed = 0;

    for (const key of stats.keys) {
      if (key.includes(pattern)) {
        cache.delete(key);
        removed++;
      }
    }

    console.log(`[Cache] Invalidated ${removed} entries matching: ${keyOrPattern}`);
  } else {
    // Exact key
    cache.delete(keyOrPattern);
  }
}

/**
 * Export cache instance for direct access
 */
export { cache };

/**
 * Cleanup expired cache entries periodically
 * Call this at the start of each Cloud Function
 */
export function cleanupExpiredCache(): void {
  cache.cleanup();
}
