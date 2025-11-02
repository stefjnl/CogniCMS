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

  // Fetch the current HTML file for preview
  const htmlFile = await getFileContent(site, site.htmlFile);
  const currentHTML = htmlFile.content;

  // Load content from content.json (the source of truth for editing)
  let content: WebsiteContent;
  try {
    const contentFile = await getFileContent(site, site.contentFile);
    content = JSON.parse(contentFile.content) as WebsiteContent;
    console.log("[EDITOR_PAGE] Loaded content from content.json");
  } catch (error) {
    // Fallback: extract from HTML if content.json doesn't exist
    console.log("[EDITOR_PAGE] content.json not found, extracting from HTML");
    const { extractContentFromHtml } = await import("@/lib/content/extractor");
    content = extractContentFromHtml(currentHTML);
  }

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
