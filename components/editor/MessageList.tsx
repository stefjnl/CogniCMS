import React from "react";
import type { UIMessage } from "ai";
import { PreviewChange } from "@/types/content";
import { ChangeCard } from "./ChangeCard";

function formatToolOutput(output: unknown): string {
  if (!output) return "";

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

function extractMessageContent(message: UIMessage): string {
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
            return formatToolOutput(anyPart.output);
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

interface MessageListProps {
  messages: UIMessage[];
  changes?: PreviewChange[];
  lastAssistantMessageId?: string | null;
}

export function MessageList({
  messages,
  changes = [],
  lastAssistantMessageId,
}: MessageListProps) {
  // Empty state when no messages
  if (messages.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <div className="text-4xl">👋</div>
          <h3 className="text-lg font-semibold text-slate-900">
            Welcome to CogniCMS
          </h3>
          <p className="text-sm text-slate-600">Try asking:</p>
          <ul className="space-y-2 text-left text-sm text-slate-700">
            <li className="rounded bg-slate-50 px-4 py-2">
              • "Change the meeting date to December 10, 2025"
            </li>
            <li className="rounded bg-slate-50 px-4 py-2">
              • "Update the email address"
            </li>
            <li className="rounded bg-slate-50 px-4 py-2">
              • "Add a new FAQ item"
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            I can edit any text on your site!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const content = extractMessageContent(message);
        const role = message.role === "user" ? "user" : "assistant";

        if (!content && role === "assistant") {
          return null;
        }

        const isLastAssistant =
          role === "assistant" && message.id === lastAssistantMessageId;
        const showChanges = isLastAssistant && changes.length > 0;

        return (
          <div key={message.id} className="space-y-3">
            <div
              className={`flex ${
                role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-2xl px-4 py-3 shadow-sm ${
                  role === "user"
                    ? "bg-blue-700 text-white max-w-[80%] ml-auto"
                    : "bg-gray-50 text-gray-800 max-w-[90%] mr-auto border border-gray-200"
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {content}
                </div>
              </div>
            </div>

            {showChanges && (
              <div className="ml-8 space-y-2">
                {changes.map((change, idx) => (
                  <ChangeCard
                    key={`${change.sectionId}-${change.field}-${idx}`}
                    change={change}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
