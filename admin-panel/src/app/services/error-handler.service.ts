/**
 * Global Error Handler Service
 * Centralized error handling, logging, and user notifications
 */

import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface AppError {
  message: string;
  code?: string;
  details?: any;
  userMessage: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  private errorLog: AppError[] = [];

  /**
   * Handle different types of errors
   */
  handleError(error: any): AppError {
    const timestamp = new Date();
    let appError: AppError;

    if (error instanceof HttpErrorResponse) {
      // HTTP errors
      appError = this.handleHttpError(error, timestamp);
    } else if (this.isFirebaseFunctionsError(error)) {
      // Firebase Functions errors
      appError = this.handleFirebaseFunctionsError(error, timestamp);
    } else if (error instanceof Error) {
      // Standard JavaScript errors
      appError = {
        message: error.message,
        code: error.name,
        userMessage: 'An unexpected error occurred. Please try again.',
        timestamp,
      };
    } else {
      // Unknown errors
      appError = {
        message: String(error),
        userMessage: 'An unexpected error occurred. Please try again.',
        timestamp,
      };
    }

    // Log error
    this.logError(appError);

    // Send to monitoring (if configured)
    this.sendToMonitoring(appError);

    return appError;
  }

  /**
   * Handle HTTP errors
   */
  private handleHttpError(
    error: HttpErrorResponse,
    timestamp: Date
  ): AppError {
    let userMessage = 'A network error occurred. Please check your connection.';

    if (error.status === 0) {
      userMessage = 'No internet connection. Please check your network.';
    } else if (error.status >= 400 && error.status < 500) {
      userMessage =
        error.error?.message || 'Invalid request. Please try again.';
    } else if (error.status >= 500) {
      userMessage = 'Server error. Please try again later.';
    }

    return {
      message: error.message,
      code: `HTTP_${error.status}`,
      details: error.error,
      userMessage,
      timestamp,
    };
  }

  /**
   * Handle Firebase Functions errors
   */
  private handleFirebaseFunctionsError(error: any, timestamp: Date): AppError {
    const code = error.code || 'unknown';
    const message = error.message || 'An error occurred';

    let userMessage = message;

    // Map error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'unauthenticated': 'Please sign in to continue.',
      'permission-denied': 'You do not have permission to perform this action.',
      'not-found': 'The requested resource was not found.',
      'already-exists': 'This resource already exists.',
      'resource-exhausted': 'Too many requests. Please try again later.',
      'failed-precondition': 'Unable to complete. Please check your settings.',
      'invalid-argument': 'Invalid input. Please check your data.',
      'deadline-exceeded': 'Request timeout. Please try again.',
      'internal': 'An internal error occurred. Please try again later.',
    };

    if (errorMessages[code]) {
      userMessage = errorMessages[code];
    }

    return {
      message,
      code,
      details: error.details,
      userMessage,
      timestamp,
    };
  }

  /**
   * Check if error is Firebase Functions error
   */
  private isFirebaseFunctionsError(error: any): boolean {
    return error && typeof error.code === 'string' && error.message;
  }

  /**
   * Log error to console and memory
   */
  private logError(error: AppError): void {
    console.error('[ErrorHandler]', {
      message: error.message,
      code: error.code,
      userMessage: error.userMessage,
      timestamp: error.timestamp.toISOString(),
      details: error.details,
    });

    // Keep last 50 errors in memory
    this.errorLog.push(error);
    if (this.errorLog.length > 50) {
      this.errorLog.shift();
    }
  }

  /**
   * Send error to monitoring service (optional)
   */
  private sendToMonitoring(error: AppError): void {
    // Implement monitoring integration here (e.g., Sentry, LogRocket)
    // Example:
    // if (window.Sentry) {
    //   Sentry.captureException(error);
    // }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 10): AppError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Clear error log
   */
  clearErrors(): void {
    this.errorLog = [];
  }

  /**
   * Format error for display
   */
  formatErrorMessage(error: any): string {
    const appError = this.handleError(error);
    return appError.userMessage;
  }
}
