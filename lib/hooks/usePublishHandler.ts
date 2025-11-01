import { PreviewChange, WebsiteContent } from "@/types/content";
import { SiteConfig } from "@/types/site";
import { useCallback, useState } from "react";

interface UsePublishHandlerProps {
  site: SiteConfig;
  draftContent: WebsiteContent | null;
  currentHTML: string;
  previewHTML: string;
  previewChanges: PreviewChange[];
  commitMessage: string;
  onSuccess: (publishedHTML: string) => void;
  onError: (error: string) => void;
}

interface UsePublishHandlerReturn {
  publishState: "idle" | "pending" | "publishing" | "published" | "error";
  statusMessage: string | null;
  handlePublish: () => Promise<void>;
  resetPublishState: () => void;
}

/**
 * Custom hook to manage the publish workflow.
 * Handles:
 * - Preview generation (if needed)
 * - Publishing to GitHub
 * - State coordination
 * - Error handling
 */
export function usePublishHandler({
  site,
  draftContent,
  currentHTML,
  previewHTML,
  previewChanges,
  commitMessage,
  onSuccess,
  onError,
}: UsePublishHandlerProps): UsePublishHandlerReturn {
  const [publishState, setPublishState] = useState<
    "idle" | "pending" | "publishing" | "published" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handlePublish = useCallback(async () => {
    if (!draftContent) {
      onError("No draft content available");
      return;
    }

    setPublishState("publishing");
    setStatusMessage(null);

    try {
      // Step 1: Generate fresh preview if there are changes
      let htmlToPublish = previewHTML;

      if (previewChanges.length > 0) {
        console.log(
          "[usePublishHandler] Generating fresh preview before publish..."
        );

        const previewResponse = await fetch(`/api/preview/${site.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentHTML,
            changes: previewChanges,
            sections: draftContent?.sections || [],
          }),
        });

        if (!previewResponse.ok) {
          throw new Error(
            `Failed to generate preview: ${previewResponse.status}`
          );
        }

        const { html } = await previewResponse.json();
        htmlToPublish = html;
        console.log("[usePublishHandler] Fresh preview generated successfully");
      }

      // Step 2: Publish to GitHub
      console.log("[usePublishHandler] Publishing to GitHub...");

      const publishResponse = await fetch(`/api/publish/${site.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draftContent,
          html: htmlToPublish,
          commitMessage,
        }),
      });

      const payload = await publishResponse.json();

      if (!publishResponse.ok) {
        throw new Error(payload.error ?? "Failed to publish changes");
      }

      // Step 3: Update state after successful publish
      console.log("[usePublishHandler] Publish successful");
      setPublishState("published");
      const message = payload.message ?? "Changes published successfully.";
      setStatusMessage(message);

      // Notify parent component with the published HTML
      onSuccess(htmlToPublish);

      // Auto-reset to idle after 5 seconds
      setTimeout(() => {
        setPublishState("idle");
        setStatusMessage(null);
      }, 5000);
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error("[usePublishHandler] Publish failed:", errorMessage);
      setPublishState("error");
      onError(errorMessage);
    }
  }, [
    draftContent,
    site.id,
    currentHTML,
    previewHTML,
    previewChanges,
    commitMessage,
    onSuccess,
    onError,
  ]);

  const resetPublishState = useCallback(() => {
    setPublishState("idle");
    setStatusMessage(null);
  }, []);

  return {
    publishState,
    statusMessage,
    handlePublish,
    resetPublishState,
  };
}
