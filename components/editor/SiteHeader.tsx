"use client";

import Link from "next/link";
import { SiteConfig } from "@/types/site";
import { useState } from "react";

interface SiteHeaderProps {
  site: SiteConfig;
  lastSynced: string;
  onRescan?: () => Promise<void>;
}

export function SiteHeader({ site, lastSynced, onRescan }: SiteHeaderProps) {
  const [isRescanning, setIsRescanning] = useState(false);

  const handleRescan = async () => {
    if (isRescanning || !onRescan) return;

    setIsRescanning(true);
    try {
      await onRescan();
    } finally {
      setIsRescanning(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{site.name}</h1>
        <p className="text-sm text-slate-600">
          {site.githubOwner}/{site.githubRepo} · Branch {site.githubBranch}
        </p>
        <p className="text-xs text-slate-500">
          Last synced {new Date(lastSynced).toLocaleString()}
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={handleRescan}
          disabled={isRescanning}
          className="rounded-md border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title="Re-scan HTML to refresh content structure"
        >
          <svg
            className={`w-4 h-4 ${isRescanning ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {isRescanning ? "Rescanning..." : "Re-scan HTML"}
        </button>
        <Link
          href={`https://${site.githubOwner}.github.io/${site.githubRepo}/`}
          className="rounded-md bg-brand-600 px-3 py-2 font-medium text-white shadow hover:bg-brand-700"
          target="_blank"
        >
          View Live Site
        </Link>
        <Link
          href={`https://github.com/${site.githubOwner}/${site.githubRepo}`}
          className="rounded-md border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
          target="_blank"
        >
          View Repository
        </Link>
      </div>
    </div>
  );
}
