import { JSDOM } from "jsdom";
import { WebsiteContent, WebsiteSection, SectionType } from "@/types/content";

const SECTION_TYPE_TO_TAG: Record<SectionType, string> = {
  hero: "header",
  navigation: "nav",
  footer: "footer",
  article: "article",
  sidebar: "aside",
  main: "main",
  content: "section",
  list: "section",
  contact: "section",
  orphan: "div",
  custom: "section",
};

function updateSectionElement(element: Element, section: WebsiteSection) {
  const { content } = section;

  // Handle all content fields dynamically
  Object.entries(content).forEach(([fieldName, value]) => {
    // Skip if value is null/undefined
    if (value === null || value === undefined) return;

    // Handle string values (most common case)
    if (typeof value === "string") {
      // Try multiple strategies to find the right element to update

      // Strategy 1: Look for element with data-field attribute
      let target = element.querySelector(`[data-field="${fieldName}"]`);

      // Strategy 2: Look for element with data-section-field attribute
      if (!target) {
        target = element.querySelector(`[data-section-field="${fieldName}"]`);
      }

      // Strategy 3: Field-specific semantic mappings
      if (!target) {
        if (
          fieldName === "heading" ||
          fieldName === "title" ||
          fieldName.toLowerCase().includes("title")
        ) {
          target = element.querySelector("h1, h2, h3, h4, h5, h6");
        } else if (fieldName === "subtitle" || fieldName === "subheading") {
          // Try to find the second heading, or a paragraph after the main heading
          const headings = Array.from(
            element.querySelectorAll("h1, h2, h3, h4, h5, h6")
          );
          target =
            headings[1] || element.querySelector("h1 + p, h2 + p, h3 + p");
        } else if (
          fieldName === "text" ||
          fieldName === "description" ||
          fieldName.toLowerCase().includes("text")
        ) {
          target = element.querySelector("p");
        } else if (
          fieldName === "cta" ||
          fieldName.toLowerCase().includes("button")
        ) {
          target = element.querySelector("a, button");
        }
      }

      // Update the target element
      if (target) {
        if (target.tagName === "A" || target.tagName === "BUTTON") {
          target.textContent = value;
        } else if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA"
        ) {
          (target as HTMLInputElement).value = value;
        } else {
          target.textContent = value;
        }
      }
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (fieldName === "paragraphs") {
        const paragraphs = Array.from(element.querySelectorAll("p"));
        value.forEach((val: unknown, index: number) => {
          if (typeof val !== "string") return;
          if (paragraphs[index]) {
            paragraphs[index].textContent = val;
          } else {
            const paragraph = element.ownerDocument?.createElement("p");
            if (paragraph) {
              paragraph.textContent = val;
              element.appendChild(paragraph);
            }
          }
        });
      } else if (fieldName === "lists") {
        const listElements = Array.from(element.querySelectorAll("ul, ol"));
        value.forEach((items: unknown, index: number) => {
          if (!Array.isArray(items)) return;
          const list = listElements[index];
          if (!list) return;
          Array.from(list.children).forEach((child) => child.remove());
          items.forEach((item) => {
            if (typeof item !== "string") return;
            const li = element.ownerDocument?.createElement("li");
            if (li) {
              li.textContent = item;
              list.appendChild(li);
            }
          });
        });
      } else if (fieldName === "links") {
        const anchors = Array.from(element.querySelectorAll("a"));
        value.forEach((link: unknown, index: number) => {
          if (!link || typeof link !== "object") return;
          const anchor = anchors[index];
          if (!anchor) return;
          const { text, href } = link as { text?: string; href?: string };
          if (text) anchor.textContent = text;
          if (href) anchor.setAttribute("href", href);
        });
      }
    }
  });
}

export function generateHtmlFromContent(
  html: string,
  content: WebsiteContent
): string {
  const dom = new JSDOM(html);
  const { document } = dom.window;

  if (content.metadata?.title) {
    document.title = content.metadata.title;
  }

  if (content.metadata?.description) {
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.setAttribute("name", "description");
      document.head.appendChild(description);
    }
    description.setAttribute("content", content.metadata.description);
  }

  // Handle both array and object formats for sections
  const sectionsArray = Array.isArray(content.sections)
    ? content.sections
    : Object.entries(content.sections).map(([id, section]: [string, any]) => ({
        id,
        label: section.label || id,
        type: section.type || "content",
        content: section.content || section,
      }));

  sectionsArray.forEach((section: WebsiteSection) => {
    const tagName =
      SECTION_TYPE_TO_TAG[section.type as SectionType] ?? "section";
    // Try multiple selectors to find the section element
    let element =
      (section.selector ? document.querySelector(section.selector) : null) ||
      document.querySelector(`#${section.id}`) ||
      document.querySelector(`[data-section="${section.id}"]`) ||
      document.querySelector(`[data-section-id="${section.id}"]`) ||
      document.querySelector(`.${section.id}`);

    // If not found by ID/data attributes, try semantic elements
    if (!element) {
      const sectionId = section.id.toLowerCase();
      if (sectionId === "header") {
        element = document.querySelector("header");
      } else if (sectionId === "footer") {
        element = document.querySelector("footer");
      } else if (sectionId === "nav" || sectionId === "navigation") {
        element = document.querySelector("nav");
      } else if (sectionId === "main") {
        element = document.querySelector("main");
      } else if (sectionId === "aside") {
        element = document.querySelector("aside");
      } else if (sectionId === "article") {
        element = document.querySelector("article");
      } else if (sectionId === "section") {
        element = document.querySelector("section");
      }
    }

    // If we found an element but it doesn't have proper identification, add it
    if (
      element &&
      !element.id &&
      !element.getAttribute("data-section") &&
      !element.getAttribute("data-section-id")
    ) {
      // Add ID if it's a semantic element that matches
      const sectionId = section.id.toLowerCase();
      if (sectionId === "header" && element.tagName === "HEADER") {
        element.id = section.id;
      } else if (sectionId === "footer" && element.tagName === "FOOTER") {
        element.id = section.id;
      } else if (sectionId === "nav" && element.tagName === "NAV") {
        element.id = section.id;
      } else if (sectionId === "main" && element.tagName === "MAIN") {
        element.id = section.id;
      } else if (sectionId === "aside" && element.tagName === "ASIDE") {
        element.id = section.id;
      } else if (sectionId === "article" && element.tagName === "ARTICLE") {
        element.id = section.id;
      } else if (sectionId === "section" && element.tagName === "SECTION") {
        element.id = section.id;
      } else {
        // For non-matching elements, add data attributes instead
        element.setAttribute("data-section", section.id);
      }
    }

    if (!element) {
      console.warn(`Section element not found for: ${section.id}`);
      return;
    }

    if (!element) {
      element = document.createElement(tagName);
      element.id = section.id;
      document.body.appendChild(element);
    }

    updateSectionElement(element, section);
  });

  return dom.serialize();
}
