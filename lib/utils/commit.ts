import { PreviewChange } from "@/types/content";

export function buildCommitMessage(changes: PreviewChange[]): string {
  const summary = changes
    .map(
      (change) =>
        `${
          change.changeType === "update"
            ? "Updated"
            : change.changeType === "add"
            ? "Added"
            : "Removed"
        } ${change.sectionLabel} (${change.field})`
    )
    .slice(0, 5)
    .join("; ");
  const headline = summary
    ? `[CogniCMS] ${summary}`
    : "[CogniCMS] Content update";
  return `${headline}\n\nChanges made:\n${changes
    .map(
      (change) =>
        `- ${change.changeType.toUpperCase()}: ${change.sectionLabel} → ${
          change.field
        }`
    )
    .join(
      "\n"
    )}\n\nEdited by: CogniCMS AI Assistant\nTimestamp: ${new Date().toISOString()}`;
}
