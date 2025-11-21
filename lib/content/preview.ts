import { PreviewChange } from "@/types/content";
import { JSDOM } from "jsdom";
import {
  PageDefinition,
  MetadataFieldDefinition,
  FieldDefinition,
} from "@/types/content-schema";
import { siteDefinitionConfig } from "@/lib/config/site-definitions";
import { getPageDefinitionForSiteConfig } from "@/lib/config/page-definition-resolver";

function applyMetadataChange(
  document: Document,
  change: PreviewChange,
  pageDefinition?: PageDefinition | null
): boolean {
  if (change.sectionId !== "metadata") {
    return false;
  }

  // Config-driven metadata mapping (if available).
  if (pageDefinition && typeof change.proposedValue === "string") {
    const metaDef = (pageDefinition.metadata || []).find(
      (def) => (def.metadataKey as string) === change.field
    );
    if (metaDef) {
      const target =
        (metaDef.absoluteSelector
          ? document.querySelector(metaDef.absoluteSelector)
          : null) ||
        (metaDef.relativeSelector
          ? document.querySelector(metaDef.relativeSelector)
          : null);

      if (target) {
        if (metaDef.attributeName) {
          target.setAttribute(metaDef.attributeName, change.proposedValue);
        } else {
          target.textContent = change.proposedValue;
        }
        return true;
      }
    }
  }

  if (typeof change.proposedValue !== "string") {
    return true;
  }

  const value = change.proposedValue;

  if (change.field === "title") {
    let titleEl = document.querySelector("title");
    if (!titleEl) {
      titleEl = document.createElement("title");
      document.head?.appendChild(titleEl);
    }
    if (titleEl) {
      titleEl.textContent = value;
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", value);
    }

    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute("content", value);
    }

    return true;
  }

  if (change.field === "description") {
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.setAttribute("name", "description");
      document.head?.appendChild(metaDescription);
    }
    if (metaDescription) {
      metaDescription.setAttribute("content", value);
    }

    const ogDescription = document.querySelector(
      'meta[property="og:description"]'
    );
    if (ogDescription) {
      ogDescription.setAttribute("content", value);
    }

    const twitterDescription = document.querySelector(
      'meta[name="twitter:description"]'
    );
    if (twitterDescription) {
      twitterDescription.setAttribute("content", value);
    }

    return true;
  }

  if (change.field === "lastModified") {
    const metaUpdated = document.querySelector(
      'meta[property="article:modified_time"]'
    );
    if (metaUpdated) {
      metaUpdated.setAttribute("content", value);
      return true;
    }
  }

  return true;
}

/**
 * Resolve the PageDefinition used for preview mapping based on an optional hint.
 * The htmlFilePath should match the one used during extraction when available.
 */
function resolvePageDefinitionForPreview(
  htmlFilePath?: string
): PageDefinition | null {
  if (!htmlFilePath) {
    return null;
  }
  // Use config-only resolver to avoid leaking jsdom usage into any client bundles.
  return getPageDefinitionForSiteConfig(
    htmlFilePath,
    undefined,
    siteDefinitionConfig
  );
}

/**
 * Get the actual selector for a section change.
 * Prefers schema-driven mapping when available, then falls back to heuristics.
 */
