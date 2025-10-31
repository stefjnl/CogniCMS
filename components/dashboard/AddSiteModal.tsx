"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { Modal } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Label } from "@/components/ui/Label";

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
      onOpenChange={onClose}
      title="Add Website"
      description="Connect a GitHub repository to manage your static site."
      size="lg"
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="site-name">Site Name</Label>
            <Input
              id="site-name"
              placeholder="My Website"
              value={form.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("name", event.target.value)
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-owner">GitHub Owner</Label>
            <Input
              id="site-owner"
              placeholder="username or organization"
              value={form.githubOwner}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("githubOwner", event.target.value)
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-repo">Repository</Label>
            <Input
              id="site-repo"
              placeholder="repository-name"
              value={form.githubRepo}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("githubRepo", event.target.value)
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-branch">Branch</Label>
            <Input
              id="site-branch"
              placeholder="main"
              value={form.githubBranch}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("githubBranch", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content-file">Content File Path</Label>
            <Input
              id="content-file"
              placeholder="content.json"
              value={form.contentFile}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("contentFile", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="html-file">HTML File Path</Label>
            <Input
              id="html-file"
              placeholder="index.html"
              value={form.htmlFile}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("htmlFile", event.target.value)
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="token">GitHub Personal Access Token</Label>
          <Input
            id="token"
            type="password"
            placeholder="ghp_..."
            value={form.githubToken}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField("githubToken", event.target.value)
            }
            required
          />
          <p className="text-xs text-muted-foreground">
            Token requires <span className="font-semibold">repo</span> scope and
            is stored encrypted.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} loading={loading}>
            {loading ? "Creating..." : "Create Site"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
