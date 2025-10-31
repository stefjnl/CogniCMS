"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
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

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        className="min-h-[80px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        placeholder="Describe the update you need..."
        value={value}
        disabled={disabled || submitting}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          setValue(event.target.value)
        }
      />
      <Button
        type="submit"
        disabled={disabled || submitting || !value.trim()}
        className="self-end"
      >
        Send
      </Button>
    </form>
  );
}
