"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface AddSiteModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddSiteModal({ open, onClose, onCreated }: AddSiteModalProps) {
  type FormState = {
    name: string;
    githubOwner: string;
    githubRepo: string;
    githubToken: string;
    githubBranch: string;
    contentFile: string;
    htmlFile: string;
  };

  const [form, setForm] = useState<FormState>({
    name: "",
    githubOwner: "",
    githubRepo: "",
    githubToken: "",
    githubBranch: "main",
    contentFile: "content.json",
    htmlFile: "index.html",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(field: keyof FormState, value: string) {
    setForm((prev: FormState) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Failed to add site");
      setLoading(false);
      return;
    }

    onCreated();
    setLoading(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Website"
      description="Connect a GitHub Pages repository."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="site-name"
            >
              Site name
            </label>
            <Input
              id="site-name"
              value={form.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("name", event.target.value)
              }
              required
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="site-owner"
            >
              GitHub owner
            </label>
            <Input
              id="site-owner"
              value={form.githubOwner}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("githubOwner", event.target.value)
              }
              required
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="site-repo"
            >
              Repository
            </label>
            <Input
              id="site-repo"
              value={form.githubRepo}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("githubRepo", event.target.value)
              }
              required
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="site-branch"
            >
              Branch
            </label>
            <Input
              id="site-branch"
              value={form.githubBranch}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("githubBranch", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="content-file"
            >
              Content file path
            </label>
            <Input
              id="content-file"
              value={form.contentFile}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("contentFile", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="html-file"
            >
              HTML file path
            </label>
            <Input
              id="html-file"
              value={form.htmlFile}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("htmlFile", event.target.value)
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="token">
            GitHub Personal Access Token
          </label>
          <Input
            id="token"
            type="password"
            value={form.githubToken}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField("githubToken", event.target.value)
            }
            placeholder="ghp_..."
            required
          />
          <p className="text-xs text-slate-500">
            Token requires <span className="font-semibold">repo</span> scope.
            Stored encrypted.
          </p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner />
                Saving...
              </span>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
