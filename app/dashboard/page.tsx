import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getSession } from "@/lib/utils/auth";
import { listSites } from "@/lib/storage/sites";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const sites = await listSites();

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">
            Manage connected static websites.
          </p>
        </div>
      </header>
      <DashboardClient initialSites={sites} />
    </div>
  );
}
