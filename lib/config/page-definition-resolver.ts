import {
  PageDefinition,
  SiteConfigWithPageDefinition,
  SiteDefinitionConfig,
} from "@/types/content-schema";
import { siteDefinitionConfig } from "@/lib/config/site-definitions";

/**
 * Resolve the PageDefinition to use for a given site + HTML path based purely on config.
 * This is safe for both client and server usage (no jsdom / Node-only APIs).
 *
 * This keeps resolution consistent between extractor, editor, and preview without
 * forcing jsdom into client bundles.
 */
export function getPageDefinitionForSiteConfig(
  htmlFilePath: string,
  siteConfig?: SiteConfigWithPageDefinition,
  config: SiteDefinitionConfig = siteDefinitionConfig
): PageDefinition | null {
  if (!config || !config.pages) {
    return null;
  }

  // 1) Explicit inline PageDefinition on the site config.
  if (siteConfig?.pageDefinition) {
    return siteConfig.pageDefinition;
  }

  // 2) pageDefinitionId pointing into the registry.
  if (siteConfig?.pageDefinitionId) {
    const fromId = config.pages[siteConfig.pageDefinitionId];
    if (fromId) {
      return fromId;
    }
  }

  // 3) Match based on htmlPath when provided on the definition.
  const byHtmlPath = Object.values(config.pages).find(
    (page) => page.htmlPath && page.htmlPath === htmlFilePath
  );
  if (byHtmlPath) {
    return byHtmlPath;
  }

  // 4) Fallback to configured defaultPageId if present.
  if (config.defaultPageId) {
    const fallback = config.pages[config.defaultPageId];
    if (fallback) {
      return fallback;
    }
  }

  return null;
}