"use client";

import { ApprovalButtons } from "@/components/editor/ApprovalButtons";
import { ContentOverview } from "@/components/editor/ContentOverview";
import { MessageInput } from "@/components/editor/MessageInput";
import { MessageList } from "@/components/editor/MessageList";
import { PreviewPanel } from "@/components/editor/PreviewPanel";
import { PublishingStatus } from "@/components/editor/PublishingStatus";
import { SiteHeader } from "@/components/editor/SiteHeader";
import { SitePreview } from "@/components/editor/SitePreview";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusBar } from "@/components/ui/StatusBar";
import { diffWebsiteContent } from "@/lib/content/differ";
import { usePreviewUpdate, usePublishHandler } from "@/lib/hooks";
import { buildCommitMessage } from "@/lib/utils/commit";
import { useEditorShortcuts } from "@/lib/utils/keyboard";
import { PreviewChange, WebsiteContent } from "@/types/content";
import { SiteConfig } from "@/types/site";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ChatInterfaceProps {
  site: SiteConfig;
  initialContent: WebsiteContent;
  initialHTML: string;
  lastModified: string;
}

function parseJsonPlan(
  content: string
): { explanation: string; actions: unknown[] } | null {
  try {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return null;
    }
    const parsed = JSON.parse(content.slice(start, end + 1));
    return {
      explanation: parsed.explanation ?? content,
      actions: parsed.actions ?? [],
    };
  } catch {
    return null;
  }
}

