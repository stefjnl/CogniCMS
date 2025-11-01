export type SectionType = "hero" | "content" | "list" | "contact" | "custom";

export interface WebsiteMetadata {
  title: string;
  description: string;
  lastModified: string;
}

export interface WebsiteSection {
  id: string;
  type: SectionType;
  label: string;
  content: Record<string, unknown>;
}

export interface WebsiteContent {
  metadata: WebsiteMetadata;
  sections: WebsiteSection[];
  assets: {
    images: string[];
    links: Array<{ text: string; url: string }>;
  };
}

export interface PreviewChange {
  sectionId: string;
  sectionLabel: string;
  field: string;
  changeType: "update" | "add" | "remove";
  currentValue: unknown;
  proposedValue: unknown;
  source?: "manual" | "ai";
  timestamp?: string;
}

export interface FieldMetadata {
  type: "text" | "longtext" | "email" | "url" | "date" | "time" | "number";
  label: string;
  required: boolean;
  maxLength?: number;
  pattern?: string;
  placeholder?: string;
  helpText?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PreviewData {
  changes: PreviewChange[];
  commitMessage: string;
  estimatedDeployTime: string;
}
