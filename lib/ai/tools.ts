import { z } from "zod";
import { diffWebsiteContent } from "@/lib/content/differ";
import { WebsiteContent } from "@/types/content";

const SUPPORTED_TOOL_NAMES = [
  "updateSectionText",
  "updateMetadata",
  "updateListItem",
  "addListItem",
  "removeListItem",
  "batchUpdate",
] as const;

const updateSectionTextSchema = z.object({
  sectionId: z.string(),
  field: z.string(),
  newValue: z.string(),
});

const updateMetadataSchema = z.object({
  field: z.enum(["title", "description", "lastModified"]),
  value: z.string(),
});

const updateListItemSchema = z.object({
  sectionId: z.string(),
  itemIndex: z.number().int().nonnegative(),
  updates: z.record(z.any()),
});

const addListItemSchema = z.object({
  sectionId: z.string(),
  item: z.record(z.any()),
  position: z.enum(["start", "end"]).optional().default("end"),
});

const removeListItemSchema = z.object({
  sectionId: z.string(),
  itemIndex: z.number().int().nonnegative(),
});

const batchUpdateSchema = z.object({
  changes: z.array(
    z.object({
      tool: z.string(),
      params: z.record(z.any()),
    })
  ),
});

export const toolActionSchema = z.object({
  tool: z.enum(SUPPORTED_TOOL_NAMES),
  params: z.record(z.any()),
});

export const toolPlanSchema = z.object({
  actions: z.array(toolActionSchema),
});

export type SupportedTool =
  | "updateSectionText"
  | "updateMetadata"
  | "updateListItem"
  | "addListItem"
  | "removeListItem"
  | "batchUpdate";

export interface ToolAction {
  tool: SupportedTool;
  params: Record<string, unknown>;
}

function cloneContent(content: WebsiteContent): WebsiteContent {
  return JSON.parse(JSON.stringify(content)) as WebsiteContent;
}

function updateSectionField(
  content: WebsiteContent,
  sectionId: string,
  field: string,
  value: unknown
) {
  const target = content.sections.find(
    (section: WebsiteContent["sections"][number]) => section.id === sectionId
  );
  if (!target) {
    throw new Error(`Section ${sectionId} not found`);
  }
  target.content[field] = value;
}

function ensureList(content: WebsiteContent, sectionId: string): unknown[] {
  const target = content.sections.find(
    (section: WebsiteContent["sections"][number]) => section.id === sectionId
  );
  if (!target) {
    throw new Error(`Section ${sectionId} not found`);
  }
  if (!Array.isArray(target.content.items)) {
    target.content.items = Array.isArray(target.content.items)
      ? target.content.items
      : [];
  }
  return target.content.items as unknown[];
}

export function applyToolActions(
  previous: WebsiteContent,
  actions: ToolAction[]
): { content: WebsiteContent; changes: ReturnType<typeof diffWebsiteContent> } {
  const updated = cloneContent(previous);

  const executeAction = (target: WebsiteContent, action: ToolAction) => {
    switch (action.tool) {
      case "updateSectionText": {
        const payload = updateSectionTextSchema.parse(action.params);
        updateSectionField(
          target,
          payload.sectionId,
          payload.field,
          payload.newValue
        );
        return;
      }
      case "updateMetadata": {
        const payload = updateMetadataSchema.parse(action.params);
        const field = payload.field;
        target.metadata = {
          ...target.metadata,
          [field]: payload.value,
        } as WebsiteContent["metadata"];
        return;
      }
      case "updateListItem": {
        const payload = updateListItemSchema.parse(action.params);
        const list = ensureList(target, payload.sectionId);
        const current = list[payload.itemIndex];
        const next =
          typeof current === "object" && current !== null
            ? { ...(current as Record<string, unknown>), ...payload.updates }
            : payload.updates;
        list[payload.itemIndex] = next;
        return;
      }
      case "addListItem": {
        const payload = addListItemSchema.parse(action.params);
        const list = ensureList(target, payload.sectionId);
        if (payload.position === "start") {
          list.unshift(payload.item);
        } else {
          list.push(payload.item);
        }
        return;
      }
      case "removeListItem": {
        const payload = removeListItemSchema.parse(action.params);
        const list = ensureList(target, payload.sectionId);
        list.splice(payload.itemIndex, 1);
        return;
      }
      case "batchUpdate": {
        const payload = batchUpdateSchema.parse(action.params);
        payload.changes.forEach(
          (item: { tool: string; params: Record<string, unknown> }) =>
            executeAction(target, item as ToolAction)
        );
        return;
      }
      default:
        throw new Error(`Unsupported tool ${action.tool}`);
    }
  };

  actions.forEach((action) => executeAction(updated, action));

  // Always update lastModified timestamp so the draft is fresher than HTML extraction
  updated.metadata.lastModified = new Date().toISOString();

  return {
    content: updated,
    changes: diffWebsiteContent(previous, updated),
  };
}
