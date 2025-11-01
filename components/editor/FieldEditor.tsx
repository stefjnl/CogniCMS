"use client";

import { FieldMetadata } from "@/types/content";
import { shouldUseModalEditor } from "@/lib/utils/fieldMetadata";
import { InlineEditor } from "./InlineEditor";
import { ModalEditor } from "./ModalEditor";

interface FieldEditorProps {
  sectionId: string;
  sectionLabel: string;
  field: string;
  currentValue: unknown;
  metadata: FieldMetadata;
  editMode: "inline" | "modal";
  onSave: (newValue: unknown) => void;
  onCancel: () => void;
}

/**
 * FieldEditor - Wrapper component that routes to inline or modal editor
 *
 * Decision logic:
 * - Inline: Short text (<100 chars), dates, emails, URLs, numbers
 * - Modal: Long text (>100 chars), description/bio/content fields
 */
export function FieldEditor({
  sectionId,
  sectionLabel,
  field,
  currentValue,
  metadata,
  editMode,
  onSave,
  onCancel,
}: FieldEditorProps) {
  if (editMode === "modal") {
    return (
      <ModalEditor
        open={true}
        sectionId={sectionId}
        sectionLabel={sectionLabel}
        field={field}
        currentValue={currentValue}
        metadata={metadata}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
  }

  return (
    <InlineEditor
      sectionId={sectionId}
      field={field}
      currentValue={currentValue}
      metadata={metadata}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
}
