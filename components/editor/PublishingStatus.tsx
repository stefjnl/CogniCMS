"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";

interface PublishingStatusProps {
  state: "idle" | "pending" | "publishing" | "published" | "error";
  changeCount: number;
  message?: string;
  onPublish?: () => void;
  onViewLive?: () => void;
}

export function PublishingStatus({
  state,
  changeCount,
  message,
  onPublish,
  onViewLive,
}: PublishingStatusProps) {
  if (state === "idle" || changeCount === 0) {
    return null;
  }

  if (state === "pending") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🟡</span>
            <div>
              <p className="font-medium text-amber-900">
                {changeCount} {changeCount === 1 ? "change" : "changes"} pending
              </p>
              <p className="text-sm text-amber-700">
                Review changes before publishing
              </p>
            </div>
          </div>
          {onPublish && (
            <Button onClick={onPublish} size="sm">
              Publish Now
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (state === "publishing") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-3">
          <LoadingSpinner />
          <div className="flex-1">
            <p className="font-medium text-blue-900">Publishing to GitHub...</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-200">
              <div className="h-full animate-pulse bg-blue-500" style={{ width: "70%" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === "published") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-medium text-green-900">Published!</p>
              <p className="text-sm text-green-700">
                {message || "Live in ~90 seconds"}
              </p>
            </div>
          </div>
          {onViewLive && (
            <Button onClick={onViewLive} size="sm" variant="secondary">
              View Live Site
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">❌</span>
          <div>
            <p className="font-medium text-red-900">Publishing failed</p>
            <p className="text-sm text-red-700">{message || "An error occurred"}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
