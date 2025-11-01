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
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          className="min-h-[80px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          placeholder="Describe the update you need... (⌘+Enter to send)"
          value={value}
          disabled={disabled || submitting}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            setValue(event.target.value)
          }
          onKeyDown={handleKeyDown}
        />
        <Button
          type="submit"
          disabled={disabled || submitting || !value.trim()}
          className="self-end"
        >
          Send
        </Button>
      </form>
    </div>
  );
}
