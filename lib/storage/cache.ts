import { WebsiteContent } from "@/types/content";

const contentCache = new Map<string, WebsiteContent>();

export function setDraftContent(siteId: string, content: WebsiteContent) {
  contentCache.set(siteId, content);
}

export function getDraftContent(siteId: string): WebsiteContent | undefined {
  return contentCache.get(siteId);
}

export function clearDraftContent(siteId: string) {
  contentCache.delete(siteId);
}
