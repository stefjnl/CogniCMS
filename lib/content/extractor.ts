import { JSDOM } from "jsdom";
import {
  WebsiteContent,
  WebsiteSection,
  SectionType,
  WebsiteMetadata,
} from "@/types/content";
import {
  PageDefinition,
  SiteConfigWithPageDefinition,
  SiteDefinitionConfig,
  MetadataFieldDefinition,
  FieldDefinition,
  SelectorDefinition,
  SectionDefinition,
} from "@/types/content-schema";
import { siteDefinitionConfig } from "@/lib/config/site-definitions";
import { extractSemanticElements } from "./semantic-extractor";
import { extractOrphanContent } from "./orphan-extractor";
import {
  generateSectionId,
  generateSelectorForElement,
  generateSectionLabel,
  getDocumentPosition,
} from "./extraction-utils";
import { extractSectionContent } from "./section-content";
import { CONTENT_SCHEMA_VERSION } from "./version";

/**
 * Resolve the PageDefinition to use for a given site + HTML path.
 * This keeps resolution consistent between extraction, editor, and preview.
 */
import { getPageDefinitionForSiteConfig } from "@/lib/config/page-definition-resolver";

/**
 * Resolve the PageDefinition to use for a given site + HTML path.
 * Delegates to the config-only resolver to avoid leaking jsdom into clients.
 */
export function getPageDefinitionForSite(
  htmlFilePath: string,
  siteConfig?: SiteConfigWithPageDefinition,
  config: SiteDefinitionConfig = siteDefinitionConfig
): PageDefinition | null {
  return getPageDefinitionForSiteConfig(htmlFilePath, siteConfig, config);
}

/**
 * Configuration-aware extraction entry point.
 * When a PageDefinition is resolved, it drives deterministic metadata + sections.
 * Otherwise the existing heuristic extraction pipeline is used.
 */
export function extractContentFromHtml(
  html: string,
  options?: {
    htmlFilePath?: string;
    siteConfig?: SiteConfigWithPageDefinition;
  }
): WebsiteContent {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const pageDefinition = options?.htmlFilePath
      ? getPageDefinitionForSite(options.htmlFilePath, options.siteConfig)
      : options?.siteConfig
      ? getPageDefinitionForSite(options.siteConfig.htmlFile, options.siteConfig)
      : null;

    if (pageDefinition) {
      const contentFromSchema = extractWithPageDefinition(
        document,
        pageDefinition
      );
      return contentFromSchema;
    }

    // Fallback: original multi-pass heuristic extraction.
    return extractHeuristic(document);
  } catch (error) {
    console.error("[EXTRACTOR] Extraction failed:", error);
    return {
      metadata: {
        title: "Extraction Failed",
        description: "Unable to extract content from HTML",
        lastModified: new Date().toISOString(),
        schemaVersion: CONTENT_SCHEMA_VERSION,
      },
      sections: [],
      assets: { images: [], links: [] },
    };
  }
}

/**
 * Heuristic extractor preserved for backwards compatibility and as a fallback.
 */
function extractHeuristic(document: Document): WebsiteContent {
  const extractedElements = new Set<Element>();
  const collectedSections: WebsiteSection[] = [];

  console.log("[EXTRACTOR] Starting multi-pass extraction (heuristic)...");

  // PASS 1: Semantic elements
  const semanticSections = extractSemanticElements(document, extractedElements);
  console.log(
    `[EXTRACTOR] Pass 1 (Semantic): Found ${semanticSections.length} sections`
  );
  collectedSections.push(...semanticSections);

  // PASS 2: Explicit sections
  const explicitSections = extractExplicitSections(document, extractedElements);
  console.log(
    `[EXTRACTOR] Pass 2 (Explicit): Found ${explicitSections.length} sections`
  );
  collectedSections.push(...explicitSections);

  // PASS 3: Orphan content
  const orphanSections = extractOrphanContent(document, extractedElements);
  console.log(
    `[EXTRACTOR] Pass 3 (Orphan): Found ${orphanSections.length} sections`
  );
  collectedSections.push(...orphanSections);

  // PASS 4: Sort by document order
  const sections = sortSectionsByDocumentOrder(collectedSections, document);
  console.log(
    `[EXTRACTOR] Pass 4 (Sorting): Total sections = ${sections.length}`
  );

  if (sections.length === 0) {
    console.warn(
      "[EXTRACTOR] No sections found! Creating fallback body section..."
    );
    const fallbackSelector = generateSelectorForElement(document.body, 0);
    sections.push({
      id: "body",
      label: "Main Content",
      type: "content",
      content: extractSectionContent(document.body),
      selector: fallbackSelector,
    });
  }

  console.log("[EXTRACTOR] Extraction complete!");
  console.log(`[EXTRACTOR] Final section count: ${sections.length}`);

  return {
    metadata: extractMetadata(document),
    sections,
    assets: extractAssets(document),
  };
}

