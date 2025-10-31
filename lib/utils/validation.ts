import { z } from "zod";

export const siteSchema = z.object({
  name: z.string().min(1),
  githubOwner: z.string().min(1),
  githubRepo: z.string().min(1),
  githubBranch: z.string().min(1).default("main"),
  githubToken: z.string().min(1),
  contentFile: z.string().default("content.json"),
  htmlFile: z.string().default("index.html"),
  customSchema: z.record(z.any()).optional(),
});

export type SiteInput = z.infer<typeof siteSchema>;

export const chatMessageSchema = z
  .object({
    id: z.string().optional(),
    messages: z
      .array(
        z
          .object({
            id: z.string().min(1),
            role: z.enum(["system", "user", "assistant", "tool"]),
            content: z.string().optional(),
            parts: z.array(z.any()).optional(),
            metadata: z.record(z.any()).optional(),
          })
          .passthrough()
      )
      .optional(),
    data: z.any().optional(),
  })
  .passthrough();

export const publishSchema = z.object({
  content: z.any(),
  html: z.string().optional(),
  commitMessage: z.string().min(1),
});
