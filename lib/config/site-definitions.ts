// PageDefinition registry for known example sites.
// These definitions are opt-in: if no matching PageDefinition is resolved,
// the system falls back to heuristic extraction.

import { PageDefinition, SiteDefinitionConfig } from "@/types/content-schema";

// Zincafe landing page mapping for examples/index.html
// This configuration encodes the contract between:
// - HTML selectors
// - WebsiteContent metadata/sections
// - Editor UI + preview mapping.
export const ZincafeLandingPageDefinition: PageDefinition = {
  id: "zincafe-home",
  label: "Zincafe Landing Page",
  description:
    "Schema-driven mapping for the Zincafe landing page example (examples/index.html).",
  htmlPath: "examples/index.html",
  enableHeuristicFallback: true,
  metadata: [
    {
      metadataKey: "title",
      label: "Page Title",
      description: "Primary document title shown in the browser tab.",
      group: "seo",
      type: "text",
      absoluteSelector: "title",
    },
    {
      metadataKey: "description",
      label: "Meta Description",
      description: "Short summary used by search engines and previews.",
      group: "seo",
      type: "longtext",
      absoluteSelector: "head > meta[name='description']",
      attributeName: "content",
    },
    {
      metadataKey: "ogTitle",
      label: "Social Share Title",
      description: "Title used when sharing on social media (Open Graph).",
      group: "social",
      type: "text",
      absoluteSelector: "head > meta[property='og:title']",
      attributeName: "content",
    },
    {
      metadataKey: "ogDescription",
      label: "Social Share Description",
      description: "Description used when sharing on social media.",
      group: "social",
      type: "longtext",
      absoluteSelector: "head > meta[property='og:description']",
      attributeName: "content",
    },
    {
      metadataKey: "ogImage",
      label: "Social Share Image",
      description: "Image URL shown when sharing on social media.",
      group: "social",
      type: "url",
      absoluteSelector: "head > meta[property='og:image']",
      attributeName: "content",
    },
    {
      metadataKey: "ogUrl",
      label: "Canonical Social URL",
      description: "The canonical URL for social sharing.",
      group: "social",
      type: "url",
      absoluteSelector: "head > meta[property='og:url']",
      attributeName: "content",
    },
    {
      metadataKey: "canonicalUrl",
      label: "Canonical URL",
      description: "The canonical URL for SEO (prevents duplicate content).",
      group: "seo",
      type: "url",
      absoluteSelector: "head > link[rel='canonical']",
      attributeName: "href",
    },
    {
      metadataKey: "email",
      label: "Contact Email",
      description: "Primary contact email address for the site.",
      group: "contact",
      type: "email",
    },
    {
      metadataKey: "lastModified",
      label: "Last Modified",
      description:
        "Timestamp of the last content extraction. Auto-managed by the system.",
      group: "technical",
      type: "text",
    },
  ],
  sections: [
    {
      id: "header",
      label: "Header / Hero",
      type: "hero",
      absoluteSelector: "header",
      fields: [
        {
          key: "heading",
          label: "Headline",
          type: "text",
          description: "Main site headline (h1).",
          relativeSelector: "h1",
        },
        {
          key: "subtitle",
          label: "Subtitle",
          type: "text",
          description: "Tagline below the main headline.",
          relativeSelector: "p",
        },
        {
          key: "ctaText",
          label: "CTA Button Text",
          type: "text",
          description: "Text for the main call-to-action button.",
          relativeSelector: ".btn-primary-large",
        },
        {
          key: "ctaHref",
          label: "CTA Button Link",
          type: "url",
          description: "Link target for the CTA button.",
          relativeSelector: ".btn-primary-large",
          attributeName: "href",
        },
        {
          key: "urgencyText",
          label: "Urgency Text",
          type: "text",
          description: "Countdown or urgency message below CTA.",
          relativeSelector: ".urgency-text",
        },
      ],
    },
    {
      id: "next-event-banner",
      label: "Eerstvolgende Bijeenkomst Banner",
      type: "content",
      absoluteSelector: ".next-event-banner",
      fields: [
        {
          key: "heading",
          label: "Banner Text",
          type: "text",
          description: "Main banner text with date.",
          relativeSelector: "strong",
        },
        {
          key: "subtext",
          label: "Availability Text",
          type: "text",
          description: "Availability/countdown text.",
          relativeSelector: ".countdown, p",
        },
      ],
    },
    {
      id: "intro",
      label: "Introductie",
      type: "content",
      absoluteSelector: "section.intro",
      fields: [
        {
          key: "heading",
          label: "Section Heading",
          type: "text",
          description: "Heading for the intro section.",
          relativeSelector: "h2",
        },
        {
          key: "paragraphs",
          label: "Content Paragraphs",
          type: "list",
          description: "Introduction paragraphs and quotes.",
          relativeSelector: "p",
        },
      ],
    },
    {
      id: "facilitators",
      label: "Begeleiders",
      type: "list",
      absoluteSelector: "section.facilitators",
      fields: [
        {
          key: "heading",
          label: "Section Heading",
          type: "text",
          description: "Heading for the facilitators section.",
          relativeSelector: "h2",
        },
        {
          key: "items",
          label: "Begeleiders",
          type: "list",
          description: "List of facilitators with name, role, and bio.",
          relativeSelector: ".facilitator",
        },
      ],
    },
    {
      id: "events",
      label: "Bijeenkomsten",
      type: "list",
      absoluteSelector: "section.bijeenkomsten",
      fields: [
        {
          key: "heading",
          label: "Section Heading",
          type: "text",
          description: "Heading for the events section.",
          relativeSelector: "h2",
        },
        {
          key: "items",
          label: "Bijeenkomsten",
          type: "list",
          description: "List of events with title, date, and status.",
          relativeSelector: ".bijeenkomst-card",
        },
      ],
    },
    {
      id: "newsletter",
      label: "Nieuwsbrief",
      type: "content",
      absoluteSelector: "section.newsletter",
      fields: [
        {
          key: "heading",
          label: "Section Heading",
          type: "text",
          description: "Newsletter signup heading.",
          relativeSelector: "h2",
        },
        {
          key: "description",
          label: "Description",
          type: "text",
          description: "Text explaining the newsletter.",
          relativeSelector: "p",
        },
        {
          key: "buttonText",
          label: "Button Text",
          type: "text",
          description: "Subscribe button text.",
          relativeSelector: "button",
        },
        {
          key: "placeholderText",
          label: "Email Placeholder",
          type: "text",
          description: "Placeholder text for email input.",
          relativeSelector: "input[type='email']",
          attributeName: "placeholder",
        },
        {
          key: "privacyNote",
          label: "Privacy Note",
          type: "text",
          description: "Privacy/spam note below the form.",
          relativeSelector: ".privacy-note",
        },
      ],
    },
    {
      id: "praktisch",
      label: "Praktische Informatie",
      type: "content",
      absoluteSelector: "section.praktisch",
      fields: [
        {
          key: "heading",
          label: "Section Heading",
          type: "text",
          description: "Heading for practical info section.",
          relativeSelector: "h2",
        },
        {
          key: "items",
          label: "Info Items",
          type: "list",
          description: "Practical info items (location, time, etc.).",
          relativeSelector: ".praktisch-item",
        },
        {
          key: "location",
          label: "Location Details",
          type: "json",
          description: "Location name, address, and directions.",
          relativeSelector: ".location-details",
        },
      ],
    },
    {
      id: "faq",
      label: "Veelgestelde Vragen",
      type: "list",
      absoluteSelector: "section.faq",
      fields: [
        {
          key: "heading",
          label: "Section Heading",
          type: "text",
          description: "FAQ section heading.",
          relativeSelector: "h2",
        },
        {
          key: "items",
          label: "FAQ Items",
          type: "faq",
          description: "Frequently asked questions and answers.",
          relativeSelector: ".faq-item",
        },
      ],
    },
    {
      id: "contact",
      label: "Contact",
      type: "contact",
      absoluteSelector: "section.contact",
      fields: [
        {
          key: "heading",
          label: "Section Heading",
          type: "text",
          description: "Contact section heading.",
          relativeSelector: "h2",
        },
        {
          key: "paragraphs",
          label: "Description",
          type: "list",
          description: "Contact section description.",
          relativeSelector: "p",
        },
        {
          key: "links",
          label: "Contact Links",
          type: "list",
          description: "Contact action buttons/links.",
          relativeSelector: ".contact-buttons a, .contact-buttons button",
        },
      ],
    },
    {
      id: "footer",
      label: "Footer",
      type: "footer",
      absoluteSelector: "footer",
      fields: [
        {
          key: "text",
          label: "Footer Text",
          type: "text",
          description: "Main footer text/tagline.",
          relativeSelector: "p:first-child",
        },
        {
          key: "email",
          label: "Footer Email",
          type: "email",
          description: "Contact email shown in footer.",
          relativeSelector: "p:last-child",
        },
      ],
    },
  ],
  domHints: {
    events: {
      nextEventBanner: {
        selector:
          "[data-cms='next-event'], section#eerstvolgende-bijeenkomst, .next-event-banner",
        textTemplate: "Eerstvolgende bijeenkomst: {{date}}",
        availabilitySelector:
          "[data-cms='next-event-availability'], .next-event-availability",
      },
      upcomingList: {
        containerSelector:
          "[data-cms='upcoming-events'], .upcoming-events, section#bijeenkomsten",
        itemSelector: "[data-cms='event-item'], .event-item",
        titleSelector: "[data-cms='event-title'], .event-title",
        dateSelector: "[data-cms='event-date'], .event-date",
        availabilitySelector:
          "[data-cms='event-availability'], .event-availability",
        ctaSelector: "[data-cms='event-cta'], .event-cta",
      },
    },
  },
};

// Central registry used by extractor/editor/preview when resolving page schemas.
// Other pages can be registered here without changing call-sites.
export const siteDefinitionConfig: SiteDefinitionConfig = {
  pages: {
    [ZincafeLandingPageDefinition.id]: ZincafeLandingPageDefinition,
  },
  // Non-breaking default: used only when constructors explicitly opt in or
  // when no better match is found.
  defaultPageId: ZincafeLandingPageDefinition.id,
};