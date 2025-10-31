"use client";

import { ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ApprovalButtonsProps {
  commitMessage: string;
  onCommitMessageChange: (value: string) => void;
  onPublish: () => Promise<void>;
  onReset: () => void;
  disabled?: boolean;
}

export function ApprovalButtons({
  commitMessage,
  onCommitMessageChange,
  onPublish,
  onReset,
  disabled,
}: ApprovalButtonsProps) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="commit-message"
        >
          Commit message
        </label>
        <Input
          id="commit-message"
          value={commitMessage}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onCommitMessageChange(event.target.value)
          }
          placeholder="[CogniCMS] Update content"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onPublish} disabled={disabled}>
          Approve &amp; Publish
        </Button>
        <Button variant="secondary" onClick={onReset} disabled={disabled}>
          Reset Draft
        </Button>
      </div>
    </div>
  );
}
