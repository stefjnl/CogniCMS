import { JSDOM } from "jsdom";
import { PreviewChange } from "@/types/content";

/**
 * Get the actual selector for a section change
 * This function tries multiple strategies to find the right element
 */
export function getSelectorForChange(change: PreviewChange, sections?: any[]): string {
  const selectors = [];
  
  // If we have sections data, try to find the matching section and use its selector
  if (sections) {
    const matchingSection = sections.find(section => section.id === change.sectionId);
    if (matchingSection && matchingSection.selector) {
      selectors.push(matchingSection.selector);
    }
  }
  
  // Strategy 1: Try ID matching section ID
  selectors.push(`#${change.sectionId}`);
  
  // Strategy 2: Try data attribute matching section ID
  selectors.push(`[data-section="${change.sectionId}"]`);
  selectors.push(`[data-section-id="${change.sectionId}"]`);
  
  // Strategy 3: Try class matching section ID
  selectors.push(`.${change.sectionId}`);
  
  // Strategy 4: Try semantic elements based on section ID
  const sectionId = change.sectionId.toLowerCase();
  if (sectionId === 'header') {
    selectors.push('header');
  } else if (sectionId === 'footer') {
    selectors.push('footer');
  } else if (sectionId === 'nav' || sectionId === 'navigation') {
    selectors.push('nav');
  } else if (sectionId === 'main') {
    selectors.push('main');
  } else if (sectionId === 'aside') {
    selectors.push('aside');
  } else if (sectionId === 'article') {
    selectors.push('article');
  } else if (sectionId === 'section') {
    selectors.push('section');
  }
  
  // Strategy 5: Try elements with specific IDs that might contain the content
  // Based on the known IDs in the HTML
  const knownIds = ['newsletter', 'newsletterForm', 'newsletterFeedback', 'copyEmailBtn', 'backToTop', 'privacyModal', 'privacyClose', 'copyFeedback'];
  if (knownIds.includes(change.sectionId)) {
    selectors.push(`#${change.sectionId}`);
  }
  
  // Return all selectors as a comma-separated list
  // The applyChangesToHTML will use querySelector which will try them in order
  return selectors.join(', ');
}

/**
 * Apply changes to HTML by modifying the DOM elements
 */
export function applyChangesToHTML(
  originalHTML: string,
  changes: PreviewChange[],
  sections?: any[]
): string {
  console.log("[APPLY_CHANGES] Starting applyChangesToHTML");
  console.log("[APPLY_CHANGES] Original HTML length:", originalHTML?.length || 0);
  console.log("[APPLY_CHANGES] Number of changes:", changes?.length || 0);
  console.log("[APPLY_CHANGES] Changes:", JSON.stringify(changes, null, 2));

  if (!changes || changes.length === 0) {
    console.log("[APPLY_CHANGES] No changes to apply, returning original HTML");
    return originalHTML;
  }

  const dom = new JSDOM(originalHTML);
  const { document } = dom.window;

  console.log("[APPLY_CHANGES] DOM created, document element:", document.documentElement?.tagName);

  for (const change of changes) {
    try {
      console.log("[APPLY_CHANGES] Processing change:", change);
      const selector = getSelectorForChange(change, sections);
      console.log("[APPLY_CHANGES] Generated selector:", selector);
      
      const element = document.querySelector(selector);

      if (!element) {
        console.warn(`[APPLY_CHANGES] Element not found for selector: ${selector}`);
        console.log("[APPLY_CHANGES] Available elements in document:");
        console.log("[APPLY_CHANGES] All IDs:", Array.from(document.querySelectorAll('[id]')).map(el => el.id));
        console.log("[APPLY_CHANGES] All data-section attributes:", Array.from(document.querySelectorAll('[data-section]')).map(el => el.getAttribute('data-section')));
        console.log("[APPLY_CHANGES] All data-section-id attributes:", Array.from(document.querySelectorAll('[data-section-id]')).map(el => el.getAttribute('data-section-id')));
        console.log("[APPLY_CHANGES] All classes:", Array.from(document.querySelectorAll('[class]')).map(el => el.className));
        continue;
      }

      console.log("[APPLY_CHANGES] Found element:", element.tagName, element.id, element.className);
      
      // Apply the change based on the field type
      applyChangeToElement(element, change);
      console.log("[APPLY_CHANGES] Change applied successfully");
    } catch (error) {
      console.error(`[APPLY_CHANGES] Failed to apply change:`, change, error);
    }
  }

  const result = dom.serialize();
  console.log("[APPLY_CHANGES] Result HTML length:", result?.length || 0);
  return result;
}

/**
 * Add visual highlights to changed elements in the HTML
 */
export function addChangeHighlights(
  html: string,
  changes: PreviewChange[],
  sections?: any[]
): string {
  if (!changes || changes.length === 0) {
    return html;
  }

  const dom = new JSDOM(html);
  const { document } = dom.window;

  // Inject highlight CSS into the head
  const style = document.createElement("style");
  style.setAttribute("data-cognicms-highlight", "true");
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
      const selector = getSelectorForChange(change, sections);
      const element = document.querySelector(selector);

      if (element) {
        element.classList.add("cognicms-changed");
        element.setAttribute(
          "data-cognicms-change-id",
          `${change.sectionId}-${change.field}`
        );
      }
    } catch (error) {
      console.error(`Failed to highlight change:`, change, error);
    }
  }

  return dom.serialize();
}


