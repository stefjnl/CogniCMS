"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SmartSuggestions } from "./SmartSuggestions";

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  showSuggestions?: boolean;
}

export function MessageInput({
  onSend,
  disabled,
  showSuggestions = true,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    try {
      await onSend(value.trim());
      setValue("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd+Enter or Ctrl+Enter to submit
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (value.trim() && !disabled && !submitting) {
        handleSubmit(event as unknown as FormEvent<HTMLFormElement>);
      }
    }
  }

  function handleSuggestionSelect(prompt: string) {
    setValue(prompt);
  }

  return (
    <div className="space-y-3">
      {showSuggestions && value === "" && (
        <SmartSuggestions
          onSelect={handleSuggestionSelect}
          disabled={disabled}
        />
      )}
      <div className="space-y-2">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-100 placeholder:text-gray-400"
            placeholder="Describe the update you need..."
            value={value}
            rows={1}
            disabled={disabled || submitting}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setValue(event.target.value)
            }
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            disabled={disabled || submitting || !value.trim()}
            className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
        <p className="text-xs text-gray-400 text-right">⌘+Enter to send</p>
      </div>
    </div>
  );
}
