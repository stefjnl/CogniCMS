import Link from "next/link";
import { SiteSummary } from "@/types/site";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

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

      {sites.length === 0 ? (
        <EmptyState
          icon={<span className="text-6xl">🚀</span>}
          title="Let's Create Your First AI-Powered Site"
          description="Connect your GitHub Pages repository and start editing with natural language in minutes."
          action={
            <Button variant="primary" size="lg" onClick={onAddSite}>
              Connect GitHub Repository
            </Button>
          }
        >
          <div className="mb-6 space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                1
              </div>
              <div>
                <h4 className="font-medium text-slate-900">
                  Connect Repository
                </h4>
                <p className="text-xs text-slate-600">
                  Link your GitHub Pages repo with a personal access token
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                2
              </div>
              <div>
                <h4 className="font-medium text-slate-900">
                  Chat with Your Content
                </h4>
                <p className="text-xs text-slate-600">
                  Describe changes in plain English—AI handles the editing
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                3
              </div>
              <div>
                <h4 className="font-medium text-slate-900">
                  Preview & Publish
                </h4>
                <p className="text-xs text-slate-600">
                  Review changes and publish to GitHub with one click
                </p>
              </div>
            </div>
          </div>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => (
            <div
              key={site.id}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
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
        </div>
      )}
    </div>
  );
}
