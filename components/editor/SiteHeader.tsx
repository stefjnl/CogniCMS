import Link from "next/link";
import { SiteConfig } from "@/types/site";

interface SiteHeaderProps {
  site: SiteConfig;
  lastSynced: string;
}

export function SiteHeader({ site, lastSynced }: SiteHeaderProps) {
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
