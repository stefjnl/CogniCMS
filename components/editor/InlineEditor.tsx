"use client";

import { useState, useEffect, useRef } from "react";
import { FieldMetadata } from "@/types/content";
import { validateField } from "@/lib/utils/fieldValidation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

interface InlineEditorProps {
  sectionId: string;
  field: string;
  currentValue: unknown;
  metadata: FieldMetadata;
  onSave: (newValue: unknown) => void;
  onCancel: () => void;
}

/**
 * InlineEditor - Edit field directly in the content tree (no modal)
 *
 * Features:
 * - Auto-focus on mount
 * - Enter to save, Escape to cancel
 * - Real-time validation (debounced)
 * - Character counter for text fields
 * - Disabled save button when invalid
 */
export function InlineEditor({
  sectionId,
  field,
  currentValue,
  metadata,
  onSave,
  onCancel,
}: InlineEditorProps) {
  const [inputValue, setInputValue] = useState(String(currentValue ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Debounced validation
  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      const result = validateField(inputValue, metadata);
      setIsValid(result.isValid);
      setError(result.error || null);
    }, 300);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [inputValue, metadata]);

  const handleChange = (value: string) => {
    setInputValue(value);
    setIsDirty(true);
  };

  const handleSave = () => {
    // Final validation before save
    const result = validateField(inputValue, metadata);
    if (!result.isValid) {
      setError(result.error || "Invalid value");
      setIsValid(false);
      return;
    }

    // Convert to appropriate type
    let valueToSave: unknown = inputValue;
    if (metadata.type === "number") {
      valueToSave = Number(inputValue);
    }

    onSave(valueToSave);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isValid) {
        handleSave();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const isMultiline = metadata.type === "longtext";
  const showCharCount = metadata.maxLength && metadata.maxLength > 0;

  return (
    <div className="space-y-2 py-1">
      {isMultiline ? (
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={metadata.placeholder}
          rows={4}
          className={`w-full ${
            error ? "border-red-500 focus:ring-red-500" : ""
          }`}
          aria-label={`Edit ${metadata.label}`}
          aria-invalid={!isValid}
          aria-describedby={error ? `${field}-error` : undefined}
        />
      ) : (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={
            metadata.type === "number"
              ? "number"
              : metadata.type === "email"
              ? "email"
              : metadata.type === "url"
              ? "url"
              : "text"
          }
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={metadata.placeholder}
          className={`w-full ${
            error ? "border-red-500 focus:ring-red-500" : ""
          }`}
          aria-label={`Edit ${metadata.label}`}
          aria-invalid={!isValid}
          aria-describedby={error ? `${field}-error` : undefined}
        />
      )}

      {/* Validation error */}
      {error && (
        <p
          id={`${field}-error`}
          className="text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}

      {/* Character counter */}
      {showCharCount && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {inputValue.length} / {metadata.maxLength} characters
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={!isValid || !isDirty}
          aria-label="Save changes"
        >
          ✓ Save
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onCancel}
          aria-label="Cancel editing"
        >
          ✗ Cancel
        </Button>
      </div>
    </div>
  );
}
