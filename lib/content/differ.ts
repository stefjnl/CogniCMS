import { PreviewChange, WebsiteContent, WebsiteSection } from "@/types/content";

function toComparable(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value ?? null);
}

function diffSections(
  previous?: WebsiteSection,
  next?: WebsiteSection
): PreviewChange[] {
  if (!previous && next) {
    return [
      {
        sectionId: next.id,
        sectionLabel: next.label,
        field: "*",
        changeType: "add",
        currentValue: null,
        proposedValue: next.content,
      },
    ];
  }

  if (previous && !next) {
    return [
      {
        sectionId: previous.id,
        sectionLabel: previous.label,
        field: "*",
        changeType: "remove",
        currentValue: previous.content,
        proposedValue: null,
      },
    ];
  }

  if (!previous || !next) {
    return [];
  }

  const changes: PreviewChange[] = [];
  const previousContent = previous.content;
  const nextContent = next.content;

  const fields = new Set([
    ...Object.keys(previousContent),
    ...Object.keys(nextContent),
  ]);
  fields.forEach((field) => {
    const beforeValue = previousContent[field];
    const afterValue = nextContent[field];
    if (toComparable(beforeValue) !== toComparable(afterValue)) {
      changes.push({
        sectionId: next.id,
        sectionLabel: next.label,
        field,
        changeType: "update",
        currentValue: beforeValue,
        proposedValue: afterValue,
      });
    }
  });

  return changes;
}

export function diffWebsiteContent(
  previous: WebsiteContent,
  next: WebsiteContent
): PreviewChange[] {
  const changes: PreviewChange[] = [];

  // Validate inputs
  if (!previous || !next) {
    return changes;
  }

  if (
    toComparable(previous.metadata?.title) !== toComparable(next.metadata?.title)
  ) {
    changes.push({
      sectionId: "metadata",
      sectionLabel: "Metadata",
      field: "title",
      changeType: "update",
      currentValue: previous.metadata?.title,
      proposedValue: next.metadata?.title,
    });
  }

  if (
    toComparable(previous.metadata?.description) !==
    toComparable(next.metadata?.description)
  ) {
    changes.push({
      sectionId: "metadata",
      sectionLabel: "Metadata",
      field: "description",
      changeType: "update",
      currentValue: previous.metadata?.description,
      proposedValue: next.metadata?.description,
    });
  }

  // Validate sections array exists
  if (!previous.sections || !next.sections) {
    return changes;
  }

  // Handle both array and object formats for sections
  const previousSectionsArray = Array.isArray(previous.sections)
    ? previous.sections
    : Object.entries(previous.sections).map(([id, section]: [string, any]) => ({
        id,
        label: section.label || id,
        type: section.type || 'content',
        content: section.content || section,
      }));

  const nextSectionsArray = Array.isArray(next.sections)
    ? next.sections
    : Object.entries(next.sections).map(([id, section]: [string, any]) => ({
        id,
        label: section.label || id,
        type: section.type || 'content',
        content: section.content || section,
      }));

  const previousSections = new Map(
    previousSectionsArray.map((section: WebsiteSection) => [section.id, section])
  );
  const nextSections = new Map(
    nextSectionsArray.map((section: WebsiteSection) => [section.id, section])
  );
  const sectionIds = new Set([
    ...previousSections.keys(),
    ...nextSections.keys(),
  ]);

  sectionIds.forEach((sectionId) => {
    const prev = previousSections.get(sectionId);
    const upcoming = nextSections.get(sectionId);
    diffSections(prev, upcoming).forEach((change) => changes.push(change));
  });

  return changes;
}
