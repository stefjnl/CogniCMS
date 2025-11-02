"use client";

import { useState } from "react";
import { WebsiteContent, PreviewChange, SectionType } from "@/types/content";

const SECTION_TYPE_VALUES: SectionType[] = [
  "hero",
  "content",
  "list",
  "contact",
  "navigation",
  "footer",
  "article",
  "sidebar",
  "main",
  "orphan",
  "custom",
];

const SECTION_TYPE_ICONS: Record<SectionType, string> = {
  hero: "🎯",
  content: "📄",
  list: "📋",
  contact: "📧",
  navigation: "🧭",
  footer: "⬇️",
  article: "📰",
  sidebar: "📌",
  main: "📦",
  orphan: "🔍",
  custom: "✨",
};

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  hero: "Hero",
  content: "Content",
  list: "List",
  contact: "Contact",
  navigation: "Navigation",
  footer: "Footer",
  article: "Article",
  sidebar: "Sidebar",
  main: "Main",
  orphan: "Other",
  custom: "Custom",
};

function resolveSectionType(type: string): SectionType {
  return SECTION_TYPE_VALUES.includes(type as SectionType)
    ? (type as SectionType)
    : "custom";
}
import {
  inferFieldMetadata,
  shouldUseModalEditor,
} from "@/lib/utils/fieldMetadata";
import { FieldEditor } from "./FieldEditor";
import { Button } from "@/components/ui/Button";

interface ContentOverviewProps {
  content: WebsiteContent | null;
  pendingChanges?: PreviewChange[];
  onStartEdit?: (
    sectionId: string,
    field: string,
    editMode: "inline" | "modal"
  ) => void;
  editingField?: {
    sectionId: string;
    field: string;
    editMode: "inline" | "modal";
  } | null;
  onSaveEdit?: (sectionId: string, field: string, newValue: unknown) => void;
  onCancelEdit?: () => void;
}

export function ContentOverview({
  content,
  pendingChanges = [],
  onStartEdit,
  editingField,
  onSaveEdit,
  onCancelEdit,
}: ContentOverviewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  // Helper to check if a field has pending changes
  const hasPendingChange = (sectionId: string, field: string): boolean => {
    return pendingChanges.some(
      (change) => change.sectionId === sectionId && change.field === field
    );
  };

  if (!content || !content.sections) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">Loading content...</p>
      </div>
    );
  }

  // Handle both array and object formats for sections
  const sectionsArray = Array.isArray(content.sections)
    ? content.sections
    : Object.entries(content.sections).map(([id, section]: [string, any]) => ({
        id,
        label: section.label || id,
        type: section.type || "content",
        content: section.content || section,
      }));

  if (sectionsArray.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">No sections found in content.</p>
      </div>
    );
  }

  const metadataEntries = Object.entries(content.metadata ?? {}).filter(
    ([key]) => key !== "schemaVersion"
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const formatValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return `Array (${value.length} items)`;
    if (typeof value === "object" && value !== null) {
      return `Object (${Object.keys(value).length} fields)`;
    }
    return String(value);
  };

  return (
    <div className="space-y-4">
      {metadataEntries.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              🧭 Site Metadata
            </h3>
          </div>
          <div className="px-4 py-3">
            <dl className="space-y-3 text-sm">
              {metadataEntries.map(([key, value]) => {
                const pending = hasPendingChange("metadata", key);
                return (
                  <div
                    key={key}
                    className={`flex flex-col rounded p-2 ${
                      pending ? "bg-amber-50 border border-amber-200" : ""
                    }`}
                  >
                    <dt className="font-medium text-slate-700 capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </dt>
                    <dd className="mt-1 text-slate-600">
                      {typeof value === "string" ? value : String(value)}
                      {pending && (
                        <span className="ml-2 text-xs text-amber-600">
                          (modified, not published)
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            📄 Current Site Content
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {sectionsArray.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const contentEntries = Object.entries(section.content);
            const resolvedType = resolveSectionType(section.type);
            const sectionIcon = SECTION_TYPE_ICONS[resolvedType];
            const sectionTypeLabel = SECTION_TYPE_LABELS[resolvedType];

            return (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="mr-2 text-slate-400">
                        {isExpanded ? "▼" : "▶"}
                      </span>
                      <span className="font-medium text-slate-900">
                        {section.label}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        ({contentEntries.length} fields)
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      <span role="img" aria-hidden="true">
                        {sectionIcon}
                      </span>
                      {sectionTypeLabel}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <dl className="space-y-3 text-sm">
                      {contentEntries.map(([key, value]) => {
                        const isEditing =
                          editingField?.sectionId === section.id &&
                          editingField?.field === key;
                        const isPending = hasPendingChange(section.id, key);
                        const metadata = inferFieldMetadata(
                          section.id,
                          key,
                          value
                        );
                        const useModal = shouldUseModalEditor(metadata, value);

                        return (
                          <div
                            key={key}
                            className={`flex flex-col p-2 rounded ${
                              isPending
                                ? "bg-amber-50 border border-amber-200"
                                : ""
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <dt className="font-medium text-slate-700">
                                {key}:
                              </dt>
                              {!isEditing && onStartEdit && (
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={() =>
                                    onStartEdit(
                                      section.id,
                                      key,
                                      useModal ? "modal" : "inline"
                                    )
                                  }
                                  className="opacity-60 hover:opacity-100"
                                  aria-label={`Edit ${key}`}
                                >
                                  {isPending && (
                                    <span className="mr-1">🟡</span>
                                  )}
                                  ✏️ Edit
                                </Button>
                              )}
                            </div>

                            {isEditing ? (
                              <div className="mt-2">
                                <FieldEditor
                                  sectionId={section.id}
                                  sectionLabel={section.label}
                                  field={key}
                                  currentValue={value}
                                  metadata={metadata}
                                  editMode={editingField.editMode}
                                  onSave={(newValue) =>
                                    onSaveEdit?.(section.id, key, newValue)
                                  }
                                  onCancel={() => onCancelEdit?.()}
                                />
                              </div>
                            ) : (
                              <dd className="mt-1 text-slate-600">
                                {formatValue(value)}
                                {isPending && (
                                  <span className="ml-2 text-xs text-amber-600">
                                    (modified, not published)
                                  </span>
                                )}
                              </dd>
                            )}
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
