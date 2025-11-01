import { JSDOM } from "jsdom";
import { WebsiteContent, WebsiteSection, SectionType } from "@/types/content";

/**
 * Generate a unique selector for an element that can be used to find it later
 */
function generateSelectorForElement(element: Element, index: number): string {
  // Strategy 1: If element has an ID, use it
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Strategy 2: Use class names with element type
  if (element.className) {
    const classes = element.className.trim().split(/\s+/).filter(Boolean);
    if (classes.length > 0) {
      return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
    }
  }
  
  // Strategy 3: Use element type with position
  const parent = element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.querySelectorAll(element.tagName.toLowerCase()));
    const siblingIndex = siblings.indexOf(element);
    if (siblingIndex > 0) {
      return `${element.tagName.toLowerCase()}:nth-of-type(${siblingIndex + 1})`;
    }
  }
  
  // Strategy 4: Use element type with section index
  return `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
}

function inferSectionType(element: Element): SectionType {
  if (element.getAttribute("data-section-type")) {
    return element.getAttribute("data-section-type") as SectionType;
  }
  if (element.querySelector("form")) return "contact";
  if (element.querySelector("ul,ol")) return "list";
  if (element.querySelector("h1, h2")) return "hero";
  return "content";
}

function extractSectionContent(element: Element): Record<string, unknown> {
  const content: Record<string, unknown> = {};

  const heading = element.querySelector("h1, h2, h3");
  if (heading) {
    content.heading = heading.textContent?.trim() ?? "";
  }

  const paragraphs = Array.from(element.querySelectorAll("p")).map(
    (p) => p.textContent?.trim() ?? ""
  );
  if (paragraphs.length > 0) {
    content.paragraphs = paragraphs;
  }

  const lists = Array.from(element.querySelectorAll("ul, ol"));
  if (lists.length > 0) {
    content.lists = lists.map((list) =>
      Array.from(list.querySelectorAll("li")).map(
        (li) => li.textContent?.trim() ?? ""
      )
    );
  }

  const anchors = Array.from(element.querySelectorAll("a"));
  if (anchors.length > 0) {
    content.links = anchors.map((a) => ({
      text: a.textContent?.trim() ?? "",
      href: a.getAttribute("href") ?? "",
    }));
  }

  return content;
}

export function extractContentFromHtml(html: string): WebsiteContent {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const metadata = {
    title: document.title ?? "",
    description:
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") ?? "",
    lastModified: new Date().toISOString(),
  };

  const sections: WebsiteSection[] = [];
  const sectionElements = document.querySelectorAll("section");

  sectionElements.forEach((element: Element, index: number) => {
    const id = element.getAttribute("id") ?? `section-${index + 1}`;
    const label =
      element.getAttribute("aria-label") ??
      element.getAttribute("data-label") ??
      id;
    
    // Generate a reliable selector for this element
    const selector = generateSelectorForElement(element, index);

    sections.push({
      id,
      label,
      type: inferSectionType(element),
      content: extractSectionContent(element),
      selector, // Store the selector for later use
    });
  });

  if (sections.length === 0) {
    sections.push({
      id: "body",
      label: "Main Content",
      type: "content",
      content: extractSectionContent(document.body),
    });
  }

  const imageNodes = Array.from(
    document.querySelectorAll("img") as NodeListOf<HTMLImageElement>
  );
  const linkNodes = Array.from(
    document.querySelectorAll("a") as NodeListOf<HTMLAnchorElement>
  );

  const assets = {
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

  return {
    metadata,
    sections,
    assets,
  };
}
