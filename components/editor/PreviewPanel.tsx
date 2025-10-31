import { PreviewChange, WebsiteContent } from "@/types/content";

interface PreviewPanelProps {
  draftContent: WebsiteContent | null;
  changes: PreviewChange[];
}

export function PreviewPanel({ draftContent, changes }: PreviewPanelProps) {
  if (!draftContent) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
        No preview available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Proposed Changes
          </h3>
        </div>

        <div className="p-4">
          {changes.length === 0 ? (
            <p className="text-center text-sm text-slate-500">
              No changes detected.
            </p>
          ) : (
            <div className="space-y-3">
              {changes.map((change, idx) => (
                <div
                  key={`${change.sectionId}-${change.field}-${idx}`}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">✏️</span>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {change.sectionLabel}
                      </p>
                      <p className="text-xs text-slate-500">{change.field}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="rounded bg-white p-2">
                      <span className="font-semibold text-red-600">- </span>
                      <span className="text-slate-700">
                        {typeof change.currentValue === "string"
                          ? change.currentValue
                          : JSON.stringify(change.currentValue)}
                      </span>
                    </div>
                    <div className="rounded bg-white p-2">
                      <span className="font-semibold text-green-600">+ </span>
                      <span className="text-slate-900">
                        {typeof change.proposedValue === "string"
                          ? change.proposedValue
                          : JSON.stringify(change.proposedValue)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
