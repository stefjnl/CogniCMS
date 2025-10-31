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

  // Fetch the current HTML file
  const htmlFile = await getFileContent(site, site.htmlFile);
  const currentHTML = htmlFile.content;

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <ChatInterface
        site={site}
        initialContent={content}
        initialHTML={currentHTML}
        lastModified={site.lastModified}
      />
    </div>
  );
}
