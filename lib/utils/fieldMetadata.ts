import { FieldMetadata } from "@/types/content";

/**
 * Infer field metadata from field name and value using pattern matching.
 *
 * Decision: Hybrid approach
 * - Name-based inference for common patterns (email, date, description, etc.)
 * - Value-based fallback (check length for text vs longtext)
 * - Everything else defaults to generic text
 *
 * Inline vs Modal threshold: 100 characters
 */
export function inferFieldMetadata(
  sectionId: string,
  fieldName: string,
  value: unknown
): FieldMetadata {
  const fieldLower = fieldName.toLowerCase();
  const stringValue = String(value ?? "");
  const valueLength = stringValue.length;

  // Email pattern
  if (fieldLower.includes("email") || fieldLower.includes("mail")) {
    return {
      type: "email",
      label: formatLabel(fieldName),
      required: false,
      maxLength: 255,
      pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
      placeholder: "example@domain.com",
      helpText: "Enter a valid email address",
    };
  }

  // URL pattern
  if (
    fieldLower.includes("url") ||
    fieldLower.includes("link") ||
    fieldLower.includes("website")
  ) {
    return {
      type: "url",
      label: formatLabel(fieldName),
      required: false,
      maxLength: 2048,
      pattern: "^https?://.*",
      placeholder: "https://example.com",
      helpText: "Enter a valid URL starting with http:// or https://",
    };
  }

  // Date pattern
  if (
    fieldLower.includes("date") ||
    fieldLower.includes("when") ||
    fieldLower === "day"
  ) {
    return {
      type: "date",
      label: formatLabel(fieldName),
      required: false,
      placeholder: "YYYY-MM-DD",
      helpText: "Select a date",
    };
  }

  // Time pattern
  if (
    fieldLower.includes("time") ||
    fieldLower.includes("hour") ||
    fieldLower === "at"
  ) {
    return {
      type: "time",
      label: formatLabel(fieldName),
      required: false,
      placeholder: "HH:MM",
      helpText: "Enter time",
    };
  }

  // Number pattern
  if (
    fieldLower.includes("number") ||
    fieldLower.includes("count") ||
    fieldLower.includes("age") ||
    fieldLower.includes("year") ||
    typeof value === "number"
  ) {
    return {
      type: "number",
      label: formatLabel(fieldName),
      required: false,
      helpText: "Enter a number",
    };
  }

  // Long text pattern (description, bio, content, etc.)
  if (
    fieldLower.includes("description") ||
    fieldLower.includes("bio") ||
    fieldLower.includes("content") ||
    fieldLower.includes("text") ||
    fieldLower.includes("about") ||
    fieldLower.includes("summary") ||
    fieldLower.includes("details") ||
    valueLength > 100
  ) {
    return {
      type: "longtext",
      label: formatLabel(fieldName),
      required: false,
      maxLength: 5000,
      placeholder: "Enter text...",
      helpText: "Enter detailed text",
    };
  }

  // Short text (default, including title, name, label)
  // Title always gets short text even if long (per decision)
  return {
    type: "text",
    label: formatLabel(fieldName),
    required: false,
    maxLength: 200,
    placeholder: "Enter text",
    helpText: "",
  };
}

/**
 * Format field name into readable label
 * Examples: "firstName" → "First Name", "email_address" → "Email Address"
 */
function formatLabel(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, " $1") // Add space before capitals
    .replace(/[_-]/g, " ") // Replace underscores and hyphens with spaces
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Determine if a field should use inline or modal editor
 *
 * Decision: <100 chars inline, >100 chars or description-like names modal
 */
export function shouldUseModalEditor(
  metadata: FieldMetadata,
  currentValue: unknown
): boolean {
  const stringValue = String(currentValue ?? "");

  // Always use modal for longtext type
  if (metadata.type === "longtext") {
    return true;
  }

  // Use modal for values longer than 100 characters
  if (stringValue.length > 100) {
    return true;
  }

  // Everything else uses inline editor
  return false;
}
