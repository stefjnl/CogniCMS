import { notFound, redirect } from "next/navigation";
import { ChatInterface } from "@/components/editor/ChatInterface";
import { getSession } from "@/lib/utils/auth";
import { getSiteConfig } from "@/lib/storage/sites";
import { getFileContent } from "@/lib/github/operations";
import { WebsiteContent } from "@/types/content";

interface EditorPageProps {
  params: Promise<{
    siteId: string;
  }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { siteId } = await params;

  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const site = await getSiteConfig(siteId);
  if (!site) {
    notFound();
  }

  const contentFile = await getFileContent(site, site.contentFile);
  const content = JSON.parse(contentFile.content) as WebsiteContent;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ChatInterface
          site={site}
          initialContent={content}
          lastModified={site.lastModified}
        />
      </div>
    </div>
  );
}
