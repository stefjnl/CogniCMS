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

  // Fetch the current HTML file first
  const htmlFile = await getFileContent(site, site.htmlFile);
  const currentHTML = htmlFile.content;
  
  // Extract content from the actual HTML file
  const { extractContentFromHtml } = await import("@/lib/content/extractor");
  const content = extractContentFromHtml(currentHTML);
  
  // Try to load existing content.json to preserve any edits, but use extracted content as primary
  try {
    const contentFile = await getFileContent(site, site.contentFile);
    
    // Only use the existing content if it has more recent modifications
    const existingContent = JSON.parse(contentFile.content) as WebsiteContent;
    if (existingContent.metadata && existingContent.metadata.lastModified) {
      const existingDate = new Date(existingContent.metadata.lastModified);
      const extractedDate = new Date(content.metadata.lastModified);
      
      // Use existing content only if it's more recent (has been edited)
      if (existingDate > extractedDate) {
        // But still ensure the structure matches what we expect
        content.metadata = { ...content.metadata, ...existingContent.metadata };
      }
    }
  } catch (error) {
    // No existing content.json found or error loading it, using extracted content
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
