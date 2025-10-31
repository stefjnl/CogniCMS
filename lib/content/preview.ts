import { JSDOM } from "jsdom";
import { PreviewChange } from "@/types/content";

/**
 * Apply changes to HTML by modifying the DOM elements
 */
export function applyChangesToHTML(
  originalHTML: string,
  changes: PreviewChange[]
): string {
  if (!changes || changes.length === 0) {
    return originalHTML;
  }

  const dom = new JSDOM(originalHTML);
  const { document } = dom.window;

  for (const change of changes) {
    try {
      const selector = getSelectorForChange(change);
      const element = document.querySelector(selector);
      
      if (!element) {
        console.warn(`Element not found for selector: ${selector}`);
        continue;
      }

      // Apply the change based on the field type
      applyChangeToElement(element, change);
    } catch (error) {
      console.error(`Failed to apply change:`, change, error);
    }
  }

  return dom.serialize();
}

/**
 * Add visual highlights to changed elements in the HTML
 */
export function addChangeHighlights(
  html: string,
  changes: PreviewChange[]
): string {
  if (!changes || changes.length === 0) {
    return html;
  }

  const dom = new JSDOM(html);
  const { document } = dom.window;

  // Inject highlight CSS into the head
  const style = document.createElement("style");
  style.textContent = `
    .cognicms-changed {
      outline: 3px solid #16a34a !important;
      outline-offset: 2px;
      background-color: rgba(34, 197, 94, 0.1) !important;
      position: relative;
      animation: cognicms-pulse 2s ease-in-out 3;
    }

    @keyframes cognicms-pulse {
      0%, 100% {
        outline-color: #16a34a;
        background-color: rgba(34, 197, 94, 0.1);
      }
      50% {
        outline-color: #22c55e;
        background-color: rgba(34, 197, 94, 0.2);
      }
    }

    .cognicms-changed::after {
      content: "✏️ Modified";
      position: absolute;
      top: -24px;
      left: 0;
      background-color: #16a34a;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      font-family: system-ui, -apple-system, sans-serif;
      white-space: nowrap;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  `;
  document.head.appendChild(style);

  // Add the class to changed elements
  for (const change of changes) {
    try {
      const selector = getSelectorForChange(change);
      const element = document.querySelector(selector);
      
      if (element) {
        element.classList.add("cognicms-changed");
        element.setAttribute("data-cognicms-change-id", `${change.sectionId}-${change.field}`);
      }
    } catch (error) {
      console.error(`Failed to highlight change:`, change, error);
    }
  }

  return dom.serialize();
}

/**
 * Get CSS selector for a change
 */
export function getSelectorForChange(change: PreviewChange): string {
  // Primary approach: use the section ID as an element ID
  return `#${change.sectionId}`;
}

/**
 * Apply a change to a DOM element
 */
function applyChangeToElement(element: Element, change: PreviewChange): void {
  const { field, proposedValue } = change;

  // Handle different field types
  if (field === "heading" || field === "title") {
    const heading = element.querySelector("h1, h2, h3, h4, h5, h6");
    if (heading && typeof proposedValue === "string") {
      heading.textContent = proposedValue;
    }
  } else if (field === "text" || field === "description") {
    const paragraph = element.querySelector("p");
    if (paragraph && typeof proposedValue === "string") {
      paragraph.textContent = proposedValue;
    }
  } else if (field === "paragraphs" && Array.isArray(proposedValue)) {
    const paragraphs = Array.from(element.querySelectorAll("p"));
    proposedValue.forEach((value: unknown, index: number) => {
      if (typeof value === "string" && paragraphs[index]) {
        paragraphs[index].textContent = value;
      }
    });
  } else if (field === "lists" && Array.isArray(proposedValue)) {
    const lists = Array.from(element.querySelectorAll("ul, ol"));
    proposedValue.forEach((items: unknown, index: number) => {
      if (!Array.isArray(items)) return;
      const list = lists[index];
      if (!list) return;
      
      // Clear existing items
      Array.from(list.children).forEach(child => child.remove());
      
      // Add new items
      items.forEach((item: unknown) => {
        if (typeof item === "string") {
          const li = element.ownerDocument?.createElement("li");
          if (li) {
            li.textContent = item;
            list.appendChild(li);
          }
        }
      });
    });
  } else if (field === "links" && Array.isArray(proposedValue)) {
    const anchors = Array.from(element.querySelectorAll("a"));
    proposedValue.forEach((link: unknown, index: number) => {
      if (!link || typeof link !== "object") return;
      const anchor = anchors[index];
      if (!anchor) return;
      
      const { text, href } = link as { text?: string; href?: string };
      if (text) anchor.textContent = text;
      if (href) anchor.setAttribute("href", href);
    });
  } else {
    // Generic fallback: try to find an element with matching data attribute or class
    const target = element.querySelector(`[data-field="${field}"]`) || element;
    if (typeof proposedValue === "string") {
      target.textContent = proposedValue;
    }
  }
}