/**
 * Apply a PageDefinition to build WebsiteContent deterministically from HTML.
 */
function extractWithPageDefinition(
  document: Document,
  page: PageDefinition
): WebsiteContent {
  console.log(
    `[EXTRACTOR] Using PageDefinition '${page.id}' for schema-driven extraction`
  );

  const metadata = buildMetadataFromDefinition(document, page);
  const sections = buildSectionsFromDefinition(document, page);
  const assets = extractAssets(document);

  return {
    metadata,
    sections,
    assets,
  };
}

/**
 * Build metadata map using MetadataFieldDefinitions; falls back to defaults.
 */
function buildMetadataFromDefinition(
  document: Document,
  page: PageDefinition
): WebsiteMetadata {
  const base: WebsiteMetadata = extractMetadata(document);

  if (!page.metadata || page.metadata.length === 0) {
    return base;
  }

  const result: WebsiteMetadata & Record<string, unknown> = {
    ...base,
  };

  for (const field of page.metadata) {
    const value = readValueFromSelectorDefinition(document, field);
    if (value !== undefined && value !== null && value !== "") {
      result[field.metadataKey as string] = value;
    }
  }

  // Ensure required core keys remain present.
  if (!result.title) {
    result.title = base.title;
  }
  if (!result.description) {
    result.description = base.description;
  }
  if (!result.lastModified) {
    result.lastModified = base.lastModified;
  }

  result.schemaVersion = CONTENT_SCHEMA_VERSION;

  return result;
}

/**
 * Build WebsiteSection[] using configured SectionDefinitions.
 * Heuristic fallback may be appended by the caller if enabled.
 */
function buildSectionsFromDefinition(
  document: Document,
  page: PageDefinition
): WebsiteSection[] {
  const sections: WebsiteSection[] = [];

  for (const def of page.sections) {
    const sectionRoot = resolveSectionRoot(document, def);
    if (!sectionRoot) {
      continue;
    }

    const selector =
      (def as SelectorDefinition).absoluteSelector ||
      generateSelectorForElement(sectionRoot, 0);

    const content: Record<string, unknown> = {};

    for (const field of def.fields) {
      const value = readFieldValue(document, sectionRoot, field);
      if (value !== undefined) {
        content[field.key] = value;
      }
    }

    // Minimal events section support:
    // If the section is configured as "events" with an "upcoming" json field,
    // attempt a simple DOM → array mapping, but never fail extraction if it
    // cannot be parsed. This keeps behavior backwards compatible.
    if (def.id === "events" && "upcoming" in content) {
      const raw = content["upcoming"];
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            content["upcoming"] = parsed;
          }
        } catch {
          // Leave as-is when not valid JSON; extractor must not throw.
        }
      }
    }

    sections.push({
      id: def.id,
      type: def.type,
      label: def.label,
      selector,
      content,
    });
  }

  return sections;
}

function resolveSectionRoot(
  document: Document,
  def: SectionDefinition
): Element | null {
  if (def.absoluteSelector) {
    const el = document.querySelector(def.absoluteSelector);
    if (el) {
      return el;
    }
  }

  // If only relative selector provided, interpret it from document root.
  if (def.relativeSelector) {
    const el = document.querySelector(def.relativeSelector);
    if (el) {
      return el;
    }
  }

  return null;
}

function readFieldValue(
  document: Document,
  sectionRoot: Element,
  field: FieldDefinition
): unknown {
  const target =
    (field.absoluteSelector
      ? document.querySelector(field.absoluteSelector)
      : null) ||
    (field.relativeSelector
      ? sectionRoot.querySelector(field.relativeSelector)
      : null);

  if (!target) {
    return undefined;
  }

  if (field.attributeName) {
    const attr = target.getAttribute(field.attributeName);
    return attr ?? undefined;
  }

  // For now we treat everything as text-ish, JSON/list/faq fields can be post-processed in UI.
  const text = target.textContent?.trim() ?? "";
  if (!text) {
    return undefined;
  }

  if (field.type === "number") {
    const asNumber = Number(text);
    return Number.isNaN(asNumber) ? undefined : asNumber;
  }

  return text;
}

