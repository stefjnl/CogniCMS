import React from "react";
import type { UIMessage } from "ai";

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

export function MessageList({ messages }: { messages: UIMessage[] }) {
  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const content = extractMessageContent(message);
        const role = message.role === "user" ? "user" : "assistant";

        if (!content && role === "assistant") {
          return null;
        }

        return (
          <div
            key={message.id}
            className={`flex ${
              role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xl rounded-lg px-4 py-3 text-sm shadow-sm ${
                role === "user"
                  ? "bg-brand-600 text-white"
                  : "bg-white text-slate-900"
              }`}
            >
              <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                {content}
              </pre>
            </div>
          </div>
        );
      })}
    </div>
  );
}
