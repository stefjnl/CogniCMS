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
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Proposed Changes
        </h3>
        {changes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No changes detected.</p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm text-slate-700">
            {changes.map((change) => (
              <li
                key={`${change.sectionId}-${change.field}`}
                className="rounded-md bg-slate-50 p-3"
              >
                <p className="font-medium text-slate-900">
                  {change.sectionLabel}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {change.field}
                </p>
                <div className="mt-2 grid gap-2 text-xs">
                  <div>
                    <span className="font-semibold text-slate-500">
                      Current:
                    </span>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-100 p-2 text-slate-700">
                      {JSON.stringify(change.currentValue, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="font-semibold text-brand-600">
                      Proposed:
                    </span>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-brand-50 p-2 text-slate-900">
                      {JSON.stringify(change.proposedValue, null, 2)}
                    </pre>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
