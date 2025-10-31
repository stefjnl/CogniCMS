import { JSDOM } from "jsdom";
import { WebsiteContent, WebsiteSection, SectionType } from "@/types/content";

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

    sections.push({
      id,
      label,
      type: inferSectionType(element),
      content: extractSectionContent(element),
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
