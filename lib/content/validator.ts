import { JSDOM } from "jsdom";

export function validateHtml(html: string): { valid: boolean; error?: string } {
  try {
    new JSDOM(html);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}
