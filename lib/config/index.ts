import { z } from "zod";

/**
 * Centralized, type-safe configuration for CogniCMS.
 *
 * Evaluated once at module load. Fails fast when required values
 * are missing so misconfiguration is caught early.
 */

const nodeEnvSchema = z
  .enum(["development", "test", "production"])
  .default("development");

const githubSchema = z.object({
  /**
   * Token used for GitHub operations (publishing, content fetch, etc.).
   * Currently required for production; optional in development/test to
   * support local workflows and fixtures.
   */
  token: z.string().min(1, "GITHUB_TOKEN is required").optional(),
});

const sentrySchema = z.object({
  /**
   * Server-side DSN for Sentry error reporting.
   */
  dsn: z.string().optional(),
  /**
   * Environment label for Sentry.
   */
  environment: z.string().optional(),
  /**
   * Optional auth token used for Sentry build-time / deployment integration.
   */
  authToken: z.string().optional(),
  /**
   * Client-side DSN for browser tracing.
   */
  publicDsn: z.string().optional(),
  /**
   * Client-side environment for Sentry.
   */
  publicEnvironment: z.string().optional(),
  /**
   * Debug flags used in documentation/examples.
   */
  debug: z
    .object({
      publicDebug: z
        .string()
        .transform((value) => value === "1" || value === "true")
        .optional(),
    })
    .optional(),
});

/**
 * AI provider configuration (NanoGPT, etc.).
 *
 * Only keys that are actually referenced in the repo are modeled here.
 */
const aiSchema = z.object({
  nanoGpt: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
    model: z.string().optional(),
  }),
});

const appSchema = z.object({
  /**
   * Public app URL used by the frontend if configured.
   */
  url: z.string().url().optional(),
});

const authSchema = z.object({
  /**
   * Session secret for signing and verifying auth tokens.
   */
  sessionSecret: z.string().optional(),
  /**
   * Optional session duration in hours. Defaults to 24 when unset or invalid.
   */
  sessionDurationHours: z
    .string()
    .transform((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
    })
    .optional(),
  /**
   * Optional CMS password for simple password-based access.
   */
  cmsPassword: z.string().optional(),
  /**
   * Optional user tier for feature flags.
   */
  userTier: z.string().optional(),
});

const rateLimitSchema = z.object({
  upstashRedisRestUrl: z.string().optional(),
  upstashRedisRestToken: z.string().optional(),
});

const rawEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,

  GITHUB_TOKEN: process.env.GITHUB_TOKEN,

  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  NEXT_PUBLIC_SENTRY_DEBUG: process.env.NEXT_PUBLIC_SENTRY_DEBUG,

  NANOGPT_API_KEY: process.env.NANOGPT_API_KEY,
  NANOGPT_BASE_URL: process.env.NANOGPT_BASE_URL,
  NANOGPT_MODEL: process.env.NANOGPT_MODEL,

  SESSION_SECRET: process.env.SESSION_SECRET,
  SESSION_DURATION: process.env.SESSION_DURATION,
  CMS_PASSWORD: process.env.CMS_PASSWORD,
  CMS_USER_TIER: process.env.CMS_USER_TIER,

  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
};

const nodeEnv = nodeEnvSchema.parse(rawEnv.NODE_ENV ?? "development");

const github = githubSchema.parse({
  token: rawEnv.GITHUB_TOKEN,
});

// Sentry configuration derives from both public and private vars.
const sentry = sentrySchema.parse({
  dsn: rawEnv.SENTRY_DSN,
  environment: rawEnv.SENTRY_ENVIRONMENT ?? rawEnv.NODE_ENV,
  authToken: rawEnv.SENTRY_AUTH_TOKEN,
  publicDsn: rawEnv.NEXT_PUBLIC_SENTRY_DSN,
  publicEnvironment:
    rawEnv.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? rawEnv.NODE_ENV,
  debug: {
    publicDebug: rawEnv.NEXT_PUBLIC_SENTRY_DEBUG,
  },
});

const ai = aiSchema.parse({
  nanoGpt: {
    apiKey: rawEnv.NANOGPT_API_KEY,
    baseUrl: rawEnv.NANOGPT_BASE_URL,
    model: rawEnv.NANOGPT_MODEL,
  },
});

const app = appSchema.parse({
  url: rawEnv.NEXT_PUBLIC_APP_URL,
});

const auth = authSchema.parse({
  sessionSecret: rawEnv.SESSION_SECRET,
  sessionDurationHours: rawEnv.SESSION_DURATION,
  cmsPassword: rawEnv.CMS_PASSWORD,
  userTier: rawEnv.CMS_USER_TIER,
});

const rateLimit = rateLimitSchema.parse({
  upstashRedisRestUrl: rawEnv.UPSTASH_REDIS_REST_URL,
  upstashRedisRestToken: rawEnv.UPSTASH_REDIS_REST_TOKEN,
});

if (nodeEnv === "production") {
  if (!github.token) {
    throw new Error(
      "Missing required environment variable GITHUB_TOKEN in production."
    );
  }

  if (!auth.sessionSecret) {
    throw new Error(
      "Missing required environment variable SESSION_SECRET in production."
    );
  }

  if (
    (sentry.dsn && !sentry.environment) ||
    (sentry.publicDsn && !sentry.publicEnvironment)
  ) {
    throw new Error(
      "Sentry DSN is set but environment is missing. Ensure SENTRY_ENVIRONMENT / NEXT_PUBLIC_SENTRY_ENVIRONMENT are configured."
    );
  }
}

export const config = {
  nodeEnv,
  github,
  sentry,
  ai,
  app,
  auth,
  rateLimit,
};

export type AppConfig = typeof config;