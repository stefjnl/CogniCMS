import { PreviewChange, WebsiteContent } from "@/types/content";
import { Button } from "@/components/ui/Button";
import { ChangeCard } from "./ChangeCard";

interface PreviewPanelProps {
  draftContent: WebsiteContent | null;
  changes: PreviewChange[];
  onDiscardChange?: (sectionId: string, field: string) => void;
  onDiscardAll?: () => void;
}

export function PreviewPanel({
  draftContent,
  changes,
  onDiscardChange,
  onDiscardAll,
}: PreviewPanelProps) {
  if (!draftContent) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
        No preview available yet.
      </div>
    );
  }

  // Group changes by source
  const manualChanges = changes.filter((c) => c.source === "manual");
  const aiChanges = changes.filter((c) => c.source === "ai");
  const unknownChanges = changes.filter((c) => !c.source);

  const handleDiscardAll = () => {
    if (
      window.confirm(
        `Are you sure you want to discard all ${changes.length} changes?`
      )
    ) {
      onDiscardAll?.();
    }
  };

  const handleDiscardChange = (change: PreviewChange) => {
    onDiscardChange?.(change.sectionId, change.field);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Proposed Changes ({changes.length})
          </h3>
          {changes.length > 0 && onDiscardAll && (
            <Button
              variant="secondary"
              size="xs"
              onClick={handleDiscardAll}
              className="text-xs"
            >
              Discard All
            </Button>
          )}
        </div>

        <div className="p-4">
          {changes.length === 0 ? (
            <p className="text-center text-sm text-slate-500">
              No changes detected.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Manual edits section */}
              {manualChanges.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-2">
                    <span>👤 Manual Edits ({manualChanges.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {manualChanges.map((change, idx) => (
                      <ChangeCard
                        key={`manual-${change.sectionId}-${change.field}-${idx}`}
                        change={change}
                        onReject={
                          onDiscardChange ? handleDiscardChange : undefined
                        }
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* AI suggestions section */}
              {aiChanges.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-2">
                    <span>🤖 AI Suggestions ({aiChanges.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {aiChanges.map((change, idx) => (
                      <ChangeCard
                        key={`ai-${change.sectionId}-${change.field}-${idx}`}
                        change={change}
                        onReject={
                          onDiscardChange ? handleDiscardChange : undefined
                        }
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Unknown source changes */}
              {unknownChanges.length > 0 && (
                <div className="space-y-2">
                  {unknownChanges.map((change, idx) => (
                    <ChangeCard
                      key={`unknown-${change.sectionId}-${change.field}-${idx}`}
                      change={change}
                      onReject={
                        onDiscardChange ? handleDiscardChange : undefined
                      }
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
