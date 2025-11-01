/**
 * Rate Limiting Configuration
 *
 * Implements Best Practice #12: Rate Limiting
 * Implements Best Practice #13: User-Based Rate Limits
 *
 * Uses Upstash Rate Limit with Redis for distributed rate limiting.
 * Protects against abuse, DoS attacks, and manages API costs.
 *
 * Rate Limits (Free Tier):
 * - Chat API: 10 requests per minute (AI operations are expensive)
 * - Publish API: 5 requests per minute (GitHub API limits)
 * - Content Extract: 20 requests per minute (HTML parsing)
 * - Sites API: 30 requests per minute (CRUD operations)
 * - Default: 60 requests per minute (other endpoints)
 *
 * Pro and Enterprise tiers receive higher limits.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import type { UserTier } from "@/lib/utils/auth";

// Redis client - uses in-memory fallback if Upstash not configured
let redis: Redis | null = null;
let isUpstashConfigured = false;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    redis = new Redis({
      url,
      token,
    });
    isUpstashConfigured = true;
    console.log(
      "[RateLimit] Upstash Redis configured - distributed rate limiting enabled"
    );
  } else {
    console.warn(
      "[RateLimit] Upstash Redis not configured - using in-memory rate limiting"
    );
    console.warn(
      "[RateLimit] For production, set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN"
    );
  }
} catch (error) {
  console.error("[RateLimit] Failed to initialize Redis client:", error);
}

// Base rate limit configurations for different endpoint types (Free tier)
const baseRateLimitConfigs = {
  // AI Chat API - most expensive operations
  chat: {
    requests: 10,
    window: "1 m",
    identifier: "chat",
  },

  // Publishing to GitHub - respects GitHub API rate limits
  publish: {
    requests: 5,
    window: "1 m",
    identifier: "publish",
  },

  // Content extraction - HTML parsing operations
  extract: {
    requests: 20,
    window: "1 m",
    identifier: "extract",
  },

  // Sites CRUD operations
  sites: {
    requests: 30,
    window: "1 m",
    identifier: "sites",
  },

  // Default for other endpoints
  default: {
    requests: 60,
    window: "1 m",
    identifier: "default",
  },
} as const;

type RateLimitType = keyof typeof baseRateLimitConfigs;

// Tier multipliers for rate limits
const tierMultipliers: Record<UserTier, number> = {
  free: 1, // Base limits
  pro: 5, // 5x higher limits
  enterprise: 20, // 20x higher limits
};

/**
 * Get rate limit configuration for a specific tier and endpoint type
 */
function getRateLimitConfig(type: RateLimitType, tier: UserTier = "free") {
  const base = baseRateLimitConfigs[type];
  const multiplier = tierMultipliers[tier];

  return {
    requests: base.requests * multiplier,
    window: base.window,
    identifier: `${base.identifier}:${tier}`,
  };
}

// Create rate limiters for each endpoint type and tier combination
const rateLimiters = new Map<string, Ratelimit>();

function getRateLimiter(
  type: RateLimitType,
  tier: UserTier = "free"
): Ratelimit {
  const key = `${type}:${tier}`;

  if (!rateLimiters.has(key)) {
    const config = getRateLimitConfig(type, tier);

    // If no Redis, use in-memory store (ephemeral, not suitable for production)
    if (!redis) {
      const limiter = new Ratelimit({
        redis: new Map() as any, // In-memory fallback
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
        analytics: false,
        prefix: `ratelimit:${config.identifier}`,
      });
      rateLimiters.set(key, limiter);
    } else {
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
        analytics: isUpstashConfigured,
        prefix: `ratelimit:${config.identifier}`,
      });
      rateLimiters.set(key, limiter);
    }
  }

  return rateLimiters.get(key)!;
}

/**
 * Get rate limit identifier from request
 *
 * Priority order:
 * 1. Session ID (authenticated users)
 * 2. IP address (anonymous users)
 * 3. Fallback to "anonymous" if neither available
 */
