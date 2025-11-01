import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Client Configuration
 *
 * Initializes Sentry for client-side error monitoring.
 * Best Practice #11: Add Error Monitoring
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
  process.env.NODE_ENV ||
  "development";

Sentry.init({
  dsn: SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: SENTRY_ENVIRONMENT === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Replay configuration for session replay
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: SENTRY_ENVIRONMENT === "production" ? 0.1 : 0.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  environment: SENTRY_ENVIRONMENT,

  // Configure which URLs to ignore
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    "chrome-extension",
    "moz-extension",
    // Network errors that are user-specific
    "NetworkError",
    "Network request failed",
    "Failed to fetch",
    // ResizeObserver errors (non-critical)
    "ResizeObserver loop limit exceeded",
  ],

  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (
      SENTRY_ENVIRONMENT === "development" &&
      !process.env.NEXT_PUBLIC_SENTRY_DEBUG
    ) {
      return null;
    }

    // Filter out events from error boundaries in development
    if (SENTRY_ENVIRONMENT === "development" && event.exception) {
      const error = hint.originalException;
      if (error instanceof Error && error.message.includes("ErrorBoundary")) {
        return null;
      }
    }

    return event;
  },
});
