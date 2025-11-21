"use client";

import { useState, useMemo } from "react";
import { WebsiteContent, WebsiteSection, PreviewChange, SectionType } from "@/types/content";
import {
  PageDefinition,
  MetadataFieldDefinition,
  SectionDefinition,
  FieldDefinition,
} from "@/types/content-schema";
import {
  Input,
  Textarea,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui";
import {
  inferFieldMetadata,
  shouldUseModalEditor,
} from "@/lib/utils/fieldMetadata";
import { FieldEditor } from "./FieldEditor";
import { Button } from "@/components/ui/Button";

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
interface ContentOverviewProps {
  content: WebsiteContent | null;
  pendingChanges?: PreviewChange[];
  pageDefinition?: PageDefinition;
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
  showOnlyMetadata?: boolean;
  showOnlySections?: boolean;
}

export function ContentOverview({
  content,
  pendingChanges = [],
  pageDefinition,
  onStartEdit,
  editingField,
  onSaveEdit,
  onCancelEdit,
  showOnlyMetadata = false,
  showOnlySections = false,
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

  // Grouped metadata fields for schema-driven UI.
  const groupedMetadata = useMemo(() => {
    if (!pageDefinition || !pageDefinition.metadata) return null;

    const groups = new Map<string, MetadataFieldDefinition[]>();
    for (const def of pageDefinition.metadata) {
      const groupId = def.group || "seo";
      if (!groups.has(groupId)) groups.set(groupId, []);
      groups.get(groupId)!.push(def);
    }
    return groups;
  }, [pageDefinition]);

  // Map of schema section definitions for quick lookup.
  const sectionDefinitionMap = useMemo(() => {
    if (!pageDefinition) return new Map<string, SectionDefinition>();
    const map = new Map<string, SectionDefinition>();
    for (const section of pageDefinition.sections) {
      map.set(section.id, section);
    }
    return map;
  }, [pageDefinition]);

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

  // Render schema-driven metadata field control.
  const renderMetadataField = (def: MetadataFieldDefinition) => {
    if (!content) return null;
    const key = def.metadataKey as string;
    const value = (content.metadata as any)?.[key] ?? "";
    const pending = hasPendingChange("metadata", key);

    const handleChange = (next: string) => {
      onSaveEdit?.("metadata", key, next);
    };

    const label = (
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[10px] font-medium text-slate-700">
          {def.label}
        </Label>
        {pending && (
          <span className="text-[9px] font-semibold text-amber-600">
            modified
          </span>
        )}
      </div>
    );

    const inputClasses =
      "w-full rounded-md border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-50";

    if (def.type === "longtext") {
      return (
        <div key={key} className="space-y-1.5">
          {label}
          <Textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className={`${inputClasses} min-h-[56px] resize-y`}
            placeholder={def.description}
          />
          {def.description && (
            <p className="text-[9px] text-slate-500">{def.description}</p>
          )}
        </div>
      );
    }

    const inputType =
      def.type === "url"
        ? "url"
        : def.type === "email"
        ? "email"
        : "text";

    return (
      <div key={key} className="space-y-1.5">
        {label}
        <Input
          type={inputType}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClasses}
          placeholder={def.description}
        />
        {def.description && (
          <p className="text-[9px] text-slate-500">{def.description}</p>
        )}
      </div>
    );
  };

  // Render schema-driven section field mapped to WebsiteSection.content.
  const renderSectionField = (
    section: WebsiteSection,
    def: FieldDefinition
  ) => {
    const key = def.key;
    const rawValue = (section.content as any)?.[key] ?? "";
    const pending = hasPendingChange(section.id, key);

    const handleChange = (next: unknown) => {
      onSaveEdit?.(section.id, key, next);
    };

    const label = (
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[10px] font-medium text-slate-700">
          {def.label}
        </Label>
        {pending && (
          <span className="text-[9px] font-semibold text-amber-600">
            modified
          </span>
        )}
      </div>
    );

    const inputClasses =
      "w-full rounded-md border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-50";

    if (def.type === "longtext") {
      return (
        <div key={key} className="space-y-1.5">
          {label}
          <Textarea
            value={
              typeof rawValue === "string"
                ? rawValue
                : rawValue
                ? JSON.stringify(rawValue, null, 2)
                : ""
            }
            onChange={(e) => handleChange(e.target.value)}
            className={`${inputClasses} min-h-[72px] resize-y`}
            placeholder={def.description}
          />
          {def.description && (
            <p className="text-[9px] text-slate-500">{def.description}</p>
          )}
        </div>
      );
    }

    if (
      def.type === "list" ||
      def.type === "faq" ||
      def.type === "json"
    ) {
      const stringValue =
        typeof rawValue === "string"
          ? rawValue
          : rawValue
          ? JSON.stringify(rawValue, null, 2)
          : "";
      return (
        <div key={key} className="space-y-1.5">
          {label}
          <Textarea
            value={stringValue}
            onChange={(e) => handleChange(e.target.value)}
            className={`${inputClasses} font-mono min-h-[80px]`}
            placeholder={
              def.description ||
              "Structured content (list/faq/json). JSON format recommended."
            }
          />
          {def.description && (
            <p className="text-[9px] text-slate-500">{def.description}</p>
          )}
        </div>
      );
    }

    const type =
      def.type === "url"
        ? "url"
        : def.type === "email"
        ? "email"
        : def.type === "number"
        ? "number"
        : "text";

    return (
      <div key={key} className="space-y-1.5">
        {label}
        <Input
          type={type}
          value={
            typeof rawValue === "string"
              ? rawValue
              : rawValue != null
              ? String(rawValue)
              : ""
          }
          onChange={(e) => handleChange(e.target.value)}
          className={inputClasses}
          placeholder={def.description}
        />
        {def.description && (
          <p className="text-[9px] text-slate-500">{def.description}</p>
        )}
      </div>
    );
  };

  const cardBase =
    "rounded-xl border bg-white/60 backdrop-blur-sm shadow-sm p-4";
  const labelBase = "text-xs font-medium text-slate-600";

  return (
    <div className="space-y-4">
      {/* SITE METADATA */}
      {!showOnlySections && pageDefinition && groupedMetadata && (
        <div className={cardBase}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                Site metadata
              </div>
              <div className="text-[10px] text-slate-500">
                Titel, SEO en technische instellingen
              </div>
            </div>
            <div className="text-[9px] text-slate-400 text-right">
              Schema-driven for {pageDefinition.label}
            </div>
          </div>
          <div className="pt-1 space-y-3">
            {Array.from(groupedMetadata.entries()).map(([groupId, fields]) => (
              <div key={groupId} className="space-y-1.5">
                <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  {groupId === "seo"
                    ? "SEO"
                    : groupId === "branding"
                    ? "Branding"
                    : groupId === "contact"
                    ? "Contact"
                    : groupId === "social"
                    ? "Social"
                    : groupId === "cta"
                    ? "Calls To Action"
                    : "Technical"}
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {fields.map((f) => renderMetadataField(f))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showOnlySections && !pageDefinition && metadataEntries.length > 0 && (
        <div className={cardBase}>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
              Site metadata
            </div>
            <div className="text-[9px] text-slate-400">Auto-detected</div>
          </div>
          <div className="space-y-1.5 text-xs">
            {metadataEntries.map(([key, value]) => {
              const pending = hasPendingChange("metadata", key);
              return (
                <div
                  key={key}
                  className={`flex flex-col rounded-md px-2 py-1 ${
                    pending
                      ? "bg-amber-50/80 border border-amber-200"
                      : "bg-slate-50/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={labelBase}>
                      {key.replace(/([A-Z])/g, " $1")}
                    </span>
                    {pending && (
                      <span className="text-[8px] font-semibold text-amber-600">
                        Modified
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    {typeof value === "string" ? value : String(value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PAGE SECTIONS */}
      {!showOnlyMetadata && (
      <div className={`${cardBase} space-y-3`}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            Page sections
          </div>
          {pageDefinition && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-medium text-indigo-700">
              Schema: {pageDefinition.label}
            </span>
          )}
        </div>
        <div className="space-y-2">
          {sectionsArray.map((section) => {
            const schema = sectionDefinitionMap.get(section.id);
            const isExpanded = expandedSections.has(section.id);
            const contentEntries = Object.entries(section.content);
            const resolvedType = resolveSectionType(section.type);
            const sectionIcon = SECTION_TYPE_ICONS[resolvedType];
            const sectionTypeLabel = SECTION_TYPE_LABELS[resolvedType];

            const isModified = pendingChanges.some(
              (c) => c.sectionId === section.id
            );

            return (
              <section
                key={section.id}
                className="rounded-lg border border-slate-100 bg-slate-50/40 hover:bg-slate-50/80 transition-colors overflow-hidden"
              >
                <header
                  className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-800">
                      {section.label}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 text-[9px] font-medium text-slate-600 px-1.5 py-0.5 gap-1">
                      <span role="img" aria-hidden="true">
                        {sectionIcon}
                      </span>
                      {sectionTypeLabel}
                    </span>
                    {schema && (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 text-[8px] font-medium text-indigo-600 px-1 py-0.5">
                        Schema
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isModified && (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 text-[8px] font-semibold text-indigo-600 px-1.5 py-0.5">
                        Modified
                      </span>
                    )}
                    <span className="text-[9px] text-slate-500">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  </div>
                </header>
                {isExpanded && (
                  <div className="px-2.5 pb-2 pt-1.5 space-y-2 bg-white/70">
                    <dl className="space-y-1.5 text-[10px]">
                      {schema
                        ? schema.fields.map((fieldDef) =>
                            renderSectionField(section, fieldDef)
                          )
                        : contentEntries.map(([key, value]) => {
                            const isEditing =
                              editingField?.sectionId === section.id &&
                              editingField?.field === key;
                            const isPending = hasPendingChange(
                              section.id,
                              key
                            );
                            const metadata = inferFieldMetadata(
                              section.id,
                              key,
                              value
                            );
                            const useModal = shouldUseModalEditor(
                              metadata,
                              value
                            );

                            return (
                              <div
                                key={key}
                                className={`flex flex-col p-1.5 rounded-md ${
                                  isPending
                                    ? "bg-amber-50/80 border border-amber-200"
                                    : "bg-slate-50/60"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <dt className={labelBase}>{key}</dt>
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
                                      className="h-5 px-1.5 text-[9px] text-slate-500 hover:text-slate-800"
                                      aria-label={`Edit ${key}`}
                                    >
                                      {isPending && (
                                        <span className="mr-0.5">🟡</span>
                                      )}
                                      Edit
                                    </Button>
                                  )}
                                </div>
                                {isEditing ? (
                                  <div className="mt-1">
                                    <FieldEditor
                                      sectionId={section.id}
                                      sectionLabel={section.label}
                                      field={key}
                                      currentValue={value}
                                      metadata={metadata}
                                      editMode={editingField.editMode}
                                      onSave={(newValue) =>
                                        onSaveEdit?.(
                                          section.id,
                                          key,
                                          newValue
                                        )
                                      }
                                      onCancel={() => onCancelEdit?.()}
                                    />
                                  </div>
                                ) : (
                                  <dd className="mt-0.5 text-slate-600">
                                    {formatValue(value)}
                                    {isPending && (
                                      <span className="ml-1 text-[8px] font-medium text-amber-600">
                                        modified
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
              </section>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
