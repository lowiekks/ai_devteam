/**
 * Input validation utilities
 * Prevents injection attacks and ensures data integrity
 */

import * as functions from "firebase-functions";

/**
 * Validate required fields exist
 */
export function validateRequired(
  data: any,
  requiredFields: string[]
): void {
  const missing = requiredFields.filter((field) => !data[field]);

  if (missing.length > 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Missing required fields: ${missing.join(", ")}`
    );
  }
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize string input (prevent XSS)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min: number = 0,
  max: number = 10000
): void {
  if (value.length < min || value.length > max) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `String length must be between ${min} and ${max} characters`
    );
  }
}

/**
 * Validate number range
 */
export function validateRange(
  value: number,
  min: number,
  max: number
): void {
  if (value < min || value > max) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Value must be between ${min} and ${max}`
    );
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string,
  allowedValues: T[]
): value is T {
  if (!allowedValues.includes(value as T)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Value must be one of: ${allowedValues.join(", ")}`
    );
  }
  return true;
}

/**
 * Validate platform type
 */
export function validatePlatform(
  platform: string
): platform is "shopify" | "woocommerce" | "aliexpress" {
  return validateEnum(platform, ["shopify", "woocommerce", "aliexpress"]);
}

/**
 * Validate product status
 */
export function validateStatus(
  status: string
): status is "PENDING" | "ENHANCING" | "READY" | "PUBLISHED" | "FAILED" {
  return validateEnum(status, [
    "PENDING",
    "ENHANCING",
    "READY",
    "PUBLISHED",
    "FAILED",
  ]);
}

/**
 * Validate authentication context
 */
export function requireAuth(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }
  return context.auth.uid;
}

/**
 * Validate admin role
 */
export function requireAdmin(context: functions.https.CallableContext): void {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const claims = context.auth.token;
  if (!claims.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "User must be an admin"
    );
  }
}

/**
 * Rate limit check (using cache)
 */
import { cache } from "./cache";

export function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): void {
  const key = `ratelimit:${userId}:${action}`;
  const requests = cache.get<number>(key) || 0;

  if (requests >= maxRequests) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      `Rate limit exceeded. Max ${maxRequests} requests per ${Math.round(
        windowMs / 1000
      )} seconds`
    );
  }

  cache.set(key, requests + 1, windowMs);
}

/**
 * Validate and sanitize product data
 */
export function validateProductData(data: any): {
  title: string;
  description: string;
  price: number;
  images: string[];
} {
  validateRequired(data, ["title", "description", "price"]);

  const title = data.title.trim();
  validateLength(title, 1, 200);

  const description = data.description.trim();
  validateLength(description, 1, 10000);

  const price = parseFloat(data.price);
  if (isNaN(price) || price <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Price must be a positive number"
    );
  }

  const images = Array.isArray(data.images) ? data.images : [];
  images.forEach((url: string) => {
    if (!validateUrl(url)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Invalid image URL: ${url}`
      );
    }
  });

  return {
    title,
    description,
    price,
    images,
  };
}
