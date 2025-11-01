"use client";

import { useState, useEffect, useRef } from "react";
import { FieldMetadata } from "@/types/content";
import { validateField } from "@/lib/utils/fieldValidation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";

interface ModalEditorProps {
  open: boolean;
  sectionId: string;
  sectionLabel: string;
  field: string;
  currentValue: unknown;
  metadata: FieldMetadata;
  onSave: (newValue: unknown) => void;
  onCancel: () => void;
}

/**
 * ModalEditor - Edit field in a centered modal overlay
 *
 * Features:
 * - Full-screen on mobile, centered modal on desktop
 * - Auto-focus input on open
 * - Escape to close (with dirty check)
 * - Click outside to cancel (with confirmation if changed)
 * - Larger input area for long content
 * - Shows section context
 */
export function ModalEditor({
  open,
  sectionId,
  sectionLabel,
  field,
  currentValue,
  metadata,
  onSave,
  onCancel,
}: ModalEditorProps) {
  const [inputValue, setInputValue] = useState(String(currentValue ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when opening with new values
  useEffect(() => {
    if (open) {
      // Handle array values properly (e.g., paragraphs, lists)
      let displayValue: string;
      if (Array.isArray(currentValue)) {
        displayValue = currentValue.join("\n");
      } else {
        displayValue = String(currentValue ?? "");
      }

      setInputValue(displayValue);
      setError(null);
      setIsValid(true);
      setIsDirty(false);

      // Focus after a brief delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open, currentValue]);

  // Debounced validation
  useEffect(() => {
    if (!open) return;

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
  }, [inputValue, metadata, open]);

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

    // Check if the original value was an array
    if (Array.isArray(currentValue)) {
      // Split by newlines and filter out empty lines
      valueToSave = inputValue
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } else if (metadata.type === "number") {
      valueToSave = Number(inputValue);
    }

    onSave(valueToSave);
  };

  const handleCancel = () => {
    // Warn if there are unsaved changes
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to cancel?"
      );
      if (!confirmed) return;
    }
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
    // For single-line inputs, Enter saves
    if (e.key === "Enter" && metadata.type !== "longtext" && !e.shiftKey) {
      e.preventDefault();
      if (isValid) {
        handleSave();
      }
    }
  };

  const showCharCount = metadata.maxLength && metadata.maxLength > 0;
  const isMultiline = metadata.type === "longtext";

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      title={`Edit Field: ${metadata.label}`}
      description={`Section: ${sectionLabel}`}
    >
      <div className="space-y-4">
        {/* Input */}
        <div className="space-y-2">
          {isMultiline ? (
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={inputValue}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={metadata.placeholder}
              rows={10}
              className={`w-full ${
                error ? "border-red-500 focus:ring-red-500" : ""
              }`}
              aria-label={`Edit ${metadata.label}`}
              aria-invalid={!isValid}
              aria-describedby={error ? `${field}-modal-error` : undefined}
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
              aria-describedby={error ? `${field}-modal-error` : undefined}
            />
          )}

          {/* Validation error */}
          {error && (
            <p
              id={`${field}-modal-error`}
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

          {/* Field info */}
          {metadata.helpText && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              💡 {metadata.helpText}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={handleCancel}
            aria-label="Cancel editing"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!isValid || !isDirty}
            aria-label="Save changes"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
