import { JSDOM } from "jsdom";
import { WebsiteContent, WebsiteSection } from "@/types/content";

function updateSectionElement(element: Element, section: WebsiteSection) {
  const { content } = section;

  if (typeof content.heading === "string") {
    const heading = element.querySelector("h1, h2, h3");
    if (heading) {
      heading.textContent = content.heading;
    }
  }

  if (Array.isArray(content.paragraphs)) {
    const paragraphs = Array.from(element.querySelectorAll("p"));
    content.paragraphs.forEach((value: unknown, index: number) => {
      if (typeof value !== "string") return;
      if (paragraphs[index]) {
        paragraphs[index].textContent = value;
      } else {
        const paragraph = element.ownerDocument?.createElement("p");
        if (paragraph) {
          paragraph.textContent = value;
          element.appendChild(paragraph);
        }
      }
    });
  }

  if (Array.isArray(content.lists)) {
    const listElements = Array.from(element.querySelectorAll("ul, ol"));
    content.lists.forEach((items: unknown, index: number) => {
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
  }

  if (Array.isArray(content.links)) {
    const anchors = Array.from(element.querySelectorAll("a"));
    content.links.forEach((link: unknown, index: number) => {
      if (!link || typeof link !== "object") return;
      const anchor = anchors[index];
      if (!anchor) return;
      const { text, href } = link as { text?: string; href?: string };
      if (text) anchor.textContent = text;
      if (href) anchor.setAttribute("href", href);
    });
  }
}

export function generateHtmlFromContent(
  html: string,
  content: WebsiteContent
): string {
  const dom = new JSDOM(html);
  const { document } = dom.window;

  if (content.metadata.title) {
    document.title = content.metadata.title;
  }

  if (content.metadata.description) {
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.setAttribute("name", "description");
      document.head.appendChild(description);
    }
    description.setAttribute("content", content.metadata.description);
  }

  content.sections.forEach((section: WebsiteSection) => {
    const element = document.querySelector(`#${section.id}`);
    if (!element) {
      return;
    }
    updateSectionElement(element, section);
  });

  return dom.serialize();
}