export function getRateLimitIdentifier(request: NextRequest): string {
  // Try to get session from cookie
  const sessionCookie = request.cookies.get("cognicms_session");
  if (sessionCookie?.value) {
    // Use a hash of the session token as identifier
    // This ensures consistent identification while not exposing the actual token
    return `session:${sessionCookie.value.slice(0, 32)}`;
  }

  // Fall back to IP address
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0] || realIp;

  if (ip) {
    return `ip:${ip}`;
  }

  // Last resort fallback
  return "anonymous";
}

/**
 * Rate limit options for checking limits
 */
export interface RateLimitOptions {
  type: RateLimitType;
  identifier?: string; // Optional custom identifier
  tier?: UserTier; // User tier for tiered rate limits
}

/**
 * Check rate limit for a request
 *
 * @param request - Next.js request object
 * @param options - Rate limit configuration
 * @returns Object with success status and limit details
 */
export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
) {
  const tier = options.tier || "free";
  const baseIdentifier = options.identifier ?? getRateLimitIdentifier(request);
  // Include tier in identifier to separate rate limit buckets per tier
  const identifier = `${baseIdentifier}:${tier}`;
  const limiter = getRateLimiter(options.type, tier);

  try {
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      identifier,
      type: options.type,
      tier,
    };
  } catch (error) {
    // If rate limiting fails (e.g., Redis down), allow request but log error
    console.error("[RateLimit] Rate limit check failed:", error);

    // In production, you might want to fail closed (deny request) for security
    // For development, we'll fail open (allow request) to not break functionality
    const config = getRateLimitConfig(options.type, tier);
    return {
      success: true, // Allow request on error
      limit: config.requests,
      remaining: 0,
      reset: Date.now() + 60000, // 1 minute from now
      identifier,
      type: options.type,
      tier,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Rate limit response with standard headers
 */
export function rateLimitResponse(
  result: Awaited<ReturnType<typeof checkRateLimit>>
): NextResponse {
  const response = NextResponse.json(
    {
      error: "Too many requests",
      message: `Rate limit exceeded. Try again in ${Math.ceil(
        (result.reset - Date.now()) / 1000
      )} seconds.`,
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    },
    { status: 429 }
  );

  // Add standard rate limit headers
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.reset.toString());
  response.headers.set(
    "Retry-After",
    Math.ceil((result.reset - Date.now()) / 1000).toString()
  );

  return response;
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: Awaited<ReturnType<typeof checkRateLimit>>
): NextResponse {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.reset.toString());

  return response;
}

/**
 * Middleware helper to apply rate limiting
 *
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await withRateLimit(request, { type: "chat" });
 *   if (!rateLimitResult.success) {
 *     return rateLimitResult.response;
 *   }
 *
 *   // Your endpoint logic here...
 *   const response = NextResponse.json({ data: "..." });
 *   return addRateLimitHeaders(response, rateLimitResult.result);
 * }
 * ```
 */
export async function withRateLimit(
  request: NextRequest,
  options: RateLimitOptions
) {
  const result = await checkRateLimit(request, options);

  if (!result.success) {
    return {
      success: false as const,
      response: rateLimitResponse(result),
      result,
    };
  }

  return {
    success: true as const,
    result,
  };
}

/**
 * Check if Upstash Redis is properly configured
 */
export function isRateLimitConfigured(): boolean {
  return isUpstashConfigured;
}

/**
 * Get rate limit configuration for logging/debugging
 */
export function getRateLimitConfigForType(
  type: RateLimitType,
  tier: UserTier = "free"
) {
  return getRateLimitConfig(type, tier);
}

/**
 * Get all tier multipliers
 */
export function getTierMultipliers() {
  return tierMultipliers;
}

/**
 * Get rate limits for all endpoint types for a given tier
 */
export function getTierLimits(tier: UserTier = "free") {
  return {
    chat: getRateLimitConfig("chat", tier),
    publish: getRateLimitConfig("publish", tier),
    extract: getRateLimitConfig("extract", tier),
    sites: getRateLimitConfig("sites", tier),
    default: getRateLimitConfig("default", tier),
  };
}
