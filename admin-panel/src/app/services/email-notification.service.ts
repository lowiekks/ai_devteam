import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, addDoc, Timestamp } from '@angular/fire/firestore';

export type NotificationType =
  | 'user_signup'
  | 'user_status_change'
  | 'product_price_change'
  | 'system_alert'
  | 'admin_action'
  | 'export_complete';

export interface EmailNotification {
  id?: string;
  type: NotificationType;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Timestamp;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}

export interface NotificationTemplate {
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmailNotificationService {
  private firestore = inject(Firestore);

  // State
  pendingNotifications = signal<number>(0);
  lastSentNotification = signal<EmailNotification | null>(null);

  // Email templates
  private templates: Record<NotificationType, NotificationTemplate> = {
    user_signup: {
      subject: 'Welcome to Dropship Monitor',
      htmlTemplate: `
        <h2>Welcome to Dropship Monitor!</h2>
        <p>Hi {displayName},</p>
        <p>Thank you for signing up. Your account has been successfully created.</p>
        <p><strong>Email:</strong> {email}</p>
        <p>Get started by connecting your store and monitoring products.</p>
        <p>Best regards,<br>Dropship Monitor Team</p>
      `,
      textTemplate: `
        Welcome to Dropship Monitor!

        Hi {displayName},

        Thank you for signing up. Your account has been successfully created.
        Email: {email}

        Get started by connecting your store and monitoring products.

        Best regards,
        Dropship Monitor Team
      `,
    },
    user_status_change: {
      subject: 'Account Status Update',
      htmlTemplate: `
        <h2>Account Status Change</h2>
        <p>Hi {displayName},</p>
        <p>Your account status has been changed to: <strong>{status}</strong></p>
        <p>If you have any questions, please contact support.</p>
        <p>Best regards,<br>Dropship Monitor Team</p>
      `,
      textTemplate: `
        Account Status Change

        Hi {displayName},

        Your account status has been changed to: {status}

        If you have any questions, please contact support.

        Best regards,
        Dropship Monitor Team
      `,
    },
    product_price_change: {
      subject: 'Product Price Alert - {productName}',
      htmlTemplate: `
        <h2>Price Change Alert</h2>
        <p>Hi {displayName},</p>
        <p>We detected a price change for your monitored product:</p>
        <div style="padding: 15px; background: #f5f5f5; border-radius: 8px; margin: 20px 0;">
          <h3>{productName}</h3>
          <p><strong>Previous Price:</strong> {previousPrice}</p>
          <p><strong>Current Price:</strong> {currentPrice}</p>
          <p><strong>Change:</strong> {priceChange}%</p>
        </div>
        <p>View product details in your dashboard.</p>
        <p>Best regards,<br>Dropship Monitor Team</p>
      `,
      textTemplate: `
        Price Change Alert

        Hi {displayName},

        We detected a price change for your monitored product:

        Product: {productName}
        Previous Price: {previousPrice}
        Current Price: {currentPrice}
        Change: {priceChange}%

        View product details in your dashboard.

        Best regards,
        Dropship Monitor Team
      `,
    },
    system_alert: {
      subject: 'System Alert - {alertType}',
      htmlTemplate: `
        <h2>System Alert</h2>
        <p>{message}</p>
        <p><strong>Time:</strong> {timestamp}</p>
        <p>{details}</p>
      `,
      textTemplate: `
        System Alert

        {message}

        Time: {timestamp}

        {details}
      `,
    },
    admin_action: {
      subject: 'Admin Action Notification',
      htmlTemplate: `
        <h2>Admin Action Performed</h2>
        <p>An administrative action was performed on your account:</p>
        <p><strong>Action:</strong> {action}</p>
        <p><strong>Performed by:</strong> {adminEmail}</p>
        <p><strong>Time:</strong> {timestamp}</p>
        <p>{details}</p>
      `,
      textTemplate: `
        Admin Action Performed

        An administrative action was performed on your account:

        Action: {action}
        Performed by: {adminEmail}
        Time: {timestamp}

        {details}
      `,
    },
    export_complete: {
      subject: 'Export Complete',
      htmlTemplate: `
        <h2>Export Complete</h2>
        <p>Hi {displayName},</p>
        <p>Your data export is complete.</p>
        <p><strong>Export Type:</strong> {exportType}</p>
        <p><strong>Records:</strong> {recordCount}</p>
        <p>The export file has been downloaded to your device.</p>
        <p>Best regards,<br>Dropship Monitor Team</p>
      `,
      textTemplate: `
        Export Complete

        Hi {displayName},

        Your data export is complete.

        Export Type: {exportType}
        Records: {recordCount}

        The export file has been downloaded to your device.

        Best regards,
        Dropship Monitor Team
      `,
    },
  };

  /**
   * Queue an email notification
   * In production, this would trigger an actual email send via backend service
   */
  async queueNotification(
    type: NotificationType,
    to: string[],
    variables: Record<string, any>,
    options?: {
      cc?: string[];
      bcc?: string[];
    }
  ): Promise<string> {
    try {
      const template = this.templates[type];
      if (!template) {
        throw new Error(`Template not found for type: ${type}`);
      }

      // Generate email content from template
      const subject = this.replaceVariables(template.subject, variables);
      const htmlBody = this.replaceVariables(template.htmlTemplate, variables);
      const textBody = this.replaceVariables(template.textTemplate, variables);

      const notification: Omit<EmailNotification, 'id'> = {
        type,
        to,
        cc: options?.cc,
        bcc: options?.bcc,
        subject,
        htmlBody,
        textBody,
        status: 'pending',
        metadata: variables,
        createdAt: Timestamp.now(),
      };

      // Save to Firestore queue
      const notificationsCollection = collection(this.firestore, 'email_notifications');
      const docRef = await addDoc(notificationsCollection, notification);

      this.pendingNotifications.set(this.pendingNotifications() + 1);

      // In production, this would trigger a Cloud Function or backend service
      // to actually send the email via SendGrid, Mailgun, AWS SES, etc.
      console.log('Email notification queued:', {
        id: docRef.id,
        type,
        to,
        subject,
      });

      return docRef.id;
    } catch (error: any) {
      console.error('Error queueing email notification:', error);
      throw error;
    }
  }

  /**
   * Send user signup notification
   */
  async sendUserSignupNotification(email: string, displayName: string): Promise<string> {
    return this.queueNotification('user_signup', [email], {
      email,
      displayName: displayName || 'User',
    });
  }

  /**
   * Send user status change notification
   */
  async sendUserStatusChangeNotification(
    email: string,
    displayName: string,
    status: string
  ): Promise<string> {
    return this.queueNotification('user_status_change', [email], {
      displayName: displayName || 'User',
      status,
    });
  }

  /**
   * Send product price change notification
   */
  async sendPriceChangeNotification(
    email: string,
    displayName: string,
    productData: {
      productName: string;
      previousPrice: number;
      currentPrice: number;
      priceChange: number;
    }
  ): Promise<string> {
    return this.queueNotification('product_price_change', [email], {
      displayName: displayName || 'User',
      ...productData,
    });
  }

  /**
   * Send system alert to admins
   */
  async sendSystemAlert(
    adminEmails: string[],
    alertType: string,
    message: string,
    details?: string
  ): Promise<string> {
    return this.queueNotification('system_alert', adminEmails, {
      alertType,
      message,
      details: details || '',
      timestamp: new Date().toLocaleString(),
    });
  }

  /**
   * Send admin action notification
   */
  async sendAdminActionNotification(
    userEmail: string,
    action: string,
    adminEmail: string,
    details?: string
  ): Promise<string> {
    return this.queueNotification('admin_action', [userEmail], {
      action,
      adminEmail,
      details: details || '',
      timestamp: new Date().toLocaleString(),
    });
  }

  /**
   * Send export complete notification
   */
  async sendExportCompleteNotification(
    email: string,
    displayName: string,
    exportType: string,
    recordCount: number
  ): Promise<string> {
    return this.queueNotification('export_complete', [email], {
      displayName: displayName || 'User',
      exportType,
      recordCount,
    });
  }

  /**
   * Get notification template preview
   */
  getTemplatePreview(
    type: NotificationType,
    variables: Record<string, any>
  ): { subject: string; html: string; text: string } {
    const template = this.templates[type];
    if (!template) {
      throw new Error(`Template not found for type: ${type}`);
    }

    return {
      subject: this.replaceVariables(template.subject, variables),
      html: this.replaceVariables(template.htmlTemplate, variables),
      text: this.replaceVariables(template.textTemplate, variables),
    };
  }

  /**
   * Replace template variables
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, String(variables[key]));
    });
    return result;
  }
}
