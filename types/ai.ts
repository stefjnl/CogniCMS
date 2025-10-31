import { z } from "zod";

export interface ToolExecutionResult {
  success: boolean;
  preview?: unknown;
  error?: string;
}

export interface ToolContext {
  siteId: string;
}

export type ToolExecutor<TSchema extends z.ZodTypeAny> = (
  params: z.infer<TSchema>,
  context: ToolContext
) => Promise<ToolExecutionResult>;

export interface StructuredTool<TSchema extends z.ZodTypeAny> {
  name: string;
  description: string;
  parameters: TSchema;
  execute: ToolExecutor<TSchema>;
}