/**
 * Generic helper for metadata fields using SelectorDefinition.
 */
function readValueFromSelectorDefinition(
  document: Document,
  def: MetadataFieldDefinition
): string | undefined {
  const target =
    (def.absoluteSelector
      ? document.querySelector(def.absoluteSelector)
      : null) ||
    (def.relativeSelector
      ? document.querySelector(def.relativeSelector)
      : null);

  if (!target) {
    return undefined;
  }

  if (def.attributeName) {
    const attr = target.getAttribute(def.attributeName);
    return attr ?? undefined;
  }

  const text = target.textContent?.trim() ?? "";
  return text || undefined;
}

function extractExplicitSections(
  document: Document,
  extractedElements: Set<Element>
): WebsiteSection[] {
  const sections: WebsiteSection[] = [];
  const sectionElements = Array.from(document.querySelectorAll("section"));

  sectionElements.forEach((element, index) => {
    if (extractedElements.has(element)) {
      return;
    }

    const content = extractSectionContent(element);
    if (Object.keys(content).length === 0) {
      return;
    }

    const type = inferSectionType(element);
    const id = generateSectionId(element, "section", index);
    const label = generateSectionLabel(element, index, `Section ${index + 1}`);
    const selector = generateSelectorForElement(element, index);

    sections.push({
      id,
      type,
      label,
      content,
      selector,
    });

    extractedElements.add(element);
  });

  return sections;
}

function sortSectionsByDocumentOrder(
  sections: WebsiteSection[],
  document: Document
): WebsiteSection[] {
  const maxPosition = Number.MAX_SAFE_INTEGER;

  const resolvePosition = (section: WebsiteSection): number => {
    if (section.selector) {
      const selectorElement = document.querySelector(section.selector);
      if (selectorElement) {
        return getDocumentPosition(selectorElement, document);
      }
    }

    let candidate: Element | null = document.getElementById(section.id);
    if (!candidate) {
      candidate = document.querySelector(`[data-section-id="${section.id}"]`);
    }

    if (candidate) {
      return getDocumentPosition(candidate, document);
    }

    return maxPosition;
  };

  return [...sections].sort((a, b) => resolvePosition(a) - resolvePosition(b));
}

function inferSectionType(element: Element): SectionType {
  const explicitType = element.getAttribute("data-section-type");
  if (explicitType && isKnownSectionType(explicitType)) {
    return explicitType;
  }

  const tagName = element.tagName.toLowerCase();
  const semanticTypeMap: Record<string, SectionType> = {
    header: "hero",
    nav: "navigation",
    footer: "footer",
    article: "article",
    aside: "sidebar",
    main: "main",
  };

  if (semanticTypeMap[tagName]) {
    return semanticTypeMap[tagName];
  }

  if (element.querySelector("form")) {
    return "contact";
  }

  if (element.querySelector("nav, [role='navigation']")) {
    return "navigation";
  }

  if (element.querySelector("footer, [role='contentinfo']")) {
    return "footer";
  }

  if (element.querySelector("ul, ol")) {
    return "list";
  }

  if (element.querySelector("h1")) {
    return "hero";
  }

  return "content";
}

function isKnownSectionType(value: string): value is SectionType {
  const validTypes: SectionType[] = [
    "hero",
    "content",
    "list",
    "contact",
    "navigation",
    "footer",
    "article",
    "sidebar",
    "main",
    "orphan",
    "custom",
  ];

  return validTypes.includes(value as SectionType);
}

function extractMetadata(document: Document): WebsiteContent["metadata"] {
  return {
    title: document.title ?? "",
    description:
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") ?? "",
    lastModified: new Date().toISOString(),
    schemaVersion: CONTENT_SCHEMA_VERSION,
  };
}

function extractAssets(document: Document): WebsiteContent["assets"] {
  const imageNodes = Array.from(
    document.querySelectorAll("img") as NodeListOf<HTMLImageElement>
  );
  const linkNodes = Array.from(
    document.querySelectorAll("a") as NodeListOf<HTMLAnchorElement>
  );

  return {
    images: imageNodes
      .map((img) => img.getAttribute("src"))
      .filter((src): src is string => Boolean(src)),
    links: linkNodes
      .map((anchor) => ({
        text: anchor.textContent?.trim() ?? "",
        url: anchor.getAttribute("href") ?? "",
      }))
      .filter((link) => Boolean(link.url)),
  };
}
