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
      id: "hero",
      label: "Hero",
      type: "hero",
      absoluteSelector: "header[data-section='hero'], header.hero, header",
      fields: [
        {
          key: "eyebrow",
          label: "Eyebrow / Kicker",
          type: "text",
          description: "Short label above the main headline.",
          relativeSelector:
            "div, span, p, h2, h3, h4, h5, h6:first-of-type span, .eyebrow, .kicker",
        },
        {
          key: "headline",
          label: "Headline",
          type: "text",
          description: "Primary hero headline.",
          relativeSelector: "h1",
        },
        {
          key: "subheading",
          label: "Subheading",
          type: "longtext",
          description: "Supporting description below the hero headline.",
          relativeSelector: "p",
        },
        {
          key: "primaryCtaLabel",
          label: "Primary CTA Label",
          type: "text",
          description: "Text for the main hero call-to-action button.",
          relativeSelector:
            "a.btn-primary, a[href^='#'], button.btn-primary, .hero-cta-primary",
        },
        {
          key: "primaryCtaHref",
          label: "Primary CTA Link",
          type: "url",
          description: "Link target for the primary hero CTA.",
          relativeSelector:
            "a.btn-primary, a[href^='#'], .hero-cta-primary",
          attributeName: "href",
        },
        {
          key: "secondaryCtaLabel",
          label: "Secondary CTA Label",
          type: "text",
          description: "Label for the secondary hero call-to-action.",
          relativeSelector:
            "a.btn-secondary, button.btn-secondary, .hero-cta-secondary",
        },
      ],
    },
    {
      id: "features",
      label: "Core Features",
      type: "list",
      absoluteSelector:
        "section[data-section='features'], section.features, section#features",
      fields: [
        {
          key: "title",
          label: "Section Title",
          type: "text",
          relativeSelector: "h2, h3",
        },
        {
          key: "description",
          label: "Section Description",
          type: "longtext",
          relativeSelector: "p",
        },
        {
          key: "items",
          label: "Feature Items",
          type: "list",
          description:
            "List of core feature bullets or cards rendered in this section.",
          relativeSelector: "ul, ol, .feature-list",
        },
      ],
    },
    {
      id: "testimonials",
      label: "Testimonials",
      type: "list",
      absoluteSelector:
        "section[data-section='testimonials'], section.testimonials, section#testimonials",
      fields: [
        {
          key: "title",
          label: "Section Title",
          type: "text",
          relativeSelector: "h2, h3",
        },
        {
          key: "items",
          label: "Testimonial Items",
          type: "list",
          description:
            "Collection of testimonial quotes and authors in this section.",
          relativeSelector: ".testimonial, blockquote, ul, ol",
        },
      ],
    },
    {
      id: "pricing",
      label: "Pricing",
      type: "list",
      absoluteSelector:
        "section[data-section='pricing'], section.pricing, section#pricing",
      fields: [
        {
          key: "title",
          label: "Section Title",
          type: "text",
          relativeSelector: "h2, h3",
        },
        {
          key: "plans",
          label: "Pricing Plans",
          type: "list",
          description: "Individual pricing tiers and features.",
          relativeSelector: ".plan, .pricing-card, ul, ol",
        },
      ],
    },
    {
      id: "faq",
      label: "FAQ",
      type: "list",
      absoluteSelector:
        "section[data-section='faq'], section.faq, section#faq",
      fields: [
        {
          key: "title",
          label: "Section Title",
          type: "text",
          relativeSelector: "h2, h3",
        },
        {
          key: "items",
          label: "FAQ Items",
          type: "faq",
          description: "Frequently asked questions and answers.",
          relativeSelector: ".faq-item, dl, ul, ol",
        },
      ],
    },
    {
      id: "cta",
      label: "Final Call To Action",
      type: "hero",
      absoluteSelector:
        "section[data-section='cta'], section.cta, section#cta",
      fields: [
        {
          key: "headline",
          label: "CTA Headline",
          type: "text",
          relativeSelector: "h2, h3",
        },
        {
          key: "body",
          label: "CTA Body",
          type: "longtext",
          relativeSelector: "p",
        },
        {
          key: "ctaLabel",
          label: "CTA Button Label",
          type: "text",
          relativeSelector: "a, button",
        },
        {
          key: "ctaHref",
          label: "CTA Button Link",
          type: "url",
          relativeSelector: "a",
          attributeName: "href",
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
          key: "copyright",
          label: "Copyright Text",
          type: "text",
          relativeSelector:
            "p, .copyright, span, small",
        },
        {
          key: "links",
          label: "Footer Links",
          type: "list",
          description: "Policy, legal, and navigation links in the footer.",
          relativeSelector: "a",
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