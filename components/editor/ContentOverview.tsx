"use client";

import { useState } from "react";
import { WebsiteContent } from "@/types/content";

interface ContentOverviewProps {
  content: WebsiteContent | null;
}

export function ContentOverview({ content }: ContentOverviewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  // Debug logging
  console.log("ContentOverview - content:", content);
  console.log("ContentOverview - sections:", content?.sections);

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
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {section.type}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <dl className="space-y-2 text-sm">
                      {contentEntries.map(([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <dt className="font-medium text-slate-700">{key}:</dt>
                          <dd className="mt-1 text-slate-600">
                            {formatValue(value)}
                          </dd>
                        </div>
                      ))}
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
