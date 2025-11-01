import { JSDOM } from "jsdom";
import { WebsiteContent, WebsiteSection, SectionType } from "@/types/content";
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

export function extractContentFromHtml(html: string): WebsiteContent {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const extractedElements = new Set<Element>();
    const collectedSections: WebsiteSection[] = [];

    console.log("[EXTRACTOR] Starting multi-pass extraction...");

    // PASS 1: Semantic elements
    const semanticSections = extractSemanticElements(
      document,
      extractedElements
    );
    console.log(
      `[EXTRACTOR] Pass 1 (Semantic): Found ${semanticSections.length} sections`
    );
    semanticSections.forEach((s) =>
      console.log(`  - ${s.label} (${s.type}) [${s.id}]`)
    );
    collectedSections.push(...semanticSections);

    // PASS 2: Explicit sections
    const explicitSections = extractExplicitSections(
      document,
      extractedElements
    );
    console.log(
      `[EXTRACTOR] Pass 2 (Explicit): Found ${explicitSections.length} sections`
    );
    explicitSections.forEach((s) =>
      console.log(`  - ${s.label} (${s.type}) [${s.id}]`)
    );
    collectedSections.push(...explicitSections);

    // PASS 3: Orphan content
    const orphanSections = extractOrphanContent(document, extractedElements);
    console.log(
      `[EXTRACTOR] Pass 3 (Orphan): Found ${orphanSections.length} sections`
    );
    orphanSections.forEach((s) =>
      console.log(`  - ${s.label} (${s.type}) [${s.id}]`)
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
