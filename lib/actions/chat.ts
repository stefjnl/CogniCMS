"use server";

import { randomUUID } from "crypto";
import { type UIMessage } from "ai";
import { requireSession } from "@/lib/utils/auth";
import { chatMessageSchema } from "@/lib/utils/validation";
import { getDraftContent, clearDraftContent } from "@/lib/storage/cache";
import { getSiteConfig } from "@/lib/storage/sites";
import { getFileContent } from "@/lib/github/operations";
import type { WebsiteContent } from "@/types/content";

/**
 * Chat Server Actions
 *
 * This file implements Next.js Server Actions for AI chat operations.
 * Server Actions provide:
 * - Better type safety and automatic serialization
 * - Simplified error handling with result objects
 * - Direct server-side execution without API route boilerplate
 * - Progressive enhancement support
 *
 * Note: Streaming still uses API routes (/api/chat/[siteId]) because
 * Server Actions don't yet have first-class streaming support in the
 * current AI SDK version. These actions handle validation and data operations.
 */

interface ChatValidationResult {
  success: boolean;
  error?: string;
  traceId?: string;
  siteId?: string;
  messages?: UIMessage[];
}

/**
 * Validate chat request - Server Action
 * Checks authentication and validates input before proceeding
 */
export async function validateChatRequest(
  siteId: string,
  messages: UIMessage[],
  traceId?: string
): Promise<ChatValidationResult> {
  try {
    // Verify authentication
    await requireSession();
  } catch {
    return {
      success: false,
      error: "Unauthorized - Please log in",
    };
  }

  try {
    // Validate input
    const validation = chatMessageSchema.safeParse({ messages });
    if (!validation.success) {
      return {
        success: false,
        error: "Invalid message format",
      };
    }

    // Verify site exists
    const site = await getSiteConfig(siteId);
    if (!site) {
      return {
        success: false,
        error: "Site not found",
      };
    }

    return {
      success: true,
      traceId: traceId ?? randomUUID(),
      siteId,
      messages,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

/**
 * Refresh draft content from cache - Server Action
 * Fetches latest draft state for a site
 */
export async function refreshDraftAction(siteId: string): Promise<{
  success: boolean;
  content?: WebsiteContent;
  error?: string;
}> {
  try {
    await requireSession();
  } catch {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    // Try to get draft from cache first
    const draftContent = getDraftContent(siteId);
    if (draftContent) {
      return {
        success: true,
        content: draftContent,
      };
    }

    // If no draft, load from GitHub
    const site = await getSiteConfig(siteId);
    if (!site) {
      return {
        success: false,
        error: "Site not found",
      };
    }

    const file = await getFileContent(site, site.contentFile);
    const content = JSON.parse(file.content) as WebsiteContent;

    return {
      success: true,
      content,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to refresh content",
    };
  }
}

/**
 * Clear draft content - Server Action
 * Removes cached draft for a site
 */
export async function clearDraftAction(siteId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await requireSession();
  } catch {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const { clearDraftContent } = await import("@/lib/storage/cache");
    clearDraftContent(siteId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clear draft",
    };
  }
}
