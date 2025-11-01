"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { SiteConfig } from "@/types/site";
import { WebsiteContent, PreviewChange } from "@/types/content";
import { MessageList } from "@/components/editor/MessageList";
import { MessageInput } from "@/components/editor/MessageInput";
import { PreviewPanel } from "@/components/editor/PreviewPanel";
import { ContentOverview } from "@/components/editor/ContentOverview";
import { SiteHeader } from "@/components/editor/SiteHeader";
import { ApprovalButtons } from "@/components/editor/ApprovalButtons";
import { PublishingStatus } from "@/components/editor/PublishingStatus";
import { SitePreview } from "@/components/editor/SitePreview";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusBar } from "@/components/ui/StatusBar";
import { diffWebsiteContent } from "@/lib/content/differ";
import { buildCommitMessage } from "@/lib/utils/commit";
import { useEditorShortcuts } from "@/lib/utils/keyboard";

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
  const [previewHTML, setPreviewHTML] = useState<string>(initialHTML);
  const [previewChanges, setPreviewChanges] = useState<PreviewChange[]>([]);
  const [commitMessage, setCommitMessage] = useState(
    "[CogniCMS] Content update"
  );
  const [publishState, setPublishState] = useState<
    "idle" | "pending" | "publishing" | "published" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
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

  // Update preview HTML when changes occur
  useEffect(() => {
    const updatePreview = async () => {
      console.log("[CHAT_INTERFACE] Preview update useEffect triggered");
      console.log(
        "[CHAT_INTERFACE] previewChanges.length:",
        previewChanges.length
      );
      console.log(
        "[CHAT_INTERFACE] currentHTML length:",
        currentHTML?.length || 0
      );
      console.log(
        "[CHAT_INTERFACE] previewChanges:",
        JSON.stringify(previewChanges, null, 2)
      );

      if (previewChanges.length > 0) {
        try {
          console.log("[CHAT_INTERFACE] Calling preview API...");
          const response = await fetch(`/api/preview/${site.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentHTML: currentHTML, // Always use the base HTML from GitHub
              changes: previewChanges,
              sections: draftContent?.sections || [],
            }),
          });

          console.log(
            "[CHAT_INTERFACE] Preview API response status:",
            response.status
          );

          if (response.ok) {
            const { html } = await response.json();
            console.log(
              "[CHAT_INTERFACE] Preview API returned HTML length:",
              html?.length || 0
            );
            console.log(
              "[CHAT_INTERFACE] Preview HTML preview:",
              html?.substring(0, 200) + "..."
            );
            
            // DEBUG LOGGING: Track when previewHTML is being set
            console.log("[CHAT_INTERFACE] About to setPreviewHTML with length:", html?.length || 0);
            console.log("[CHAT_INTERFACE] Current previewHTML length before update:", previewHTML?.length || 0);
            setPreviewHTML(html);
            console.log("[CHAT_INTERFACE] setPreviewHTML called (async update)");
          } else {
            console.error(
              "[CHAT_INTERFACE] Failed to generate preview, status:",
              response.status
            );
            setPreviewHTML(currentHTML);
          }
        } catch (error) {
          console.error("[CHAT_INTERFACE] Preview update failed:", error);
          setPreviewHTML(currentHTML);
        }
      } else {
        console.log(
          "[CHAT_INTERFACE] No changes to preview, using currentHTML"
        );
        setPreviewHTML(currentHTML);
      }
    };

    // Add a small delay to ensure all state updates are processed
    const timeoutId = setTimeout(updatePreview, 100);
    return () => clearTimeout(timeoutId);
  }, [currentHTML, previewChanges, site.id, draftContent]);

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
      setPreviewChanges(changes);
      const nextCommit = buildCommitMessage(changes);
      setCommitMessage(nextCommit);
      if (payloadExplanation) {
        setStatusMessage(payloadExplanation);
      }
      if (changes.length > 0) {
        setPublishState("pending");
      }
    },
    [diffAgainstBaseline, site.id]
  );

  const handleSend = useCallback(
    async (message: string) => {
      try {
        setClientError(null);
        setStatusMessage(null);
        setPublishState("idle");
        clearError?.();
        await sendMessage(
          { text: message },
          {
            headers: {
              "X-Trace-Id": crypto.randomUUID(),
            },
          }
        );
      } catch (err) {
        setClientError((err as Error).message);
      }
    },
    [clearError, sendMessage]
  );

  const handleReset = useCallback(async () => {
    setDraftContent(baselineRef.current);
    setPreviewChanges([]);
    setCommitMessage("[CogniCMS] Content update");
    setPublishState("idle");
    await fetch(`/api/content/${site.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baselineRef.current),
    });
  }, [site.id]);

  const handlePublish = useCallback(async () => {
    if (!draftContent) return;
    setPublishState("publishing");
    setClientError(null);
    setStatusMessage(null);

    // DEBUG LOGGING: Track HTML lengths at publish time
    console.log("[HANDLE_PUBLISH] Starting publish process");
    console.log("[HANDLE_PUBLISH] currentHTML length:", currentHTML?.length || 0);
    console.log("[HANDLE_PUBLISH] previewHTML length:", previewHTML?.length || 0);
    console.log("[HANDLE_PUBLISH] previewChanges count:", previewChanges?.length || 0);
    console.log("[HANDLE_PUBLISH] Are currentHTML and previewHTML different?", currentHTML !== previewHTML);
    
    // Create a unique identifier for this publish operation
    const publishId = crypto.randomUUID();
    console.log("[HANDLE_PUBLISH] Publish ID:", publishId);
    
    // ALWAYS generate a fresh preview to ensure we have the latest HTML
    // This fixes the race condition where previewHTML might not be updated
    let htmlToPublish = previewHTML;
    console.log("[HANDLE_PUBLISH] Initial HTML length:", htmlToPublish?.length || 0);
    
    if (previewChanges.length > 0) {
      console.log("[HANDLE_PUBLISH] Generating fresh preview to ensure latest HTML...");
      try {
        const previewResponse = await fetch(`/api/preview/${site.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentHTML: currentHTML,
            changes: previewChanges,
            sections: draftContent?.sections || [],
            publishId: publishId, // Add publishId to track in logs
          }),
        });
        
        if (previewResponse.ok) {
          const { html } = await previewResponse.json();
          htmlToPublish = html;
          console.log("[HANDLE_PUBLISH] Generated fresh preview HTML, length:", html?.length || 0);
          console.log("[HANDLE_PUBLISH] Fresh HTML checksum:", html?.length.toString() + '_' + html?.substring(0, 50).replace(/\s/g, ''));
          
          // CRITICAL: Update the state BEFORE sending publish request
          setPreviewHTML(html);
          
          // Add a small delay to ensure state update is processed
          await new Promise(resolve => setTimeout(resolve, 100));
          
          console.log("[HANDLE_PUBLISH] State updated, proceeding with publish");
        } else {
          console.error("[HANDLE_PUBLISH] Failed to generate fresh preview, using existing");
          console.log("[HANDLE_PUBLISH] Preview API response status:", previewResponse.status);
        }
      } catch (error) {
        console.error("[HANDLE_PUBLISH] Error generating fresh preview:", error);
      }
    } else {
      console.log("[HANDLE_PUBLISH] No changes to preview, using current previewHTML");
    }
    
    console.log("[HANDLE_PUBLISH] Final HTML being sent to publish API length:", htmlToPublish?.length || 0);
    console.log("[HANDLE_PUBLISH] Final HTML checksum:", htmlToPublish?.length.toString() + '_' + htmlToPublish?.substring(0, 50).replace(/\s/g, ''));

    try {
      const response = await fetch(`/api/publish/${site.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draftContent,
          html: htmlToPublish, // Use the ensured-up-to-date HTML
          commitMessage,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to publish changes");
      }

      // After successful publish, update baseline and keep the published HTML
      // Don't refetch from GitHub immediately as it may serve cached/old version
      setCurrentHTML(htmlToPublish);
      baselineRef.current = draftContent;
      setPreviewChanges([]);
      setPublishState("published");
      setStatusMessage(payload.message ?? "Changes published successfully.");

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setPublishState("idle");
        setStatusMessage(null);
      }, 5000);
    } catch (err) {
      setClientError((err as Error).message);
      setPublishState("error");
    }
  }, [commitMessage, currentHTML, draftContent, site.id, previewHTML]);

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
      console.log("[HANDLE_SAVE_EDIT] Manual edit save started");
      console.log("[HANDLE_SAVE_EDIT] sectionId:", sectionId);
      console.log("[HANDLE_SAVE_EDIT] field:", field);
      console.log("[HANDLE_SAVE_EDIT] newValue:", newValue);
      console.log("[HANDLE_SAVE_EDIT] draftContent exists:", !!draftContent);

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

        if (hasAIChangeForField) {
          // Show toast notification about replacement
          setStatusMessage(
            `Replaced AI suggestion for "${field}" with your edit`
          );
          setTimeout(() => setStatusMessage(null), 3000);
        }

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
        console.log("[HANDLE_SAVE_EDIT] Updating draftContent state");
        setDraftContent(updatedContent);

        // Generate diff with source tracking
        console.log("[HANDLE_SAVE_EDIT] Generating diff against baseline");
        const changes = diffAgainstBaseline(updatedContent);
        console.log(
          "[HANDLE_SAVE_EDIT] Generated changes:",
          JSON.stringify(changes, null, 2)
        );

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

        console.log(
          "[HANDLE_SAVE_EDIT] Updated changes with source tracking:",
          JSON.stringify(updatedChanges, null, 2)
        );
        setPreviewChanges(updatedChanges);

        // Update commit message
        const nextCommit = buildCommitMessage(updatedChanges);
        setCommitMessage(nextCommit);

        // Set to pending if we have changes
        if (updatedChanges.length > 0) {
          setPublishState("pending");
        }

        // Close the editor
        setEditingField(null);

        // Show success message
        setStatusMessage("Change saved to draft");
        setTimeout(() => setStatusMessage(null), 2000);

        // CRITICAL: Force immediate preview update for manual edits
        console.log(
          "[HANDLE_SAVE_EDIT] Manual edit completed, forcing preview update"
        );
        console.log(
          "[HANDLE_SAVE_EDIT] Current previewChanges count:",
          updatedChanges.length
        );
        console.log(
          "[HANDLE_SAVE_EDIT] Current previewChanges:",
          JSON.stringify(updatedChanges, null, 2)
        );
        console.log(
          "[HANDLE_SAVE_EDIT] Current currentHTML length:",
          currentHTML?.length || 0
        );
        console.log(
          "[HANDLE_SAVE_EDIT] Current previewHTML length:",
          previewHTML?.length || 0
        );

        // Force immediate preview update
        if (updatedChanges.length > 0) {
          console.log(
            "[HANDLE_SAVE_EDIT] Triggering immediate preview update..."
          );
          setTimeout(async () => {
            try {
              const response = await fetch(`/api/preview/${site.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  currentHTML,
                  changes: updatedChanges,
                  sections: updatedContent?.sections || [],
                }),
              });

              if (response.ok) {
                const { html } = await response.json();
                console.log(
                  "[HANDLE_SAVE_EDIT] Immediate preview update successful, HTML length:",
                  html?.length || 0
                );
                setPreviewHTML(html);
              } else {
                console.error(
                  "[HANDLE_SAVE_EDIT] Immediate preview update failed, status:",
                  response.status
                );
              }
            } catch (error) {
              console.error(
                "[HANDLE_SAVE_EDIT] Immediate preview update error:",
                error
              );
            }
          }, 200); // Small delay to ensure state is updated
        }
      } catch (err) {
        setClientError((err as Error).message);
      }
    },
    [
      draftContent,
      diffAgainstBaseline,
      previewChanges,
      site.id,
      currentHTML,
      previewHTML,
    ]
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
          setPublishState("idle");
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
    if (assistantMessages.length === 0) {
      return;
    }

    const latestAssistant = assistantMessages[assistantMessages.length - 1];
    if (!latestAssistant || latestAssistant.id === lastAppliedAssistantId) {
      return;
    }

    const explanationSource = extractAssistantSummary(latestAssistant).trim();
    if (!explanationSource) {
      return;
    }

    const plan = parseJsonPlan(explanationSource);
    const explanation = plan?.explanation ?? explanationSource;

    refreshDraft(explanation)
      .then(() => {
        setLastAppliedAssistantId(latestAssistant.id);
      })
      .catch((err) => {
        setClientError((err as Error).message);
      });
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
        <SiteHeader site={site} lastSynced={lastModified} />
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