/**
 * Apply a change to a DOM element
 */
function applyChangeToElement(element: Element, change: PreviewChange): void {
  const { field, proposedValue } = change;

  console.log("[APPLY_CHANGE] Applying change to element:", {
    field,
    proposedValue,
    elementType: element.tagName,
    elementId: element.id,
    elementClass: element.className,
    elementContent: element.textContent?.substring(0, 100)
  });

  // Try multiple strategies to find and update the right element

  // Strategy 1: Look for element with data-field attribute
  let target = element.querySelector(`[data-field="${field}"]`);
  console.log("[APPLY_CHANGE] Strategy 1 - data-field selector result:", target?.tagName);

  // Strategy 2: Look for element with data-section-field attribute
  if (!target) {
    target = element.querySelector(`[data-section-field="${field}"]`);
    console.log("[APPLY_CHANGE] Strategy 2 - data-section-field selector result:", target?.tagName);
  }

  // Strategy 3: Field-specific mappings for common patterns
  if (!target) {
    if (
      field === "heading" ||
      field === "title" ||
      field.toLowerCase().includes("title")
    ) {
      target = element.querySelector("h1, h2, h3, h4, h5, h6");
      console.log("[APPLY_CHANGE] Strategy 3a - heading selector result:", target?.tagName);
    } else if (
      field === "text" ||
      field === "description" ||
      field === "subtitle" ||
      field.toLowerCase().includes("text") ||
      field.toLowerCase().includes("description")
    ) {
      // For text fields, try to find the most appropriate text element
      // First try paragraphs
      target = element.querySelector("p");
      console.log("[APPLY_CHANGE] Strategy 3b - paragraph selector result:", target?.tagName);
      
      // If no paragraph, try buttons (for newsletter signup, etc.)
      if (!target) {
        target = element.querySelector("button");
        console.log("[APPLY_CHANGE] Strategy 3b2 - button selector result:", target?.tagName);
      }
      
      // If still no target, try spans or divs with text content
      if (!target) {
        const textElements = Array.from(element.querySelectorAll("span, div")).filter(
          el => el.textContent && el.textContent.trim().length > 0
        );
        if (textElements.length > 0) {
          target = textElements[0];
          console.log("[APPLY_CHANGE] Strategy 3b3 - text element selector result:", target?.tagName);
        }
      }
    } else if (
      field.toLowerCase().includes("button") ||
      field.toLowerCase().includes("cta")
    ) {
      target = element.querySelector("a, button");
      console.log("[APPLY_CHANGE] Strategy 3c - button selector result:", target?.tagName);
    }
  }

  // Strategy 4: Use the parent element itself (only if it's a simple text container)
  if (!target && (element.tagName === "P" || element.tagName === "SPAN" || element.tagName === "A" || element.tagName === "BUTTON")) {
    target = element;
    console.log("[APPLY_CHANGE] Strategy 4 - using parent element as it's a text container");
  }

  // If we still don't have a target, don't replace the entire element
  if (!target) {
    console.warn("[APPLY_CHANGE] No suitable target found, skipping update to avoid destroying element structure");
    return;
  }

  console.log("[APPLY_CHANGE] Final target element:", {
    tagName: target.tagName,
    id: target.id,
    className: target.className,
    currentContent: target.textContent?.substring(0, 100)
  });

  // Apply the value based on type
  if (typeof proposedValue === "string") {
    console.log("[APPLY_CHANGE] Applying string value:", proposedValue);
    // For simple strings, update text content
    if (target.tagName === "A" || target.tagName === "BUTTON") {
      target.textContent = proposedValue;
    } else if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      (target as HTMLInputElement).value = proposedValue;
    } else {
      // For most elements, update text content
      target.textContent = proposedValue;
    }
    console.log("[APPLY_CHANGE] String value applied, new content:", target.textContent?.substring(0, 100));
  } else if (Array.isArray(proposedValue)) {
    console.log("[APPLY_CHANGE] Applying array value:", proposedValue);
    // Handle arrays (lists, paragraphs, etc.)
    if (field === "paragraphs") {
      const paragraphs = Array.from(element.querySelectorAll("p"));
      proposedValue.forEach((value: unknown, index: number) => {
        if (typeof value === "string" && paragraphs[index]) {
          paragraphs[index].textContent = value;
        }
      });
    } else if (field === "lists" || field.toLowerCase().includes("list")) {
      const lists = Array.from(element.querySelectorAll("ul, ol"));
      proposedValue.forEach((items: unknown, index: number) => {
        if (!Array.isArray(items)) return;
        const list = lists[index];
        if (!list) return;

        // Clear existing items
        Array.from(list.children).forEach((child) => child.remove());

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
    } else if (field === "links") {
      const anchors = Array.from(element.querySelectorAll("a"));
      proposedValue.forEach((link: unknown, index: number) => {
        if (!link || typeof link !== "object") return;
        const anchor = anchors[index];
        if (!anchor) return;

        const { text, href } = link as { text?: string; href?: string };
        if (text) anchor.textContent = text;
        if (href) anchor.setAttribute("href", href);
      });
    }
  }
}
