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
import {
  PageDefinition,
  SiteConfigWithPageDefinition,
} from "@/types/content-schema";
import {
  siteDefinitionConfig,
  ZincafeLandingPageDefinition,
} from "@/lib/config/site-definitions";
import { getPageDefinitionForSiteConfig } from "@/lib/config/page-definition-resolver";
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
  const [activeTab, setActiveTab] = useState<"metadata" | "sections" | "chat">("sections");
  const baselineRef = useRef<WebsiteContent>(initialContent);
  const pendingRefreshRef = useRef(false);

  // Resolve active PageDefinition for this site/html using the config-only resolver.
  const pageDefinition: PageDefinition | null = useMemo(() => {
    const enrichedSite: SiteConfigWithPageDefinition = {
      ...(site as SiteConfigWithPageDefinition),
      // Allow explicit mapping for the bundled Zincafe example without mutating stored config.
      pageDefinitionId:
        (site as SiteConfigWithPageDefinition).pageDefinitionId ??
        (site.htmlFile === ZincafeLandingPageDefinition.htmlPath
          ? ZincafeLandingPageDefinition.id
          : undefined),
    };
    return getPageDefinitionForSiteConfig(
      site.htmlFile,
      enrichedSite,
      siteDefinitionConfig
    );
  }, [site]);
  
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
      console.log("[DEBUG onSuccess] Updating baseline to:", draftContent);
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
    console.log(
      "[DEBUG Preview Effect] previewChanges updated:",
      previewChanges
    );
    console.log("[DEBUG Preview Effect] Calling updatePreview...");
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

      // Debug logging
      console.log("[DEBUG refreshDraft] Baseline:", baselineRef.current);
      console.log("[DEBUG refreshDraft] NextContent:", nextContent);
      console.log("[DEBUG refreshDraft] Raw changes:", changes);

      // Filter out automatic metadata.lastModified changes (always updated by applyToolActions)
      const meaningfulChanges = changes.filter(
        (change) =>
          !(change.sectionId === "metadata" && change.field === "lastModified")
      );

      console.log(
        "[DEBUG refreshDraft] Meaningful changes after filter:",
        meaningfulChanges
      );

      // Attribute changes to AI source (fixes AI editing preview issue)
      const attributedChanges = meaningfulChanges.map((change) => ({
        ...change,
        source: "ai" as const,
        timestamp: new Date().toISOString(),
      }));

      console.log(
        "[DEBUG refreshDraft] Attributed changes:",
        attributedChanges
      );

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
      console.log(
        "[RESCAN] Content updated, sections count:",
        content.sections.length
      );

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

        // Filter out metadata.lastModified changes
        const meaningfulChanges = changes.filter(
          (change) =>
            !(
              change.sectionId === "metadata" && change.field === "lastModified"
            )
        );

        // Preserve source attribution from existing changes where possible
        const attributedChanges = meaningfulChanges.map((change) => {
          const existing = previewChanges.find(
            (c) => c.sectionId === change.sectionId && c.field === change.field
          );
          return {
            ...change,
            source: existing?.source || ("ai" as const),
            timestamp: existing?.timestamp || new Date().toISOString(),
          };
        });

        setPreviewChanges(attributedChanges);

        // Update commit message
        const nextCommit = buildCommitMessage(attributedChanges);
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

  const cardBase =
    "rounded-xl border bg-white/60 backdrop-blur-sm shadow-sm p-4";
  const labelBase = "text-xs font-medium text-slate-600";

  const pendingCount = previewChanges.length;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Left sidebar */}
      <aside className="w-[380px] xl:w-[420px] bg-slate-50/80 border-r border-slate-200/80 backdrop-blur-md">
        <div className="h-screen sticky top-0 flex flex-col">
          {/* Header + status */}
          <div className="px-4 pt-4 pb-2 border-b border-slate-200/70 bg-white/70 backdrop-blur-sm">
            <SiteHeader
              site={site}
              lastSynced={lastModified}
              onRescan={handleRescan}
            />
            <div className="mt-3">
              <StatusBar
                gitHubConnected={true}
                aiModel="z-ai/glm-4.6"
                unpublishedChanges={pendingCount}
              />
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-slate-200/70 bg-white/40">
            <button
              onClick={() => setActiveTab("metadata")}
              className={`flex-1 px-3 py-2.5 text-[11px] font-medium transition-colors ${
                activeTab === "metadata"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-white/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span>📋</span>
                <span>Metadata</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("sections")}
              className={`flex-1 px-3 py-2.5 text-[11px] font-medium transition-colors ${
                activeTab === "sections"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-white/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span>📄</span>
                <span>Sections</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 px-3 py-2.5 text-[11px] font-medium transition-colors ${
                activeTab === "chat"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-white/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span>🤖</span>
                <span>AI Chat</span>
              </div>
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3">
            {activeTab === "metadata" && (
              <ContentOverview
                content={draftContent}
                pendingChanges={previewChanges}
                pageDefinition={pageDefinition || undefined}
                onStartEdit={handleStartEdit}
                editingField={editingField}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                showOnlyMetadata={true}
              />
            )}

            {activeTab === "sections" && (
              <ContentOverview
                content={draftContent}
                pendingChanges={previewChanges}
                pageDefinition={pageDefinition || undefined}
                onStartEdit={handleStartEdit}
                editingField={editingField}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                showOnlySections={true}
              />
            )}

            {activeTab === "chat" && (
              <div className="space-y-3">
                {/* AI conversation */}
                <div className={`${cardBase} space-y-2`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                      AI conversation
                    </div>
                    <span className="text-[9px] text-slate-400">
                      Site-aware, schema-driven
                    </span>
                  </div>
                  <div className="min-h-[300px] max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
                    <MessageList
                      messages={visibleMessages}
                      changes={previewChanges}
                      lastAssistantMessageId={lastAppliedAssistantId}
                    />
                  </div>
                  <div className="mt-1">
                    <div className="rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                      <MessageInput
                        onSend={handleSend}
                        disabled={isChatStreaming || publishState === "publishing"}
                      />
                    </div>
                  </div>
                  {showSpinner && (
                    <div className="flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50/90 p-2.5">
                      <LoadingSpinner />
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold text-indigo-900">
                          AI is working...
                        </p>
                        {aiThinking && (
                          <p className="text-[10px] text-indigo-700">
                            {aiThinking}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {clientError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-2.5">
                      <p className="text-[10px] text-red-700">{clientError}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom pinned actions */}
          <div className="border-t border-slate-200/80 bg-slate-50/95 px-4 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[9px] text-slate-500">
              <span>
                {pendingCount > 0
                  ? `${pendingCount} pending change${
                      pendingCount === 1 ? "" : "s"
                    }`
                  : "No pending changes"}
              </span>
              <PublishingStatus
                state={publishState}
                changeCount={pendingCount}
                message={statusMessage || undefined}
                onPublish={handlePublish}
                onViewLive={() =>
                  window.open(
                    `https://${site.githubOwner}.github.io/${site.githubRepo}/`,
                    "_blank"
                  )
                }
              />
            </div>
            <div className="flex items-center gap-1.5">
              {/* Reuse existing ApprovalButtons behavior; styling primarily handled by surrounding layout */}
              <ApprovalButtons
                onPublish={handlePublish}
                onReset={handleReset}
                disabled={disablePublish}
                changeCount={pendingCount}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Right side preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
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
