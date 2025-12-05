import { ChatInterface } from "@/components/editor/ChatInterface";
import { config } from "@/lib/config";
import { getFileContent } from "@/lib/github/operations";
import { getSiteConfig } from "@/lib/storage/sites";
import { getSession } from "@/lib/utils/auth";
import { notFound, redirect } from "next/navigation";

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

  // Fetch the current HTML file (source of truth)
  const htmlFile = await getFileContent(site, site.htmlFile);
  const currentHTML = htmlFile.content;

  // Extract content from HTML (HTML is the single source of truth)
  // content.json is maintained via publishing, but we always work from HTML
  const { extractContentFromHtml } = await import("@/lib/content/extractor");
  const content = extractContentFromHtml(currentHTML, {
    htmlFilePath: site.htmlFile,
    siteConfig: site,
  });
  console.log("[EDITOR_PAGE] Content extracted from HTML (source of truth)");

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <ChatInterface
        site={site}
        initialContent={content}
        initialHTML={currentHTML}
        lastModified={site.lastModified}
        aiModel={config.ai?.nanoGpt?.model ?? process.env.NANOGPT_MODEL}
      />
    </div>
  );
}
