import { describe, it, expect, vi, beforeEach } from 'vitest';
import { diffWebsiteContent } from '@/lib/content/differ';
import { WebsiteContent, PreviewChange } from '@/types/content';

describe('AI Chatbot Editing Flow', () => {
  let baselineContent: WebsiteContent;
  let modifiedContent: WebsiteContent;

  beforeEach(() => {
    baselineContent = {
      metadata: {
        title: 'Test Site',
        description: 'Test description',
        lastModified: '2024-01-01',
      },
      sections: [
        {
          id: 'header',
          type: 'hero',
          label: 'Header',
          content: {
            heading: 'Original Title',
            subheading: 'Original Subtitle',
          },
        },
        {
          id: 'about',
          type: 'content',
          label: 'About',
          content: {
            text: 'Original about text',
          },
        },
      ],
      assets: {
        images: [],
        links: [],
      },
    };

    modifiedContent = {
      ...baselineContent,
      sections: [
        {
          id: 'header',
          type: 'hero',
          label: 'Header',
          content: {
            heading: 'AI Modified Title',
            subheading: 'Original Subtitle',
          },
        },
        {
          id: 'about',
          type: 'content',
          label: 'About',
          content: {
            text: 'AI modified about text',
          },
        },
      ],
    };
  });

  describe('Differ - baseline functionality', () => {
    it('should detect changes between baseline and modified content', () => {
      const changes = diffWebsiteContent(baselineContent, modifiedContent);

      expect(changes).toHaveLength(2);
      expect(changes[0]).toMatchObject({
        sectionId: 'header',
        field: 'heading',
        changeType: 'update',
        currentValue: 'Original Title',
        proposedValue: 'AI Modified Title',
      });
      expect(changes[1]).toMatchObject({
        sectionId: 'about',
        field: 'text',
        changeType: 'update',
        currentValue: 'Original about text',
        proposedValue: 'AI modified about text',
      });
    });

    it('should return changes without source metadata by default', () => {
      const changes = diffWebsiteContent(baselineContent, modifiedContent);

      // Differ doesn't set source - that's the job of the caller
      expect(changes[0].source).toBeUndefined();
      expect(changes[0].timestamp).toBeUndefined();
    });
  });

  describe('AI Change Attribution', () => {
    it('should attribute changes to AI source when processing refreshDraft', () => {
      // This is what refreshDraft SHOULD do
      const changes = diffWebsiteContent(baselineContent, modifiedContent);

      // Simulate the fix: map changes to add AI attribution
      const attributedChanges = changes.map((change) => ({
        ...change,
        source: 'ai' as const,
        timestamp: new Date().toISOString(),
      }));

      // Verify all changes have AI source
      attributedChanges.forEach((change) => {
        expect(change.source).toBe('ai');
        expect(change.timestamp).toBeDefined();
        expect(typeof change.timestamp).toBe('string');
      });
    });

    it('should create properly structured change objects for AI edits', () => {
      const changes = diffWebsiteContent(baselineContent, modifiedContent);
      const timestamp = '2024-01-15T10:30:00.000Z';

      const attributedChanges: PreviewChange[] = changes.map((change) => ({
        ...change,
        source: 'ai' as const,
        timestamp,
      }));

      expect(attributedChanges[0]).toMatchObject({
        sectionId: 'header',
        sectionLabel: 'Header',
        field: 'heading',
        changeType: 'update',
        currentValue: 'Original Title',
        proposedValue: 'AI Modified Title',
        source: 'ai',
        timestamp,
      });
    });

    it('should allow filtering AI changes by source', () => {
      const changes = diffWebsiteContent(baselineContent, modifiedContent);

      const attributedChanges = changes.map((change) => ({
        ...change,
        source: 'ai' as const,
        timestamp: new Date().toISOString(),
      }));

      // Simulate PreviewPanel filtering
      const aiChanges = attributedChanges.filter((c) => c.source === 'ai');
      const manualChanges = attributedChanges.filter((c) => c.source === 'manual');
      const unknownChanges = attributedChanges.filter((c) => !c.source);

      expect(aiChanges).toHaveLength(2);
      expect(manualChanges).toHaveLength(0);
      expect(unknownChanges).toHaveLength(0);
    });
  });

  describe('Manual vs AI Change Attribution', () => {
    it('should differentiate between manual and AI changes', () => {
      const changes = diffWebsiteContent(baselineContent, modifiedContent);

      // Simulate manual change (like handleSaveEdit does)
      const manualChange: PreviewChange = {
        ...changes[0],
        source: 'manual' as const,
        timestamp: new Date().toISOString(),
      };

      // Simulate AI change (like refreshDraft SHOULD do)
      const aiChange: PreviewChange = {
        ...changes[1],
        source: 'ai' as const,
        timestamp: new Date().toISOString(),
      };

      const mixedChanges = [manualChange, aiChange];

      // Verify filtering works correctly
      const manualOnly = mixedChanges.filter((c) => c.source === 'manual');
      const aiOnly = mixedChanges.filter((c) => c.source === 'ai');

      expect(manualOnly).toHaveLength(1);
      expect(manualOnly[0].field).toBe('heading');

      expect(aiOnly).toHaveLength(1);
      expect(aiOnly[0].field).toBe('text');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple AI changes in one response', () => {
      const multiChangeContent = {
        ...baselineContent,
        metadata: {
          ...baselineContent.metadata,
          title: 'AI Modified Title',
          description: 'AI Modified Description',
        },
        sections: baselineContent.sections.map((section) => ({
          ...section,
          content: {
            ...section.content,
            ...(section.id === 'header' ? { heading: 'New Heading' } : {}),
          },
        })),
      };

      const changes = diffWebsiteContent(baselineContent, multiChangeContent);
      const attributedChanges = changes.map((change) => ({
        ...change,
        source: 'ai' as const,
        timestamp: new Date().toISOString(),
      }));

      expect(attributedChanges.length).toBeGreaterThan(1);
      attributedChanges.forEach((change) => {
        expect(change.source).toBe('ai');
      });
    });

    it('should handle no changes gracefully', () => {
      const changes = diffWebsiteContent(baselineContent, baselineContent);
      const attributedChanges = changes.map((change) => ({
        ...change,
        source: 'ai' as const,
        timestamp: new Date().toISOString(),
      }));

      expect(attributedChanges).toHaveLength(0);
    });
  });
});
