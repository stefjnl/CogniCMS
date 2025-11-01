import { WebsiteSection } from "@/types/content";
import {
  generateSectionId,
  generateSelectorForElement,
  hasEditableContent,
  isWithinExtracted,
} from "./extraction-utils";
import { extractSectionContent } from "./section-content";

export function extractOrphanContent(
  document: Document,
  extractedElements: Set<Element>
): WebsiteSection[] {
  const sections: WebsiteSection[] = [];
  const orphanElements: Element[] = [];

  const bodyChildren = Array.from(document.body.children);

  bodyChildren.forEach((child) => {
    if (extractedElements.has(child)) {
      return;
    }

    if (isWithinExtracted(child, extractedElements)) {
      return;
    }

    if (!hasEditableContent(child)) {
      return;
    }

    orphanElements.push(child);
  });

  orphanElements.forEach((element, index) => {
    const content = extractSectionContent(element);
    if (Object.keys(content).length === 0) {
      return;
    }

    const sectionId = generateSectionId(element, "orphan", index);
    const selector = generateSelectorForElement(element, index);

    sections.push({
      id: sectionId,
      type: "orphan",
      label: `Other Content ${index + 1}`,
      content,
      selector,
    });

    extractedElements.add(element);
  });

  return sections;
}
