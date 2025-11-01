import { FieldMetadata, ValidationResult } from "@/types/content";

/**
 * Validate field value based on field metadata
 * Returns validation result with error message if invalid
 */
export function validateField(
  value: unknown,
  metadata: FieldMetadata
): ValidationResult {
  const stringValue = String(value ?? "");

  // Required field check
  if (metadata.required && !stringValue.trim()) {
    return {
      isValid: false,
      error: `${metadata.label} is required`,
    };
  }

  // Skip validation for empty optional fields
  if (!stringValue.trim() && !metadata.required) {
    return { isValid: true };
  }

  // Type-specific validation
  switch (metadata.type) {
    case "email":
      return validateEmail(stringValue, metadata);
    case "url":
      return validateUrl(stringValue, metadata);
    case "date":
      return validateDate(stringValue, metadata);
    case "time":
      return validateTime(stringValue, metadata);
    case "number":
      return validateNumber(value, metadata);
    case "text":
    case "longtext":
      return validateText(stringValue, metadata);
    default:
      return { isValid: true };
  }
}

/**
 * Validate email format (RFC 5322 simplified)
 */
function validateEmail(
  value: string,
  metadata: FieldMetadata
): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(value)) {
    return {
      isValid: false,
      error: "Please enter a valid email address",
    };
  }

  if (metadata.maxLength && value.length > metadata.maxLength) {
    return {
      isValid: false,
      error: `Email must be less than ${metadata.maxLength} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Validate URL format (require http/https protocol)
 */
function validateUrl(value: string, metadata: FieldMetadata): ValidationResult {
  try {
    const url = new URL(value);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(url.protocol)) {
      return {
        isValid: false,
        error: "URL must start with http:// or https://",
      };
    }

    if (metadata.maxLength && value.length > metadata.maxLength) {
      return {
        isValid: false,
        error: `URL must be less than ${metadata.maxLength} characters`,
      };
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: "Please enter a valid URL (e.g., https://example.com)",
    };
  }
}

/**
 * Validate date format (ISO format YYYY-MM-DD)
 */
function validateDate(
  value: string,
  metadata: FieldMetadata
): ValidationResult {
  // Check ISO date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(value)) {
    return {
      isValid: false,
      error: "Please enter date in YYYY-MM-DD format",
    };
  }

  // Check if it's a valid date
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: "Please enter a valid date",
    };
  }

  return { isValid: true };
}

/**
 * Validate time format (HH:MM or HH:MM:SS)
 */
function validateTime(
  value: string,
  metadata: FieldMetadata
): ValidationResult {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

  if (!timeRegex.test(value)) {
    return {
      isValid: false,
      error: "Please enter time in HH:MM format (24-hour)",
    };
  }

  return { isValid: true };
}

/**
 * Validate number value
 */
function validateNumber(
  value: unknown,
  metadata: FieldMetadata
): ValidationResult {
  const num = Number(value);

  if (isNaN(num)) {
    return {
      isValid: false,
      error: "Please enter a valid number",
    };
  }

  return { isValid: true };
}

/**
 * Validate text length
 */
function validateText(
  value: string,
  metadata: FieldMetadata
): ValidationResult {
  if (metadata.maxLength && value.length > metadata.maxLength) {
    return {
      isValid: false,
      error: `Must be less than ${metadata.maxLength} characters (currently ${value.length})`,
    };
  }

  // Custom pattern validation
  if (metadata.pattern) {
    const regex = new RegExp(metadata.pattern);
    if (!regex.test(value)) {
      return {
        isValid: false,
        error: metadata.helpText || "Invalid format",
      };
    }
  }

  return { isValid: true };
}

/**
 * Debounced validation wrapper
 * Returns a function that delays validation by specified milliseconds
 */
export function createDebouncedValidator(
  metadata: FieldMetadata,
  delayMs: number = 300
): (value: unknown, callback: (result: ValidationResult) => void) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (value: unknown, callback: (result: ValidationResult) => void) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      const result = validateField(value, metadata);
      callback(result);
    }, delayMs);
  };
}