export function getSelectorForChange(
  change: PreviewChange,
  sections?: any[],
  pageDefinition?: PageDefinition | null
): string {
  const selectors: string[] = [];

  // Schema-driven resolution when we know the page definition.
  if (pageDefinition && change.sectionId !== "metadata") {
    const sectionDef = pageDefinition.sections.find(
      (s) => s.id === change.sectionId
    );
    if (sectionDef) {
      const fieldDef = (sectionDef.fields || []).find(
        (f) => f.key === change.field
      );

      // Field-level selector if present
      if (fieldDef?.absoluteSelector) {
        selectors.push(fieldDef.absoluteSelector);
      } else if (sectionDef.absoluteSelector && fieldDef?.relativeSelector) {
        selectors.push(
          `${sectionDef.absoluteSelector} ${fieldDef.relativeSelector}`
        );
      } else if (sectionDef.absoluteSelector) {
        selectors.push(sectionDef.absoluteSelector);
      }
    }
  }

  // If we have sections data, try to find the matching section and use its selector
  if (sections) {
    const matchingSection = sections.find(
      (section: any) => section.id === change.sectionId
    );
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
  if (sectionId === "header") {
    selectors.push("header");
  } else if (sectionId === "footer") {
    selectors.push("footer");
  } else if (sectionId === "nav" || sectionId === "navigation") {
    selectors.push("nav");
  } else if (sectionId === "main") {
    selectors.push("main");
  } else if (sectionId === "aside") {
    selectors.push("aside");
  } else if (sectionId === "article") {
    selectors.push("article");
  } else if (sectionId === "section") {
    selectors.push("section");
  }

  // Strategy 5: Try elements with specific IDs that might contain the content
  // Based on the known IDs in the HTML
  const knownIds = [
    "newsletter",
    "newsletterForm",
    "newsletterFeedback",
    "copyEmailBtn",
    "backToTop",
    "privacyModal",
    "privacyClose",
    "copyFeedback",
  ];
  if (knownIds.includes(change.sectionId)) {
    selectors.push(`#${change.sectionId}`);
  }

  // Return all selectors as a comma-separated list
  // The applyChangesToHTML will use querySelector which will try them in order
  return selectors.join(", ");
}

/**
 * Specialized handler for events-related changes driven by PageDefinition.domHints.
 * Returns true if any DOM updates were applied for the given change.
 */
function applyEventsChangesWithDomHints(
  document: Document,
  change: PreviewChange,
  pageDefinition?: PageDefinition | null
): boolean {
  if (!pageDefinition?.domHints?.events) {
    return false;
  }

  if (change.sectionId !== "events") {
    return false;
  }

  const domHints = pageDefinition.domHints.events;

  const isUpcomingFieldChange =
    change.field === "upcoming" ||
    (typeof change.field === "string" &&
      change.field.startsWith("upcoming")) ||
    (typeof (change as any).path === "string" &&
      (change as any).path.includes("upcoming"));

  if (!isUpcomingFieldChange) {
    return false;
  }

  const proposed = change.proposedValue as unknown;

  if (!Array.isArray(proposed)) {
    return false;
  }

  type EventItem = {
    title?: string;
    date?: string;
    isNext?: boolean;
    availabilityText?: string;
    ctaLabel?: string;
    ctaUrl?: string;
  };

  const items = proposed as EventItem[];
  if (!items || items.length === 0) {
    return false;
  }

  const next =
    items.find((item) => item && item.isNext) ??
    (items[0] as EventItem | undefined);

  if (!next || !next.date) {
    return false;
  }

  let applied = false;

  if (domHints.nextEventBanner) {
    const banner = document.querySelector(domHints.nextEventBanner.selector);
    if (banner) {
      const textTemplate = domHints.nextEventBanner.textTemplate;
      const text = textTemplate.replace("{{date}}", next.date ?? "");
      banner.textContent = text;
      applied = true;

      if (domHints.nextEventBanner.availabilitySelector) {
        const availabilityEl = document.querySelector(
          domHints.nextEventBanner.availabilitySelector
        );
        if (availabilityEl && next.availabilityText) {
          availabilityEl.textContent = next.availabilityText;
        }
      }
    }
  }

  if (domHints.upcomingList) {
    const {
      containerSelector,
      itemSelector,
      titleSelector,
      dateSelector,
      availabilitySelector,
      ctaSelector,
    } = domHints.upcomingList;

    const container = document.querySelector(containerSelector);
    if (container) {
      const existingItems = Array.from(
        container.querySelectorAll(itemSelector)
      );
      const ownerDocument = container.ownerDocument || document;

      const ensureItemElement = (index: number): Element => {
        if (existingItems[index]) {
          return existingItems[index];
        }
        const wrapper = ownerDocument.createElement("div");
        wrapper.className = itemSelector.replace(/^\./, "");
        container.appendChild(wrapper);
        return wrapper;
      };

      items.forEach((item, index) => {
        const eventItem = item || {};
        const el = ensureItemElement(index);

        if (titleSelector && eventItem.title) {
          const titleEl =
            el.querySelector(titleSelector) ||
            el.querySelector("h2, h3, h4, .event-title");
          if (titleEl) {
            titleEl.textContent = eventItem.title;
          }
        }

        if (dateSelector && eventItem.date) {
          const dateEl =
            el.querySelector(dateSelector) ||
            el.querySelector(".event-date, time");
          if (dateEl) {
            dateEl.textContent = eventItem.date;
          }
        }

        if (availabilitySelector && eventItem.availabilityText) {
          const availEl =
            el.querySelector(availabilitySelector) ||
            el.querySelector(".event-availability");
          if (availEl) {
            availEl.textContent = eventItem.availabilityText;
          }
        }

        if (ctaSelector && (eventItem.ctaLabel || eventItem.ctaUrl)) {
          const ctaEl =
            el.querySelector(ctaSelector) || el.querySelector("a, button");
          if (ctaEl) {
            if (eventItem.ctaLabel) {
              (ctaEl as HTMLElement).textContent = eventItem.ctaLabel;
            }
            if (
              eventItem.ctaUrl &&
              (ctaEl as HTMLAnchorElement).setAttribute
            ) {
              (ctaEl as HTMLAnchorElement).setAttribute(
                "href",
                eventItem.ctaUrl
              );
            }
          }
        }
      });

      applied = true;
    }
  }

  return applied;
}

/**
 * Apply changes to HTML by modifying the DOM elements
 */
export function applyChangesToHTML(
  originalHTML: string,
  changes: PreviewChange[],
  sections?: any[],
  htmlFilePath?: string
): string {
  console.log("[APPLY_CHANGES] Starting applyChangesToHTML");
  console.log(
    "[APPLY_CHANGES] Original HTML length:",
    originalHTML?.length || 0
  );
  console.log("[APPLY_CHANGES] Number of changes:", changes?.length || 0);
  console.log("[APPLY_CHANGES] Changes:", JSON.stringify(changes, null, 2));

  if (!changes || changes.length === 0) {
    console.log("[APPLY_CHANGES] No changes to apply, returning original HTML");
    return originalHTML;
  }

  const dom = new JSDOM(originalHTML);
  const { document } = dom.window;
  const pageDefinition = resolvePageDefinitionForPreview(htmlFilePath);

  console.log(
    "[APPLY_CHANGES] DOM created, document element:",
    document.documentElement?.tagName
  );

  for (const change of changes) {
    try {
      if (applyMetadataChange(document, change, pageDefinition)) {
        console.log("[APPLY_CHANGES] Metadata change applied:", change);
        continue;
      }

      if (applyEventsChangesWithDomHints(document, change, pageDefinition)) {
        console.log("[APPLY_CHANGES] Events/domHints change applied:", change);
        continue;
      }

      console.log("[APPLY_CHANGES] Processing change:", change);
      const selector = getSelectorForChange(change, sections, pageDefinition);
      console.log("[APPLY_CHANGES] Generated selector:", selector);

      const element = document.querySelector(selector);

      if (!element) {
        console.warn(
          `[APPLY_CHANGES] Element not found for selector: ${selector}`
        );
        console.log("[APPLY_CHANGES] Available elements in document:");
        console.log(
          "[APPLY_CHANGES] All IDs:",
          Array.from(document.querySelectorAll("[id]")).map((el) => el.id)
        );
        console.log(
          "[APPLY_CHANGES] All data-section attributes:",
          Array.from(document.querySelectorAll("[data-section]")).map((el) =>
            el.getAttribute("data-section")
          )
        );
        console.log(
          "[APPLY_CHANGES] All data-section-id attributes:",
          Array.from(document.querySelectorAll("[data-section-id]")).map((el) =>
            el.getAttribute("data-section-id")
          )
        );
        console.log(
          "[APPLY_CHANGES] All classes:",
          Array.from(document.querySelectorAll("[class]")).map(
            (el) => el.className
          )
        );
        continue;
      }

      console.log(
        "[APPLY_CHANGES] Found element:",
        element.tagName,
        element.id,
        element.className
      );

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
  sections?: any[],
  htmlFilePath?: string
): string {
  if (!changes || changes.length === 0) {
    return html;
  }

  const dom = new JSDOM(html);
  const { document } = dom.window;
  const pageDefinition = resolvePageDefinitionForPreview(htmlFilePath);

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
      if (change.sectionId === "metadata") {
        continue;
      }

      const selector = getSelectorForChange(change, sections, pageDefinition);
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
    elementContent: element.textContent?.substring(0, 100),
  });

  // Try multiple strategies to find and update the right element

  // Strategy 1: Look for element with data-field attribute
  let target = element.querySelector(`[data-field="${field}"]`);
  console.log(
    "[APPLY_CHANGE] Strategy 1 - data-field selector result:",
    target?.tagName
  );

  // Strategy 2: Look for element with data-section-field attribute
  if (!target) {
    target = element.querySelector(`[data-section-field="${field}"]`);
    console.log(
      "[APPLY_CHANGE] Strategy 2 - data-section-field selector result:",
      target?.tagName
    );
  }

  // Strategy 3: Field-specific mappings for common patterns
  if (!target) {
    if (
      field === "heading" ||
      field === "title" ||
      field.toLowerCase().includes("title")
    ) {
      target = element.querySelector("h1, h2, h3, h4, h5, h6");
      console.log(
        "[APPLY_CHANGE] Strategy 3a - heading selector result:",
        target?.tagName
      );
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
      console.log(
        "[APPLY_CHANGE] Strategy 3b - paragraph selector result:",
        target?.tagName
      );

      // If no paragraph, try buttons (for newsletter signup, etc.)
      if (!target) {
        target = element.querySelector("button");
        console.log(
          "[APPLY_CHANGE] Strategy 3b2 - button selector result:",
          target?.tagName
        );
      }

      // If still no target, try spans or divs with text content
      if (!target) {
        const textElements = Array.from(
          element.querySelectorAll("span, div")
        ).filter((el) => el.textContent && el.textContent.trim().length > 0);
        if (textElements.length > 0) {
          target = textElements[0];
          console.log(
            "[APPLY_CHANGE] Strategy 3b3 - text element selector result:",
            target?.tagName
          );
        }
      }
    } else if (
      field.toLowerCase().includes("button") ||
      field.toLowerCase().includes("cta")
    ) {
      target = element.querySelector("a, button");
      console.log(
        "[APPLY_CHANGE] Strategy 3c - button selector result:",
        target?.tagName
      );
    } else if (field === "paragraphs" && Array.isArray(proposedValue)) {
      // For paragraphs field, don't find a single target - the element itself is the container
      // Set target to null to skip the single-value strategies and go directly to array handling
      console.log(
        "[APPLY_CHANGE] Strategy 3d - paragraphs array detected, will use array handler"
      );
      // Don't set target - let it fall through to array handling below
    }
  }

  // Strategy 4: Use the parent element itself (only if it's a simple text container)
  if (
    !target &&
    (element.tagName === "P" ||
      element.tagName === "SPAN" ||
      element.tagName === "A" ||
      element.tagName === "BUTTON")
  ) {
    target = element;
    console.log(
      "[APPLY_CHANGE] Strategy 4 - using parent element as it's a text container"
    );
  }

  // For array values like "paragraphs", "lists", "links", we apply them using the element as container
  // even if target is not found, since the array handler searches within the element
  const isArrayField =
    Array.isArray(proposedValue) &&
    (field === "paragraphs" || field === "lists" || field === "links");

  // If we still don't have a target and it's NOT an array field, skip
  if (!target && !isArrayField) {
    console.warn(
      "[APPLY_CHANGE] No suitable target found, skipping update to avoid destroying element structure"
    );
    return;
  }

  console.log(
    "[APPLY_CHANGE] Final target element:",
    target
      ? {
          tagName: target.tagName,
          id: target.id,
          className: target.className,
          currentContent: target.textContent?.substring(0, 100),
        }
      : "null (will use element as container)"
  );

  // Apply the value based on type
  if (typeof proposedValue === "string") {
    // String values require a target element
    if (!target) {
      console.warn("[APPLY_CHANGE] No target found for string value, skipping");
      return;
    }

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
    console.log(
      "[APPLY_CHANGE] String value applied, new content:",
      target.textContent?.substring(0, 100)
    );
  } else if (Array.isArray(proposedValue)) {
    console.log("[APPLY_CHANGE] Applying array value:", proposedValue);
    // For arrays, use the element as the container (not the target)
    const container = target || element;

    // Handle arrays (lists, paragraphs, etc.)
    if (field === "paragraphs") {
      const paragraphs = Array.from(container.querySelectorAll("p"));
      proposedValue.forEach((value: unknown, index: number) => {
        if (typeof value === "string" && paragraphs[index]) {
          paragraphs[index].textContent = value;
        }
      });
    } else if (field === "lists" || field.toLowerCase().includes("list")) {
      const lists = Array.from(container.querySelectorAll("ul, ol"));
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
      const anchors = Array.from(container.querySelectorAll("a"));
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
