import { WebsiteContent } from "@/types/content";
import { buildTraceLogger } from "@/lib/utils/trace";

const contentCache = new Map<string, WebsiteContent>();

type DraftCacheOptions = {
  traceId?: string;
  source?: string;
};

export function setDraftContent(
  siteId: string,
  content: WebsiteContent,
  options: DraftCacheOptions = {}
) {
  const { traceId = "draft-cache", source = "unknown" } = options;
  const logger = buildTraceLogger("DraftCache", traceId);
  const sections = content?.sections as WebsiteContent["sections"] | undefined;
  const sectionCount = Array.isArray(sections)
    ? sections.length
    : sections
    ? Object.keys(sections as Record<string, unknown>).length
    : 0;

  logger("cache-write-start", {
    siteId,
    source,
    sectionCount,
    metadataTitle: content?.metadata?.title ?? null,
    hasMetadata: Boolean(content?.metadata),
  });

  contentCache.set(siteId, content);

  logger("cache-write-complete", {
    siteId,
    source,
    cacheSize: contentCache.size,
    sectionCount,
  });
}

export function getDraftContent(siteId: string): WebsiteContent | undefined {
  return contentCache.get(siteId);
}

export function clearDraftContent(siteId: string) {
  contentCache.delete(siteId);
}
