"use server";

import { requireSession } from "@/lib/utils/auth";
import { getSiteConfig } from "@/lib/storage/sites";
import {
  getFileContent,
  publishFiles,
  validateGitHubPermissions,
} from "@/lib/github/operations";
import { publishSchema } from "@/lib/utils/validation";
import {
  clearDraftContent,
  getDraftContent,
  setDraftContent,
} from "@/lib/storage/cache";
import { diffWebsiteContent } from "@/lib/content/differ";
import { generateHtmlFromContent } from "@/lib/content/generator";
import type { WebsiteContent } from "@/types/content";
import { JSDOM } from "jsdom";

/**
 * Content Management Server Actions
 *
 * These actions handle content operations including:
 * - Fetching content from GitHub
 * - Managing draft state
 * - Publishing changes
 */

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get content for a site (from cache or GitHub)
 */
export async function getContentAction(
  siteId: string
): Promise<ActionResult<WebsiteContent>> {
  try {
    await requireSession();
  } catch {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    // Try cache first
    const draftContent = getDraftContent(siteId);
    if (draftContent) {
      return {
        success: true,
        data: draftContent,
      };
    }

    // Load from GitHub
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
      data: content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch content",
    };
  }
}

/**
 * Update draft content in cache
 */
export async function updateDraftContentAction(
  siteId: string,
  content: WebsiteContent
): Promise<ActionResult<void>> {
  try {
    await requireSession();
  } catch {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    setDraftContent(siteId, content);
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update draft",
    };
  }
}

/**
 * Publish content to GitHub
 */
export async function publishContentAction(
  siteId: string,
  content: WebsiteContent,
  html: string | undefined,
  commitMessage: string
): Promise<
  ActionResult<{ message: string; diff: ReturnType<typeof diffWebsiteContent> }>
> {
  try {
    await requireSession();
  } catch {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    // Validate input
    const publishValidation = publishSchema.safeParse({
      content,
      html,
      commitMessage,
    });
    if (!publishValidation.success) {
      return {
        success: false,
        error: "Invalid publish data: " + publishValidation.error.message,
      };
    }

    const site = await getSiteConfig(siteId);
    if (!site) {
      return {
        success: false,
        error: "Site not found",
      };
    }

    // Get draft for diff
    const draft = getDraftContent(siteId);

    // Prepare HTML
    let finalHtml: string;
    if (html) {
      // Strip change highlights if present
      const hasHighlights =
        html.includes("cognicms-changed") ||
        html.includes("data-cognicms-change-id");

      if (hasHighlights) {
        const dom = new JSDOM(html);
        const { document } = dom.window;

        // Remove highlight styles
        const highlightStyles = document.querySelector(
          "style[data-cognicms-highlight]"
        );
        if (highlightStyles) {
          highlightStyles.remove();
        } else {
          const allStyles = document.querySelectorAll("style");
          allStyles.forEach((style) => {
            if (
              style.textContent &&
              style.textContent.includes("cognicms-changed")
            ) {
              style.remove();
            }
          });
        }

        // Remove highlight classes and attributes
        const changedElements = document.querySelectorAll(".cognicms-changed");
        changedElements.forEach((element) => {
          element.classList.remove("cognicms-changed");
          element.removeAttribute("data-cognicms-change-id");
        });

        finalHtml = dom.serialize();
      } else {
        finalHtml = html;
      }
    } else {
      // Generate HTML from content
      const fileContent = await getFileContent(site, site.htmlFile);
      const baseHtml = fileContent.content;
      finalHtml = generateHtmlFromContent(baseHtml, content);
    }

    // Prepare files for publishing
    const files = [
      {
        path: site.contentFile,
        content: JSON.stringify(content, null, 2),
      },
      {
        path: site.htmlFile,
        content: finalHtml,
      },
    ];

    // Validate GitHub permissions
    const permissionCheck = await validateGitHubPermissions(site);
    if (!permissionCheck.valid) {
      return {
        success: false,
        error: permissionCheck.error || "GitHub permission validation failed",
      };
    }

    // Publish to GitHub
    const result = await publishFiles(site, files, commitMessage);

    // Clear draft
    clearDraftContent(siteId);

    return {
      success: true,
      data: {
        message: result.message || "Published successfully",
        diff: draft ? diffWebsiteContent(draft, content) : [],
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish",
    };
  }
}
