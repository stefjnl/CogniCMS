/**
 * Sentry User Context Utilities
 *
 * Provides utilities for setting user context in Sentry
 * for better error tracking and debugging.
 */

import * as Sentry from "@sentry/nextjs";
import type { AuthSession } from "@/lib/utils/auth";

/**
 * Set user context in Sentry
 * Call this after successful authentication
 */
export function setSentryUser(session: AuthSession): void {
  Sentry.setUser({
    id: session.sub,
    // Don't include email or other PII unless necessary
  });
}

/**
 * Clear user context in Sentry
 * Call this after logout
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Set custom context for a specific operation
 */
export function setSentryContext(
  contextName: string,
  context: Record<string, unknown>
): void {
  Sentry.setContext(contextName, context);
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addSentryBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level: "info",
    data,
  });
}

/**
 * Set tags for better error categorization
 */
export function setSentryTags(tags: Record<string, string>): void {
  Sentry.setTags(tags);
}

/**
 * Wrap a function to add performance monitoring
 */
export function withSentryPerformance<T extends (...args: any[]) => any>(
  fn: T,
  operationName: string
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    return Sentry.startSpan(
      {
        name: operationName,
        op: "function",
      },
      () => fn(...args)
    );
  }) as T;
}
