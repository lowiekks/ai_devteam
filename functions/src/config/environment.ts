/**
 * Environment Configuration
 * Replace these with your actual values or use Firebase environment config
 */

export const config = {
  // Google Cloud
  projectId: process.env.GCP_PROJECT || "your-firebase-project-id",
  location: process.env.GCP_LOCATION || "us-central1",

  // Cloud Tasks
  cloudTasks: {
    queueName: "scraper-queue",
    scraperWorkerUrl: process.env.SCRAPER_WORKER_URL || "https://your-region-your-project.cloudfunctions.net/executeScrape",
    autoHealWorkerUrl: process.env.AUTO_HEAL_WORKER_URL || "https://your-region-your-project.cloudfunctions.net/executeAutoHeal",
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: "gpt-4o",
  },

  // Google Vision API
  vision: {
    enabled: true,
  },

  // Scraping Service (Apify or Bright Data)
  scraping: {
    provider: process.env.SCRAPING_PROVIDER || "apify", // "apify" | "brightdata"
    apify: {
      apiKey: process.env.APIFY_API_KEY || "",
      actorId: "apify/web-scraper",
    },
    brightData: {
      apiKey: process.env.BRIGHT_DATA_API_KEY || "",
      zone: process.env.BRIGHT_DATA_ZONE || "",
    },
  },

  // Email notifications (SendGrid, Mailgun, etc.)
  notifications: {
    sendgridApiKey: process.env.SENDGRID_API_KEY || "",
    fromEmail: "alerts@yourdomain.com",
  },

  // Feature flags
  features: {
    autoHealEnabled: true,
    aiRiskScoring: true,
    maxConcurrentScrapes: 100,
  },
};
