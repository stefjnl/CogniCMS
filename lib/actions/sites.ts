"use server";

import { requireSession } from "@/lib/utils/auth";
import {
  getSiteConfig,
  listSites,
  createSite,
  updateSite,
  deleteSite,
} from "@/lib/storage/sites";
import { siteSchema } from "@/lib/utils/validation";
import type { SiteConfig } from "@/types/site";
import type { SiteInput } from "@/lib/utils/validation";

/**
 * Site Management Server Actions
 *
 * These actions handle CRUD operations for sites with proper
 * authentication and validation.
 */

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get all sites for the current user
 */
export async function getSitesAction(): Promise<ActionResult<SiteConfig[]>> {
  try {
    await requireSession();
  } catch {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const sites = await listSites();
    // Convert to full site configs
    const fullSites = await Promise.all(
      sites.map(async (summary) => await getSiteConfig(summary.id))
    );
    return {
      success: true,
      data: fullSites.filter((s): s is SiteConfig => s !== null),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch sites",
    };
  }
}

/**
 * Get a single site by ID
 */
export async function getSiteAction(
  siteId: string
): Promise<ActionResult<SiteConfig>> {
  try {
    await requireSession();
  } catch {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const site = await getSiteConfig(siteId);
    if (!site) {
      return {
        success: false,
        error: "Site not found",
      };
    }
    return {
      success: true,
      data: site,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch site",
    };
  }
}

/**
 * Create a new site
 */
export async function createSiteAction(
  input: SiteInput
): Promise<ActionResult<SiteConfig>> {
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
    const validation = siteSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: "Invalid site data: " + validation.error.message,
      };
    }

    const site = await createSite(validation.data);
    return {
      success: true,
      data: site,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create site",
    };
  }
}

/**
 * Update an existing site
 */
export async function updateSiteAction(
  siteId: string,
  updates: Partial<SiteInput>
): Promise<ActionResult<SiteConfig>> {
  try {
    await requireSession();
  } catch {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const site = await updateSite(siteId, updates);
    if (!site) {
      return {
        success: false,
        error: "Site not found",
      };
    }
    return {
      success: true,
      data: site,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update site",
    };
  }
}

/**
 * Delete a site
 */
export async function deleteSiteAction(
  siteId: string
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
    await deleteSite(siteId);
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete site",
    };
  }
}
