const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "META", "LINK"]);

// Node type constants (compatible with JSDOM)
const NODE_TYPE_ELEMENT = 1;
const NODE_TYPE_TEXT = 3;

export function isNestedInExtracted(
  element: Element,
  extractedElements: Set<Element>
): boolean {
  let parent = element.parentElement;

  while (parent) {
    if (extractedElements.has(parent)) {
      return true;
    }
    parent = parent.parentElement;
  }

  return false;
}

export function hasEditableContent(node: Node): boolean {
  if (node.nodeType === NODE_TYPE_TEXT) {
    const text = node.textContent?.trim() ?? "";
    return text.length > 0;
  }

  if (node.nodeType === NODE_TYPE_ELEMENT) {
    const element = node as Element;
    if (SKIP_TAGS.has(element.tagName)) {
      return false;
    }

    const text = element.textContent?.trim() ?? "";
    if (text.length > 0) {
      return true;
    }

    return Array.from(element.childNodes).some((child) =>
      hasEditableContent(child)
    );
  }

  return false;
}

export function generateSectionId(
  element: Element,
  tagName: string,
  index: number
): string {
  if (element.id) {
    return element.id;
  }

  const dataId = element.getAttribute("data-section-id");
  if (dataId) {
    return dataId;
  }

  return `${tagName.replace(/[^a-z0-9-]/gi, "").toLowerCase()}-${index + 1}`;
}

export function getDocumentPosition(
  element: Element,
  document: Document
): number {
  const elementsInOrder = Array.from(document.body.querySelectorAll("*"));
  const index = elementsInOrder.indexOf(element);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function isWithinExtracted(
  node: Node,
  extractedElements: Set<Element>
): boolean {
  let current: Node | null = node.parentNode;

  while (current) {
    if (current.nodeType === NODE_TYPE_ELEMENT) {
      if (extractedElements.has(current as Element)) {
        return true;
      }
    }
    current = current.parentNode;
  }

  return false;
}

export function generateSelectorForElement(
  element: Element,
  index: number
): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const className = element.getAttribute("class")?.trim();
  if (className) {
    const classes = className.split(/\s+/).filter(Boolean);
    if (classes.length > 0) {
      return `${element.tagName.toLowerCase()}.${classes.join(".")}`;
    }
  }

  const parent = element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter(
      (child) => child.tagName === element.tagName
    );
    const siblingIndex = siblings.indexOf(element);
    if (siblingIndex > -1) {
      return `${element.tagName.toLowerCase()}:nth-of-type(${
        siblingIndex + 1
      })`;
    }
  }

  return `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
}

export function generateSectionLabel(
  element: Element,
  index: number,
  fallbackLabel?: string
): string {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) {
    return ariaLabel;
  }

  const dataLabel = element.getAttribute("data-label");
  if (dataLabel) {
    return dataLabel;
  }

  const heading = element.querySelector("h1, h2, h3, h4, h5, h6");
  if (heading?.textContent) {
    return heading.textContent.trim();
  }

  const textSnippet = element.textContent?.trim() ?? "";
  if (textSnippet) {
    const snippet = textSnippet.split(/\s+/).slice(0, 6).join(" ");
    if (snippet.length > 0) {
      return snippet;
    }
  }

  const baseLabel =
    fallbackLabel ??
    `${capitalize(element.tagName.toLowerCase())} ${index + 1}`;
  return baseLabel.trim();
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}
