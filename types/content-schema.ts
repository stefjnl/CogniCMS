// Schema-driven configuration constructs for mapping HTML → WebsiteContent → editor UI → preview.
// These are configuration types only; they do not perform extraction themselves.

import { SectionType, WebsiteContent, WebsiteMetadata } from "./content";
import { SiteConfig } from "./site";

/**
 * Primitive value kinds supported by schema-driven fields.
 */
export type FieldPrimitiveType =
  | "text"
  | "longtext"
  | "url"
  | "email"
  | "number"
  | "boolean"
  | "image"
  | "html"
  | "json"
  | "list"
  | "faq";

/**
 * Selector definition for locating elements in HTML.
 * - absoluteSelector: full CSS selector from the root.
 * - relativeSelector: selector relative to a section root.
 */
export interface SelectorDefinition {
  absoluteSelector?: string;
  relativeSelector?: string;
}

/**
 * Optional constraints for validating or hinting field values.
 * Used by the editor UI and AI tooling; does not affect extraction directly.
 */
export interface FieldConstraint {
  required?: boolean;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
}

/**
 * Defines a single editable field within a section.
 * `key` maps directly into WebsiteSection.content[key].
 */
export interface FieldDefinition extends SelectorDefinition {
  key: string;
  label: string;
  type: FieldPrimitiveType;
  description?: string;
  attributeName?: string;
  constraints?: FieldConstraint;
}

/**
 * Declarative mapping for one logical section on the page.
 * `id` maps to WebsiteSection.id and is the stable key used across editor + preview.
 */
export interface SectionDefinition extends SelectorDefinition {
  id: string;
  label: string;
  type: SectionType;
  fields: FieldDefinition[];
}

/**
 * Logical groups for metadata, used only for organizing the left-hand UI.
 */
export type MetadataGroupId =
  | "seo"
  | "branding"
  | "contact"
  | "social"
  | "cta"
  | "technical";

/**
 * Declarative metadata mapping. `metadataKey` maps into WebsiteMetadata[metadataKey].
 */
export interface MetadataFieldDefinition extends SelectorDefinition {
  metadataKey: keyof WebsiteMetadata | string;
  label: string;
  description?: string;
  group?: MetadataGroupId;
  type?: FieldPrimitiveType;
  attributeName?: string;
}

/**
 * Schema-driven description of a single page.
 * This ties HTML selectors to WebsiteContent metadata + sections.
 */
export interface PageDefinition {
  id: string;
  label: string;
  description?: string;
  htmlPath?: string;
  metadata?: MetadataFieldDefinition[];
  sections: SectionDefinition[];
  /**
   * When true, configured extraction runs first and heuristic extraction may
   * append additional sections without overriding configured ones.
   */
  enableHeuristicFallback?: boolean;
  /**
   * Optional DOM-level hints to guide structured preview updates without
   * hardcoding selectors in logic. This is config-only and backwards compatible.
   */
  domHints?: {
    events?: {
      nextEventBanner?: {
        selector: string;
        textTemplate: string;
        availabilitySelector?: string;
      };
      upcomingList?: {
        containerSelector: string;
        itemSelector: string;
        titleSelector?: string;
        dateSelector?: string;
        availabilitySelector?: string;
        ctaSelector?: string;
      };
    };
  };
}

/**
 * Global site-level configuration for PageDefinitions.
 * Page definitions are opt-in; extraction falls back to heuristics if no match.
 */
export interface SiteDefinitionConfig {
  pages: Record<string, PageDefinition>;
  defaultPageId?: string;
}

/**
 * Backwards compatible SiteConfig extension used where a specific PageDefinition
 * should be applied to extraction/editor/preview.
 * - pageDefinition: inline PageDefinition (highest precedence).
 * - pageDefinitionId: key into SiteDefinitionConfig.pages.
 */
export interface SiteConfigWithPageDefinition extends SiteConfig {
  pageDefinition?: PageDefinition;
  pageDefinitionId?: string;
}

// Helper shape aliases to keep imports simple where WebsiteContent is required.
export type SchemaDrivenWebsiteContent = WebsiteContent;