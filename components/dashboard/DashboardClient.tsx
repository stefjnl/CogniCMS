"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteSummary } from "@/types/site";
import { SiteList } from "@/components/dashboard/SiteList";
import { SiteAnalytics } from "@/components/dashboard/SiteAnalytics";
import { AddSiteModal } from "@/components/dashboard/AddSiteModal";

interface DashboardClientProps {
  initialSites: SiteSummary[];
}

export function DashboardClient({ initialSites }: DashboardClientProps) {
  const router = useRouter();
  const [sites, setSites] = useState(initialSites);
  const [addOpen, setAddOpen] = useState(false);

  async function refreshSites() {
    const response = await fetch("/api/sites");
    if (!response.ok) {
      return;
    }
    const body = await response.json();
    setSites(body.sites);
  }

  return (
    <>
      {sites.length > 0 && (
        <div className="mb-8">
          <SiteAnalytics sites={sites} />
        </div>
      )}
      <SiteList
        sites={sites}
        onAddSite={() => {
          setAddOpen(true);
        }}
      />
      <AddSiteModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={async () => {
          setAddOpen(false);
          await refreshSites();
          router.refresh();
        }}
      />
    </>
  );
}
