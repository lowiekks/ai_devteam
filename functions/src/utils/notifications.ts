/**
 * Notification Utilities
 * Email and webhook notifications
 */

import axios from "axios";
import { config } from "../config/environment";

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

/**
 * Send email notification using SendGrid
 */
export async function sendNotificationEmail(payload: EmailPayload): Promise<void> {
  if (!config.notifications.sendgridApiKey) {
    console.warn("SendGrid API key not configured, skipping email");
    return;
  }

  try {
    await axios.post(
      "https://api.sendgrid.com/v3/mail/send",
      {
        personalizations: [
          {
            to: [{ email: payload.to }],
            subject: payload.subject,
          },
        ],
        from: { email: config.notifications.fromEmail },
        content: [
          {
            type: "text/html",
            value: payload.body,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${config.notifications.sendgridApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`Email sent to ${payload.to}`);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

/**
 * Send webhook notification
 */
export async function sendWebhookNotification(url: string, payload: any): Promise<void> {
  try {
    await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });

    console.log(`Webhook sent to ${url}`);
  } catch (error) {
    console.error("Failed to send webhook:", error);
  }
}
