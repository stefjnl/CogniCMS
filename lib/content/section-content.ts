// Semantic elements that should be treated as section boundaries
const SEMANTIC_CONTAINER_TAGS = new Set([
  "HEADER",
  "NAV",
  "MAIN",
  "FOOTER",
  "ARTICLE",
  "ASIDE",
  "SECTION",
]);

// Node/NodeFilter constants (compatible with JSDOM)
const NODE_FILTER_SHOW_TEXT = 4;
const NODE_FILTER_ACCEPT = 1;
const NODE_FILTER_REJECT = 2;

/**
 * Check if an element is within a nested semantic container
 * (relative to the parent element we're extracting from)
 */
function isInNestedSemanticContainer(
  element: Element,
  parentElement: Element
): boolean {
  let current = element.parentElement;

  while (current && current !== parentElement) {
    if (SEMANTIC_CONTAINER_TAGS.has(current.tagName)) {
      return true;
    }
    current = current.parentElement;
  }

  return false;
}

/**
 * Extract only direct content from an element, excluding nested semantic containers
 */
export function extractSectionContent(
  element: Element
): Record<string, unknown> {
  const content: Record<string, unknown> = {};

  // Extract heading - only if not in a nested semantic container
  const headings = Array.from(
    element.querySelectorAll("h1, h2, h3, h4, h5, h6")
  );
  const directHeading = headings.find(
    (h) => !isInNestedSemanticContainer(h, element)
  );
  if (directHeading) {
    content.heading = directHeading.textContent?.trim() ?? "";
  }

  // Extract paragraphs - only direct ones
  const allParagraphs = Array.from(
    element.querySelectorAll("p") as NodeListOf<HTMLParagraphElement>
  );
  const directParagraphs = allParagraphs
    .filter((p) => !isInNestedSemanticContainer(p, element))
    .map((p) => p.textContent?.trim() ?? "")
    .filter((text) => text.length > 0);

  if (directParagraphs.length > 0) {
    content.paragraphs = directParagraphs;
  }

  // Extract lists - only direct ones
  const allLists = Array.from(
    element.querySelectorAll("ul, ol") as NodeListOf<
      HTMLUListElement | HTMLOListElement
    >
  );
  const directLists = allLists.filter(
    (list) => !isInNestedSemanticContainer(list, element)
  );

  if (directLists.length > 0) {
    content.lists = directLists.map((list) =>
      Array.from(list.querySelectorAll("li") as NodeListOf<HTMLLIElement>).map(
        (li) => li.textContent?.trim() ?? ""
      )
    );
  }

  // Extract links - only direct ones
  const allAnchors = Array.from(
    element.querySelectorAll("a") as NodeListOf<HTMLAnchorElement>
  );
  const directAnchors = allAnchors.filter(
    (a) => !isInNestedSemanticContainer(a, element)
  );

  if (directAnchors.length > 0) {
    content.links = directAnchors.map((a) => ({
      text: a.textContent?.trim() ?? "",
      href: a.getAttribute("href") ?? "",
    }));
  }

  // Extract images - only direct ones
  const allImages = Array.from(
    element.querySelectorAll("img") as NodeListOf<HTMLImageElement>
  );
  const directImages = allImages.filter(
    (img) => !isInNestedSemanticContainer(img, element)
  );

  if (directImages.length > 0) {
    content.images = directImages.map((img) => ({
      src: img.getAttribute("src") ?? "",
      alt: img.getAttribute("alt") ?? "",
    }));
  }

  // Fallback: if no structured content found, get direct text only
  if (Object.keys(content).length === 0) {
    // Get only direct text nodes, not from nested semantic elements
    let directText = "";
    const walker = element.ownerDocument.createTreeWalker(
      element,
      NODE_FILTER_SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NODE_FILTER_REJECT;

          // Check if this text node is within a nested semantic container
          if (isInNestedSemanticContainer(parent, element)) {
            return NODE_FILTER_REJECT;
          }

          const text = node.textContent?.trim() ?? "";
          return text.length > 0 ? NODE_FILTER_ACCEPT : NODE_FILTER_REJECT;
        },
      }
    );

    const textParts: string[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim();
      if (text) {
        textParts.push(text);
      }
    }

    directText = textParts.join(" ").replace(/\s+/g, " ").trim();

    if (directText.length > 0) {
      content.text = directText;
    }
  }

  return content;
}
