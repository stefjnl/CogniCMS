"use client";

import { PreviewChange } from "@/types/content";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface ChangeCardProps {
  change: PreviewChange;
  onApply?: (change: PreviewChange) => void;
  onReject?: (change: PreviewChange) => void;
  compact?: boolean;
}

export function ChangeCard({
  change,
  onApply,
  onReject,
  compact = false,
}: ChangeCardProps) {
  const formatValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  };

  const getChangeType = (): { label: string; color: string; icon: string } => {
    if (change.currentValue === null || change.currentValue === "") {
      return {
        label: "Addition",
        color: "bg-success-100 text-success-700 border-success-200",
        icon: "➕",
      };
    }
    if (change.proposedValue === null || change.proposedValue === "") {
      return {
        label: "Deletion",
        color: "bg-red-100 text-red-700 border-red-200",
        icon: "➖",
      };
    }
    return {
      label: "Modification",
      color: "bg-brand-100 text-brand-700 border-brand-200",
      icon: "✏️",
    };
  };

  const changeType = getChangeType();

  const getSourceInfo = (): { icon: string; label: string; color: string } => {
    if (change.source === "manual") {
      return { icon: "👤", label: "Manual edit", color: "text-blue-600" };
    }
    return { icon: "🤖", label: "AI suggestion", color: "text-purple-600" };
  };

  const sourceInfo = getSourceInfo();

  const getRelativeTime = (timestamp?: string): string => {
    if (!timestamp) return "";
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  if (compact) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`rounded border px-2 py-0.5 text-xs font-medium ${changeType.color}`}
              >
                {changeType.icon} {changeType.label}
              </span>
              <span className="text-xs text-slate-500">
                {change.sectionLabel}
              </span>
              {change.source && (
                <span
                  className={`text-xs ${sourceInfo.color}`}
                  title={sourceInfo.label}
                >
                  {sourceInfo.icon}
                </span>
              )}
              {change.timestamp && (
                <span className="text-xs text-slate-400">
                  {getRelativeTime(change.timestamp)}
                </span>
              )}
            </div>
            <p className="mb-2 text-sm font-medium text-slate-900">
              {change.field}
            </p>
            <div className="space-y-1 text-xs">
              {change.currentValue !== null &&
                change.currentValue !== undefined &&
                change.currentValue !== "" && (
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-red-600">−</span>
                    <span className="text-slate-600 line-through">
                      {formatValue(change.currentValue)}
                    </span>
                  </div>
                )}
              {change.proposedValue !== null &&
                change.proposedValue !== undefined &&
                change.proposedValue !== "" && (
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-success-600">+</span>
                    <span className="font-medium text-slate-900">
                      {formatValue(change.proposedValue)}
                    </span>
                  </div>
                )}
            </div>
          </div>
          {(onApply || onReject) && (
            <div className="flex gap-1">
              {onApply && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onApply(change)}
                  className="text-xs"
                  title="Apply this change"
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
                  title="Reject this change"
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
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded border px-2.5 py-1 text-xs font-semibold ${changeType.color}`}
            >
              {changeType.icon} {changeType.label}
            </span>
            <Badge variant="secondary">{change.sectionLabel}</Badge>
            {change.source && (
              <span
                className={`text-sm ${sourceInfo.color}`}
                title={sourceInfo.label}
              >
                {sourceInfo.icon} {sourceInfo.label}
              </span>
            )}
          </div>
          <h4 className="text-lg font-semibold text-slate-900">
            {change.field}
          </h4>
          {change.timestamp && (
            <p className="text-xs text-slate-500">
              Changed {getRelativeTime(change.timestamp)}
            </p>
          )}
        </div>
      </div>

      {/* Side-by-side diff view */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-700">
            <span>−</span>
            <span>Current Value</span>
          </p>
          <pre className="whitespace-pre-wrap text-sm text-slate-700">
            {formatValue(change.currentValue) || (
              <span className="italic text-slate-400">(empty)</span>
            )}
          </pre>
        </div>

        <div className="rounded-lg border border-success-200 bg-success-50 p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-success-700">
            <span>+</span>
            <span>Proposed Value</span>
          </p>
          <pre className="whitespace-pre-wrap text-sm font-medium text-slate-900">
            {formatValue(change.proposedValue) || (
              <span className="italic text-slate-400">(empty)</span>
            )}
          </pre>
        </div>
      </div>

      {(onApply || onReject) && (
        <div className="mt-4 flex gap-2">
          {onApply && (
            <Button onClick={() => onApply(change)} size="sm" variant="primary">
              ✓ Apply Change
            </Button>
          )}
          {onReject && (
            <Button
              variant="secondary"
              onClick={() => onReject(change)}
              size="sm"
            >
              ✗ Reject Change
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
