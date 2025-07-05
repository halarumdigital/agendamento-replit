import * as Sentry from "@sentry/node";
import type { Request, Response } from "express";

// Utility functions for Sentry error tracking
export const sentryUtils = {
  // Capture exceptions with additional context
  captureException: (error: Error, context?: Record<string, any>) => {
    if (context) {
      Sentry.withScope((scope) => {
        scope.setContext("additional_info", context);
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  },

  // Capture messages with levels
  captureMessage: (message: string, level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info') => {
    Sentry.captureMessage(message, level);
  },

  // Capture API errors with request context
  captureApiError: (error: Error, req: Request, additionalContext?: Record<string, any>) => {
    Sentry.withScope((scope) => {
      scope.setTag("type", "api_error");
      scope.setContext("request", {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      if (additionalContext) {
        scope.setContext("additional_info", additionalContext);
      }
      
      Sentry.captureException(error);
    });
  },

  // Capture database errors
  captureDatabaseError: (error: Error, query?: string, params?: any[]) => {
    Sentry.withScope((scope) => {
      scope.setTag("type", "database_error");
      scope.setContext("database", {
        query: query || "unknown",
        params: params || [],
      });
      Sentry.captureException(error);
    });
  },

  // Capture authentication errors
  captureAuthError: (error: Error, userId?: string | number, companyId?: string | number) => {
    Sentry.withScope((scope) => {
      scope.setTag("type", "auth_error");
      scope.setContext("auth", {
        userId: userId || "unknown",
        companyId: companyId || "unknown",
      });
      Sentry.captureException(error);
    });
  },

  // Capture payment errors (for Mercado Pago integration)
  capturePaymentError: (error: Error, paymentData?: Record<string, any>) => {
    Sentry.withScope((scope) => {
      scope.setTag("type", "payment_error");
      scope.setContext("payment", {
        ...paymentData,
        // Remove sensitive information
        accessToken: paymentData?.accessToken ? "[REDACTED]" : undefined,
        publicKey: paymentData?.publicKey ? "[REDACTED]" : undefined,
      });
      Sentry.captureException(error);
    });
  },

  // Set user context
  setUserContext: (userId: string | number, email?: string, companyId?: string | number) => {
    Sentry.setUser({
      id: String(userId),
      email: email,
      company_id: companyId ? String(companyId) : undefined,
    });
  },

  // Clear user context
  clearUserContext: () => {
    Sentry.setUser(null);
  },

  // Add breadcrumb for debugging
  addBreadcrumb: (message: string, category: string, level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info', data?: Record<string, any>) => {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
    });
  },
};

// Express middleware for automatic error tracking
export const sentryExpressErrorHandler = (err: any, req: Request, res: Response, next: any) => {
  // Capture the error with request context
  sentryUtils.captureApiError(err, req);
  
  // Continue with original error handling
  next(err);
};

export default sentryUtils;