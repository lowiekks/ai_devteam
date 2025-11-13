/**
 * Firebase Cloud Functions Entry Point
 * Enterprise Dropshipping Monitor
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Export all Cloud Functions

// Monitoring Engine
export { scheduleScrapes, triggerManualScrape } from "./monitoring/scheduler";
export { executeScrape } from "./monitoring/worker";

// AI Auto-Healing (if you want to expose manual trigger)
// export { executeAutoHeal } from "./ai-healing/auto-heal";

// Content Refinery (AI Text & Image Processing)
export { refineProductText, triggerTextRefinement } from "./content-refinery/text-refiner";
export { refineProductImages, triggerImageRefinement } from "./content-refinery/image-refiner";

// Review Queue API
export { getReviewQueue, approveProduct, rejectProduct, resubmitProduct } from "./api/review-queue";

// API Functions for Dashboard
export { getMonitoredProducts } from "./api/products";
export { addProductToMonitoring } from "./api/products";
export { getUserSettings, updateUserSettings } from "./api/settings";
export { getAnalytics } from "./api/analytics";
