"use client";

import { PreviewChange } from "@/types/content";
import { Button } from "@/components/ui/Button";

interface ChangeCardProps {
  change: PreviewChange;
  onApply?: (change: PreviewChange) => void;
  onReject?: (change: PreviewChange) => void;
  compact?: boolean;
}

export function ChangeCard({ change, onApply, onReject, compact = false }: ChangeCardProps) {
  const formatValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  };

  if (compact) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-medium text-slate-900">
              ✏️ {change.sectionLabel} • {change.field}
            </p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="text-red-600">
                - {formatValue(change.currentValue)}
              </div>
              <div className="text-green-600">
                + {formatValue(change.proposedValue)}
              </div>
            </div>
          </div>
          {(onApply || onReject) && (
            <div className="flex gap-1">
              {onApply && (
                <Button
                  size="sm"
                  onClick={() => onApply(change)}
                  className="text-xs"
                >
                  ✓
                </Button>
              )}
              {onReject && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onReject(change)}
                  className="text-xs"
                >
                  ✗
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-blue-900">📝 PROPOSED CHANGE</h4>
          <p className="mt-1 text-sm text-blue-700">
            Section: <span className="font-medium">{change.sectionLabel}</span>
          </p>
          <p className="text-sm text-blue-700">
            Field: <span className="font-medium">{change.field}</span>
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded bg-white p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current
          </p>
          <pre className="whitespace-pre-wrap text-sm text-slate-700">
            {formatValue(change.currentValue)}
          </pre>
        </div>

        <div className="rounded bg-white p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
            New
          </p>
          <pre className="whitespace-pre-wrap text-sm text-slate-900">
            {formatValue(change.proposedValue)}
          </pre>
        </div>
      </div>

      {(onApply || onReject) && (
        <div className="mt-4 flex gap-2">
          {onApply && (
            <Button onClick={() => onApply(change)} size="sm">
              ✓ Apply This
            </Button>
          )}
          {onReject && (
            <Button
              variant="secondary"
              onClick={() => onReject(change)}
              size="sm"
            >
              ✗ Reject
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
