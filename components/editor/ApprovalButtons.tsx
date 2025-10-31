"use client";

import { Button } from "@/components/ui/Button";

interface ApprovalButtonsProps {
  onPublish: () => Promise<void>;
  onReset: () => void;
  disabled?: boolean;
  changeCount: number;
}

export function ApprovalButtons({
  onPublish,
  onReset,
  disabled,
  changeCount,
}: ApprovalButtonsProps) {
  if (changeCount === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {changeCount} {changeCount === 1 ? "change" : "changes"} ready
          </p>
          <p className="text-xs text-slate-600">
            Review changes before publishing
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onPublish} disabled={disabled}>
            Publish to Live Site
          </Button>
          <Button variant="secondary" onClick={onReset} disabled={disabled}>
            Discard All Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
