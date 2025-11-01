import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Server Configuration
 *
 * Initializes Sentry for server-side error monitoring.
 * Best Practice #11: Add Error Monitoring
 */

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT =
  process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development";

Sentry.init({
  dsn: SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: SENTRY_ENVIRONMENT === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  environment: SENTRY_ENVIRONMENT,

  // Capture unhandled rejections and exceptions
  integrations: [Sentry.extraErrorDataIntegration(), Sentry.httpIntegration()],

  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (SENTRY_ENVIRONMENT === "development" && !process.env.SENTRY_DEBUG) {
      return null;
    }

    // Add custom tags for better categorization
    event.tags = {
      ...event.tags,
      runtime: "server",
    };

    return event;
  },
});
