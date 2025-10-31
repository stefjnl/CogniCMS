import Link from "next/link";
import { SiteSummary } from "@/types/site";
import { Button } from "@/components/ui/Button";

interface SiteListProps {
  sites: SiteSummary[];
  onAddSite: () => void;
}

export function SiteList({ sites, onAddSite }: SiteListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Your Websites
          </h2>
          <p className="text-sm text-slate-600">
            Manage connected static sites.
          </p>
        </div>
        <Button variant="primary" onClick={onAddSite}>
          Add Website
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sites.map((site) => (
          <div
            key={site.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {site.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {site.githubOwner}/{site.githubRepo} · {site.githubBranch}
                </p>
              </div>
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
                Active
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Last updated {new Date(site.lastModified).toLocaleString()}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="primary" size="sm" asChild>
                <Link href={`/editor/${site.id}`}>Open Editor</Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link
                  href={`https://github.com/${site.githubOwner}/${site.githubRepo}`}
                  target="_blank"
                >
                  View Repo
                </Link>
              </Button>
            </div>
          </div>
        ))}
        {sites.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm text-slate-600">
              No websites connected yet. Click{" "}
              <span className="font-semibold">Add Website</span> to get started.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
