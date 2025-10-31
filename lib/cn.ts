import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Intelligent class merging utility combining clsx and tailwind-merge
 * This ensures Tailwind CSS classes are properly merged without conflicts
 * while maintaining proper specificity and override behavior.
 *
 * @example
 * cn("px-2 py-1", "px-4") // => "py-1 px-4" (px-4 overrides px-2)
 * cn("text-red-500", conditional && "text-blue-500") // => conditional text color
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
