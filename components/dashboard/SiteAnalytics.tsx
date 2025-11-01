"use client";

import { SiteSummary } from "@/types/site";
import { Card } from "@/components/ui/Card";

interface SiteAnalyticsProps {
  sites: SiteSummary[];
}

export function SiteAnalytics({ sites }: SiteAnalyticsProps) {
  const totalSites = sites.length;
  const activeSites = sites.length; // All connected sites are active

  // Calculate most recently edited
  const sortedByDate = [...sites].sort(
    (a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );
  const recentlyEdited = sortedByDate.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Sites</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {totalSites}
              </p>
            </div>
            <div className="rounded-full bg-brand-100 p-3 text-2xl">🌐</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Sites</p>
              <p className="mt-2 text-3xl font-bold text-success-600">
                {activeSites}
              </p>
            </div>
            <div className="rounded-full bg-success-100 p-3 text-2xl">✅</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">AI Powered</p>
              <p className="mt-2 text-3xl font-bold text-ai-accent-600">100%</p>
            </div>
            <div className="rounded-full bg-ai-accent-100 p-3 text-2xl">🤖</div>
          </div>
        </Card>
      </div>

      {/* Recently Edited */}
      {recentlyEdited.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Recently Edited
          </h3>
          <div className="space-y-3">
            {recentlyEdited.map((site, index) => (
              <div
                key={site.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{site.name}</p>
                    <p className="text-xs text-slate-500">
                      {site.githubOwner}/{site.githubRepo}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Last updated</p>
                  <p className="text-sm font-medium text-slate-700">
                    {new Date(site.lastModified).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Activity Timeline Placeholder */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Activity Timeline
        </h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-success-500"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">
                Sites connected successfully
              </p>
              <p className="text-xs text-slate-500">
                {totalSites} {totalSites === 1 ? "site" : "sites"} ready for
                AI-powered editing
              </p>
            </div>
          </div>
          {sites.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-brand-500"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">
                  GitHub integration active
                </p>
                <p className="text-xs text-slate-500">
                  All repositories synced and ready to publish
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
