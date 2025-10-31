"use client";

import { useEffect, useRef } from "react";
import { PreviewChange } from "@/types/content";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface SitePreviewProps {
  siteId: string;
  currentHTML: string;
  proposedChanges?: PreviewChange[];
  onApprove: () => void;
  onDiscard: () => void;
  isPublishing?: boolean;
}

export function SitePreview({
  siteId,
  currentHTML,
  proposedChanges = [],
  onApprove,
  onDiscard,
  isPublishing = false,
}: SitePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const changeCount = proposedChanges.length;

  // Auto-scroll to first changed element when changes are applied
  useEffect(() => {
    if (changeCount > 0) {
      const timer = setTimeout(() => {
        scrollToFirstChange();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [changeCount]);

  const scrollToFirstChange = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    try {
      const doc = iframe.contentWindow.document;
      const firstChanged = doc.querySelector(".cognicms-changed");

      if (firstChanged) {
        firstChanged.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    } catch (error) {
      console.error("Failed to scroll to change:", error);
    }
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([currentHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col border-t-2 border-slate-200 bg-slate-50 p-4">
      {/* Header Bar */}
      <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-700">Site Preview</h3>
          {changeCount > 0 && (
            <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
              🟡 {changeCount} {changeCount === 1 ? "change" : "changes"}{" "}
              pending
            </span>
          )}
          {isPublishing && (
            <span className="flex items-center gap-2 text-xs text-slate-600">
              <LoadingSpinner />
              <span>⏳ Publishing...</span>
            </span>
          )}
        </div>
        <button
          onClick={handleOpenInNewTab}
          className="text-xs text-slate-600 hover:text-slate-900"
          title="Open in new tab"
        >
          Open in New Tab ↗
        </button>
      </div>

      {/* iframe Container */}
      <div className="mx-auto w-full max-w-7xl">
        <div className="overflow-hidden rounded-lg bg-white shadow-lg">
          <iframe
            ref={iframeRef}
            srcDoc={currentHTML}
            sandbox="allow-same-origin allow-scripts"
            className="h-[800px] w-full border-0"
            title="Site Preview"
          />
        </div>
      </div>

      {/* Action Buttons */}
      {changeCount > 0 && (
        <div className="mt-4 flex justify-center gap-4">
          <Button
            onClick={onApprove}
            disabled={isPublishing}
            className="bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPublishing ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner />
                Publishing...
              </span>
            ) : (
              "✓ Approve & Publish"
            )}
          </Button>
          <Button
            onClick={onDiscard}
            disabled={isPublishing}
            className="bg-slate-600 px-6 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            ✕ Discard Changes
          </Button>
        </div>
      )}
    </div>
  );
}
