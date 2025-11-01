import { PreviewChange, WebsiteContent } from "@/types/content";
import { useCallback, useEffect, useRef, useState } from "react";

interface UsePreviewUpdateProps {
  siteId: string;
  currentHTML: string;
}

interface UsePreviewUpdateReturn {
  previewHTML: string;
  isPreviewLoading: boolean;
  updatePreview: (
    changes: PreviewChange[],
    sections: WebsiteContent["sections"]
  ) => Promise<void>;
}

/**
 * Custom hook to manage preview HTML updates.
 * Automatically generates preview when changes occur.
 * Separates preview generation logic from UI state management.
 */
export function usePreviewUpdate({
  siteId,
  currentHTML,
}: UsePreviewUpdateProps): UsePreviewUpdateReturn {
  const [previewHTML, setPreviewHTML] = useState<string>(currentHTML);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const updatePreview = useCallback(
    async (changes: PreviewChange[], sections: WebsiteContent["sections"]) => {
      // If no changes, use current HTML
      if (changes.length === 0) {
        setPreviewHTML(currentHTML);
        return;
      }

      // Cancel previous request if in flight
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsPreviewLoading(true);

      try {
        const response = await fetch(`/api/preview/${siteId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentHTML,
            changes,
            sections,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          console.error(
            `[usePreviewUpdate] Failed to generate preview, status: ${response.status}`
          );
          setPreviewHTML(currentHTML);
          return;
        }

        const { html } = await response.json();
        setPreviewHTML(html);
      } catch (error) {
        // Ignore AbortError (cancelled requests)
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error("[usePreviewUpdate] Preview update failed:", error);
        setPreviewHTML(currentHTML);
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [siteId, currentHTML]
  );

  return {
    previewHTML,
    isPreviewLoading,
    updatePreview,
  };
}
