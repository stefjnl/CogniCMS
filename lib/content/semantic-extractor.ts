import { WebsiteSection } from "@/types/content";
import {
  generateSectionId,
  generateSelectorForElement,
} from "./extraction-utils";
import { extractSectionContent } from "./section-content";

export function extractSemanticElements(
  document: Document,
  extractedElements: Set<Element>
): WebsiteSection[] {
  const sections: WebsiteSection[] = [];

  const semanticMappings = [
    { selector: "header", type: "hero" as const, label: "Header" },
    { selector: "nav", type: "navigation" as const, label: "Navigation" },
    { selector: "main", type: "main" as const, label: "Main Content" },
    { selector: "footer", type: "footer" as const, label: "Footer" },
    { selector: "article", type: "article" as const, label: "Article" },
    { selector: "aside", type: "sidebar" as const, label: "Sidebar" },
  ];

  semanticMappings.forEach(({ selector, type, label }) => {
    const elements = Array.from(document.querySelectorAll(selector));
    console.log(
      `[SEMANTIC] Processing ${selector}: found ${elements.length} element(s)`
    );

    elements.forEach((element, index) => {
      if (extractedElements.has(element)) {
        console.log(
          `[SEMANTIC]   - Skipping ${selector}[${index}]: already extracted`
        );
        return;
      }

      const content = extractSectionContent(element);
      if (Object.keys(content).length === 0) {
        console.log(
          `[SEMANTIC]   - Skipping ${selector}[${index}]: no content`
        );
        return;
      }

      const sectionId = generateSectionId(element, selector, index);
      const sectionSelector = generateSelectorForElement(element, index);
      const sectionLabel =
        elements.length > 1 ? `${label} ${index + 1}` : label;

      console.log(
        `[SEMANTIC]   ✓ Extracted ${selector}[${index}] as "${sectionLabel}" with ${
          Object.keys(content).length
        } fields`
      );

      sections.push({
        id: sectionId,
        type,
        label: sectionLabel,
        content,
        selector: sectionSelector,
      });

      extractedElements.add(element);
    });
  });

  return sections;
}
