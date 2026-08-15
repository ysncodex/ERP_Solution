/**
 * Error Handling Utilities
 * Centralized error handling for try-catch blocks
 */

import { toast } from 'sonner';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  severity?: ErrorSeverity;
}

class ErrorHandler {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Handle errors with user-friendly messages
   */
  handle(error: unknown, context?: ErrorContext): void {
    const errorMessage = this.getErrorMessage(error);
    const severity = context?.severity || 'medium';

    // Log to console in development
    if (this.isDevelopment) {
      console.error('[Error Handler]', {
        error,
        context,
        message: errorMessage,
      });
    }

    // Show user-friendly toast notification
    this.showNotification(errorMessage, severity);

    // Log to monitoring service in production
    if (!this.isDevelopment) {
      this.logToMonitoring(error, context);
    }
  }

  /**
   * Handle async operations with automatic error handling
   */
  async handleAsync<T>(operation: () => Promise<T>, context?: ErrorContext): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error, context);
      return null;
    }
  }

  /**
   * Wrap sync operations with error handling
   */
  handleSync<T>(operation: () => T, context?: ErrorContext): T | null {
    try {
      return operation();
    } catch (error) {
      this.handle(error, context);
      return null;
    }
  }

  /**
   * Extract meaningful error message
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return 'An unexpected error occurred';
  }

  /**
   * Show user notification based on severity
   */
  private showNotification(message: string, severity: ErrorSeverity): void {
    switch (severity) {
      case 'low':
        toast.info(message);
        break;
      case 'medium':
        toast.warning(message);
        break;
      case 'high':
      case 'critical':
        toast.error(message);
        break;
    }
  }

  /**
   * Log error to monitoring service
   */
  private logToMonitoring(error: unknown, context?: ErrorContext): void {
    // TODO: Integrate with Sentry, LogRocket, or custom service
    // Example:
    // Sentry.captureException(error, {
    //   tags: { action: context?.action, severity: context?.severity },
    //   user: { id: context?.userId },
    //   extra: context?.metadata,
    // });

    // For now, store in localStorage for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context,
      };

      const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      logs.push(errorLog);
      // Keep only last 50 errors
      localStorage.setItem('error_logs', JSON.stringify(logs.slice(-50)));
    } catch (e) {
      // Silent fail if logging fails
      console.error('Failed to log error:', e);
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

/**
 * Convenience function for handling errors
 */
export const handleError = (error: unknown, context?: ErrorContext): void => {
  errorHandler.handle(error, context);
};

/**
 * Convenience function for async operations
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<T | null> => {
  return errorHandler.handleAsync(operation, context);
};