export function ChatInterface({
  site,
  initialContent,
  initialHTML,
  lastModified,
}: ChatInterfaceProps) {
  const [draftContent, setDraftContent] = useState<WebsiteContent | null>(
    initialContent
  );
  const [currentHTML, setCurrentHTML] = useState<string>(initialHTML);
  const [previewChanges, setPreviewChanges] = useState<PreviewChange[]>([]);
  const [commitMessage, setCommitMessage] = useState(
    "[CogniCMS] Content update"
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [lastAppliedAssistantId, setLastAppliedAssistantId] = useState<
    string | null
  >(null);
  const [editingField, setEditingField] = useState<{
    sectionId: string;
    field: string;
    editMode: "inline" | "modal";
  } | null>(null);
  const baselineRef = useRef<WebsiteContent>(initialContent);
  const pendingRefreshRef = useRef(false);

  // Use the preview update hook for automatic preview generation
  const { previewHTML, isPreviewLoading, updatePreview } = usePreviewUpdate({
    siteId: site.id,
    currentHTML,
  });

  // Use the publish handler hook for coordinated publish operations
  const {
    publishState,
    statusMessage,
    handlePublish: executePublish,
    resetPublishState,
  } = usePublishHandler({
    site,
    draftContent,
    currentHTML,
    previewHTML,
    previewChanges,
    commitMessage,
    onSuccess: (publishedHTML: string) => {
      // After successful publish, update baseline
      baselineRef.current = draftContent!;
      setCurrentHTML(publishedHTML);
      setPreviewChanges([]);
    },
    onError: (error: string) => {
      setClientError(error);
    },
  });

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat/${site.id}`,
      }),
    [site.id]
  );

  const {
    messages: uiMessages,
    sendMessage,
    status: chatStatus,
    error: chatError,
    clearError,
  } = useChat({
    transport,
  });

  useEffect(() => {
    if (chatError) {
      setClientError(chatError.message);
    }
  }, [chatError]);

  const isChatStreaming =
    chatStatus === "submitted" || chatStatus === "streaming";

  const showSpinner = isChatStreaming;

  // AI thinking progress indicator
  const [aiThinking, setAiThinking] = useState<string | null>(null);

  useEffect(() => {
    if (isChatStreaming) {
      const messages = [
        "Analyzing content structure...",
        "Understanding your request...",
        "Generating changes...",
        "Applying updates...",
      ];
      let index = 0;
      setAiThinking(messages[0]);

      const interval = setInterval(() => {
        index = (index + 1) % messages.length;
        setAiThinking(messages[index]);
      }, 2000);

      return () => {
        clearInterval(interval);
        setAiThinking(null);
      };
    }
  }, [isChatStreaming]);

  // Update preview automatically when changes occur
  // This effect replaces the manual setTimeout calls
  useEffect(() => {
    updatePreview(previewChanges, draftContent?.sections || []);
  }, [previewChanges, draftContent?.sections, updatePreview]);

  const diffAgainstBaseline = useCallback(
    (nextContent: WebsiteContent) =>
      diffWebsiteContent(baselineRef.current, nextContent),
    []
  );

  const refreshDraft = useCallback(
    async (payloadExplanation?: string) => {
      const response = await fetch(`/api/content/${site.id}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to refresh content draft");
      }
      const body = await response.json();
      const nextContent = body.content as WebsiteContent;
      setDraftContent(nextContent);
      const changes = diffAgainstBaseline(nextContent);

      // Attribute changes to AI source (fixes AI editing preview issue)
      const attributedChanges = changes.map((change) => ({
        ...change,
        source: "ai" as const,
        timestamp: new Date().toISOString(),
      }));

      setPreviewChanges(attributedChanges);
      const nextCommit = buildCommitMessage(attributedChanges);
      setCommitMessage(nextCommit);
      // statusMessage is now managed by the publish hook, so we skip that
      // preview updates are now automatic via the effect
    },
    [diffAgainstBaseline, site.id]
  );

  const handleSend = useCallback(
    async (message: string) => {
      try {
        setClientError(null);
        clearError?.();
        pendingRefreshRef.current = true;
        await sendMessage(
          { text: message },
          {
            headers: {
              "X-Trace-Id": crypto.randomUUID(),
            },
          }
        );
      } catch (err) {
        pendingRefreshRef.current = false;
        setClientError((err as Error).message);
      }
    },
    [clearError, sendMessage]
  );

  const handleReset = useCallback(async () => {
    setDraftContent(baselineRef.current);
    setPreviewChanges([]);
    setCommitMessage("[CogniCMS] Content update");
    resetPublishState();
    await fetch(`/api/content/${site.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baselineRef.current),
    });
  }, [site.id, resetPublishState]);

  // handlePublish is now delegated to the usePublishHandler hook
  // This wraps executePublish and clears errors
  const handlePublish = useCallback(async () => {
    setClientError(null);
    await executePublish();
  }, [executePublish]);

  // Re-scan HTML to extract fresh content
  const handleRescan = useCallback(async () => {
    try {
      console.log("[RESCAN] Starting HTML re-extraction...");

      // Call the extract endpoint
      const response = await fetch(`/api/content/${site.id}/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Trace-Id": crypto.randomUUID(),
        },
      });

      if (!response.ok) {
        throw new Error(`Extract failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("[RESCAN] Extraction complete, fetching updated content...");

      // Fetch the updated content
      const contentResponse = await fetch(`/api/content/${site.id}`, {
        headers: {
          "X-Trace-Id": crypto.randomUUID(),
        },
      });

      if (!contentResponse.ok) {
        throw new Error(`Content fetch failed: ${contentResponse.statusText}`);
      }

      const { content } = await contentResponse.json();
      console.log("[RESCAN] Content updated, sections count:", content.sections.length);

      // Update the UI state
      setDraftContent(content);
      baselineRef.current = content;
      setPreviewChanges([]);
      setCommitMessage("[CogniCMS] Content update");

      alert(`✅ Re-scan complete! Found ${content.sections.length} sections.`);
    } catch (error) {
      console.error("[RESCAN] Error:", error);
      setClientError(`Re-scan failed: ${(error as Error).message}`);
    }
  }, [site.id]);

  // Manual editing handlers
  const handleStartEdit = useCallback(
    (sectionId: string, field: string, editMode: "inline" | "modal") => {
      setEditingField({ sectionId, field, editMode });
    },
    []
  );

  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (sectionId: string, field: string, newValue: unknown) => {
      if (!draftContent) return;

      try {
        // Clone the content
        const updatedContent: WebsiteContent = JSON.parse(
          JSON.stringify(draftContent)
        );

        // Handle both array and object formats for sections
        const sectionsArray = Array.isArray(updatedContent.sections)
          ? updatedContent.sections
          : Object.entries(updatedContent.sections).map(
              ([id, section]: [string, any]) => ({
                id,
                label: section.label || id,
                type: section.type || "content",
                content: section.content || section,
              })
            );

        // Find and update the section
        const section = sectionsArray.find((s) => s.id === sectionId);
        if (!section) {
          throw new Error(`Section ${sectionId} not found`);
        }

        // Update the field value
        section.content[field] = newValue;

        // If sections was originally an object, convert back
        if (!Array.isArray(updatedContent.sections)) {
          const sectionsObj: Record<string, any> = {};
          sectionsArray.forEach((s) => {
            sectionsObj[s.id] = s;
          });
          (updatedContent as any).sections = sectionsObj;
        } else {
          updatedContent.sections = sectionsArray;
        }

        // Check for conflicts with AI-generated changes
        const hasAIChangeForField = previewChanges.some(
          (change) =>
            change.sectionId === sectionId &&
            change.field === field &&
            change.source === "ai"
        );

        // Persist to cache
        const persistResponse = await fetch(`/api/content/${site.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedContent),
        });

        if (!persistResponse.ok) {
          throw new Error("Failed to save edit");
        }

        // Update local state
        setDraftContent(updatedContent);

        // Generate diff with source tracking
        const changes = diffAgainstBaseline(updatedContent);

        // Mark this specific change as manual (others from diff are AI)
        const updatedChanges = changes.map((change) => {
          if (change.sectionId === sectionId && change.field === field) {
            return {
              ...change,
              source: "manual" as const,
              timestamp: new Date().toISOString(),
            };
          }
          // Preserve existing source or default to AI
          return {
            ...change,
            source: change.source || ("ai" as const),
            timestamp: change.timestamp || new Date().toISOString(),
          };
        });

        setPreviewChanges(updatedChanges);

        // Update commit message
        const nextCommit = buildCommitMessage(updatedChanges);
        setCommitMessage(nextCommit);

        // Close the editor
        setEditingField(null);

        // Show success message - no status hook in this component level
        // Preview update will happen automatically via the effect
        // when previewChanges is updated above
      } catch (err) {
        setClientError((err as Error).message);
      }
    },
    [draftContent, diffAgainstBaseline, previewChanges, site.id]
  );

  const handleDiscardChange = useCallback(
    async (sectionId: string, field: string) => {
      if (!draftContent) return;

      try {
        // Clone baseline content
        const revertedContent: WebsiteContent = JSON.parse(
          JSON.stringify(draftContent)
        );

        // Handle both array and object formats for sections
        const sectionsArray = Array.isArray(revertedContent.sections)
          ? revertedContent.sections
          : Object.entries(revertedContent.sections).map(
              ([id, section]: [string, any]) => ({
                id,
                label: section.label || id,
                type: section.type || "content",
                content: section.content || section,
              })
            );

        const baselineSectionsArray = Array.isArray(
          baselineRef.current.sections
        )
          ? baselineRef.current.sections
          : Object.entries(baselineRef.current.sections).map(
              ([id, section]: [string, any]) => ({
                id,
                label: section.label || id,
                type: section.type || "content",
                content: section.content || section,
              })
            );

        // Find the section
        const section = sectionsArray.find((s) => s.id === sectionId);
        if (!section) return;

        // Revert the field to baseline value
        const baselineSection = baselineSectionsArray.find(
          (s) => s.id === sectionId
        );
        if (baselineSection && baselineSection.content[field] !== undefined) {
          section.content[field] = baselineSection.content[field];
        }

        // If sections was originally an object, convert back
        if (!Array.isArray(revertedContent.sections)) {
          const sectionsObj: Record<string, any> = {};
          sectionsArray.forEach((s) => {
            sectionsObj[s.id] = s;
          });
          (revertedContent as any).sections = sectionsObj;
        } else {
          revertedContent.sections = sectionsArray;
        }

        // Persist to cache
        await fetch(`/api/content/${site.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(revertedContent),
        });

        // Update local state
        setDraftContent(revertedContent);

        // Recompute changes
        const changes = diffAgainstBaseline(revertedContent);
        setPreviewChanges(changes);

        // Update commit message
        const nextCommit = buildCommitMessage(changes);
        setCommitMessage(nextCommit);

        // Update publish state
        if (changes.length === 0) {
          resetPublishState();
        }
      } catch (err) {
        setClientError((err as Error).message);
      }
    },
    [draftContent, diffAgainstBaseline, site.id]
  );

  const handleDiscardAll = useCallback(async () => {
    await handleReset();
  }, [handleReset]);

  const disablePublish = useMemo(
    () =>
      publishState === "publishing" ||
      isChatStreaming ||
      previewChanges.length === 0,
    [publishState, isChatStreaming, previewChanges.length]
  );

  // Keyboard shortcuts
  useEditorShortcuts({
    onSaveAction: () => {
      if (!disablePublish) {
        handlePublish();
      }
    },
    onUndoAction: handleReset,
  });

  useEffect(() => {
    if (chatStatus !== "ready") {
      return;
    }

    const assistantMessages = uiMessages.filter(
      (message) => message.role === "assistant"
    );
    const latestAssistant = assistantMessages[assistantMessages.length - 1];

    if (latestAssistant && latestAssistant.id !== lastAppliedAssistantId) {
      const explanationSource = extractAssistantSummary(latestAssistant).trim();
      const plan = parseJsonPlan(explanationSource);
      const explanation =
        (plan?.explanation ?? explanationSource) || "Content updated";

      pendingRefreshRef.current = false;
      refreshDraft(explanation)
        .then(() => {
          setLastAppliedAssistantId(latestAssistant.id);
        })
        .catch((err) => {
          setClientError((err as Error).message);
        });
      return;
    }

    if (pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      refreshDraft("Content updated").catch((err) => {
        setClientError((err as Error).message);
      });
    }
  }, [chatStatus, lastAppliedAssistantId, refreshDraft, uiMessages]);

  const visibleMessages = useMemo(
    () =>
      uiMessages.filter(
        (message) => message.role === "user" || message.role === "assistant"
      ),
    [uiMessages]
  );

  return (
    <div className="flex h-screen flex-col">
      <div className="flex-shrink-0 border-b border-slate-200 bg-white p-6">
        <SiteHeader site={site} lastSynced={lastModified} onRescan={handleRescan} />
        <div className="mt-4">
          <StatusBar
            gitHubConnected={true}
            aiModel="GPT-OSS-120B"
            unpublishedChanges={previewChanges.length}
          />
        </div>
      </div>

      {/* Main layout: Left column (2 rows) + Right column (site preview) */}
      <div className="flex flex-1 gap-6 overflow-hidden bg-slate-50 p-6">
        {/* Left Column: Top = Content Overview, Bottom = AI Chat */}
        <div className="flex w-2/5 flex-col gap-6">
          {/* Top Left: Content Overview + Preview Panel */}
          <div className="flex h-1/2 flex-col space-y-4 overflow-y-auto">
            <ContentOverview
              content={draftContent}
              pendingChanges={previewChanges}
              onStartEdit={handleStartEdit}
              editingField={editingField}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
            />

            <PreviewPanel
              draftContent={draftContent}
              changes={previewChanges}
              onDiscardChange={handleDiscardChange}
              onDiscardAll={handleDiscardAll}
            />

            <PublishingStatus
              state={publishState}
              changeCount={previewChanges.length}
              message={statusMessage || undefined}
              onPublish={handlePublish}
              onViewLive={() =>
                window.open(
                  `https://${site.githubOwner}.github.io/${site.githubRepo}/`,
                  "_blank"
                )
              }
            />

            <ApprovalButtons
              onPublish={handlePublish}
              onReset={handleReset}
              disabled={disablePublish}
              changeCount={previewChanges.length}
            />
          </div>

          {/* Bottom Left: AI Chat Panel */}
          <div className="flex h-1/2 flex-col space-y-4">
            <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <MessageList
                messages={visibleMessages}
                changes={previewChanges}
                lastAssistantMessageId={lastAppliedAssistantId}
              />
            </div>

            <MessageInput
              onSend={handleSend}
              disabled={isChatStreaming || publishState === "publishing"}
            />

            {showSpinner && (
              <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
                <LoadingSpinner />
                <div className="flex-1">
                  <p className="text-sm font-medium text-brand-900">
                    AI is working...
                  </p>
                  {aiThinking && (
                    <p className="text-xs text-brand-700">{aiThinking}</p>
                  )}
                </div>
              </div>
            )}

            {clientError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{clientError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Site Preview */}
        <div className="w-3/5 overflow-y-auto">
          <SitePreview
            siteId={site.id}
            currentHTML={previewHTML}
            proposedChanges={previewChanges}
            onApprove={handlePublish}
            onDiscard={handleReset}
            isPublishing={publishState === "publishing"}
          />
        </div>
      </div>
    </div>
  );
}

function formatToolSummary(output: unknown): string {
  if (!output) {
    return "";
  }

  if (typeof output === "string") {
    return output;
  }

  if (typeof output === "object") {
    const typed = output as { type?: string; value?: unknown };
    if (typeof typed.type === "string") {
      switch (typed.type) {
        case "text":
        case "error-text":
          return typeof typed.value === "string" ? typed.value : "";
        case "json":
        case "error-json":
          return JSON.stringify(typed.value, null, 2);
      }
    }
    return JSON.stringify(output, null, 2);
  }

  return String(output);
}

function extractAssistantSummary(message: UIMessage): string {
  const rawContent = (message as { content?: unknown }).content;

  if (typeof rawContent === "string" && rawContent.trim().length > 0) {
    return rawContent;
  }

  if (Array.isArray(rawContent)) {
    return rawContent
      .map((entry: unknown) =>
        typeof entry === "string" ? entry : JSON.stringify(entry, null, 2)
      )
      .join("\n\n");
  }

  if (!message.parts || message.parts.length === 0) {
    return "";
  }

  const segments = message.parts
    .map((part) => {
      const anyPart = part as Record<string, unknown> & { type?: string };

      if (typeof anyPart.type === "string") {
        switch (anyPart.type) {
          case "text":
          case "reasoning":
            return typeof anyPart.text === "string" ? anyPart.text : "";
          case "tool-call":
            return typeof anyPart.toolName === "string"
              ? `Calling ${anyPart.toolName}...`
              : "";
          case "tool-result":
            return formatToolSummary(anyPart.output);
          default:
            break;
        }
      }

      if (typeof anyPart.text === "string") {
        return anyPart.text;
      }

      if (typeof anyPart.output === "string") {
        return anyPart.output;
      }

      return "";
    })
    .filter((segment) => segment.length > 0);

  return segments.join("\n\n");
}
