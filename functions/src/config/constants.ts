/**
 * Application Constants
 * Centralized configuration values
 */

// API Rate Limits (requests per minute)
export const RATE_LIMITS = {
  IMPORT_PRODUCT: 10,
  GET_PRODUCTS: 30,
  UPDATE_PRODUCT: 20,
  PUBLISH_PRODUCT: 5,
  DELETE_PRODUCT: 10,
} as const;

// Image Processing
export const IMAGE_CONFIG = {
  MAX_WIDTH: 1200,
  MAX_HEIGHT: 1200,
  JPEG_QUALITY: 85,
  WEBP_QUALITY: 80,
  MAX_IMAGES_PER_PRODUCT: 6,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

// Retry Configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 30000, // 30 seconds
  BACKOFF_MULTIPLIER: 2,
} as const;

// Cache TTL (milliseconds)
export const CACHE_TTL = {
  SHORT: 60000, // 1 minute
  MEDIUM: 300000, // 5 minutes
  LONG: 3600000, // 1 hour
  VERY_LONG: 86400000, // 24 hours
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
} as const;

// Pricing
export const PRICING_CONFIG = {
  DEFAULT_PROFIT_MARGIN: 50, // 50%
  COMPARE_AT_MULTIPLIER: 1.3, // 30% higher for "sale" effect
} as const;

// AI Processing
export const AI_CONFIG = {
  GEMINI_MODEL: "gemini-pro",
  MAX_TITLE_LENGTH: 70,
  MIN_DESCRIPTION_WORDS: 200,
  MAX_DESCRIPTION_WORDS: 300,
  MIN_FEATURES: 5,
  MAX_FEATURES: 7,
  MIN_TAGS: 8,
  MAX_TAGS: 12,
} as const;

// Platform API Versions
export const PLATFORM_VERSIONS = {
  SHOPIFY: "2024-01",
  WOOCOMMERCE: "wc/v3",
} as const;

// Status Values
export const PRODUCT_STATUS = {
  PENDING: "PENDING",
  ENHANCING: "ENHANCING",
  READY: "READY",
  PUBLISHED: "PUBLISHED",
  FAILED: "FAILED",
} as const;

export const IMPORT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

// Collection Names
export const COLLECTIONS = {
  USERS: "users",
  RAW_PRODUCTS: "raw_products",
  ENHANCED_PRODUCTS: "enhanced_products",
  ACTIVITY_LOGS: "activity_logs",
  PERFORMANCE_METRICS: "performance_metrics",
  FUNCTION_STATS: "function_stats",
  ERROR_LOGS: "error_logs",
  USER_USAGE: "user_usage",
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHENTICATED: "Must be authenticated",
  UNAUTHORIZED: "Not authorized to perform this action",
  NOT_FOUND: "Resource not found",
  INVALID_URL: "Invalid URL format",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded. Please try again later",
  PLATFORM_NOT_CONFIGURED: "Platform integration not configured",
  INVALID_ARGUMENT: "Invalid argument provided",
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  PRODUCT_IMPORTED: "Product imported successfully",
  PRODUCT_ENHANCED: "Product enhanced successfully",
  PRODUCT_UPDATED: "Product updated successfully",
  PRODUCT_PUBLISHED: "Product published successfully",
  PRODUCT_DELETED: "Product deleted successfully",
} as const;

// Monitoring Thresholds
export const MONITORING = {
  ERROR_RATE_THRESHOLD: 0.1, // 10%
  SLOW_FUNCTION_THRESHOLD: 5000, // 5 seconds
  ALERT_EMAIL: "admin@example.com",
} as const;

// Development Mode
export const IS_DEV = process.env.NODE_ENV !== "production";
export const IS_EMULATOR =
  process.env.FUNCTIONS_EMULATOR === "true" ||
  process.env.FIRESTORE_EMULATOR_HOST !== undefined;
