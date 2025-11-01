# CogniCMS - Complete HTML Extraction Fix Implementation Guide

## Problem Statement

**Current Issue:** The HTML extractor only processes `<section>` elements, causing content in `<header>`, `<nav>`, `<footer>`, `<main>`, `<article>`, `<aside>`, and direct body children to be completely invisible to the CMS.

**Example Missing Content:**
```html
<header>
  <h1>Zincafé Zweeloo</h1>           ← MISSING
  <p>Gesprekken die ertoe doen</p>   ← MISSING
</header>
<section>
  <h2>Waarom een Zincafé?</h2>        ← EXTRACTED ✓
</section>
```

**Goal:** Extract ALL editable content from ANY valid HTML5 document, regardless of structure.

---

## Solution Architecture

### Multi-Pass Extraction System

**Three-pass approach with priority hierarchy:**

```
Pass 1: Semantic HTML5 Elements
  └─ Extract: <header>, <nav>, <main>, <footer>, <article>, <aside>
  └─ Priority: Highest (structural meaning)
  
Pass 2: Explicit Sections
  └─ Extract: <section> elements not already captured
  └─ Priority: Medium (explicit structure)
  
Pass 3: Orphan Content Detection
  └─ Extract: Content not captured in Pass 1 or 2
  └─ Priority: Lowest (fallback)

Pass 4: Sorting & Deduplication
  └─ Sort sections by document order
  └─ Remove any duplicates
```

### Key Principles

1. **Never lose content** - If it's in the HTML, it should be editable
2. **Maintain document order** - Sections appear in same order as HTML
3. **No duplication** - Same content extracted only once
4. **Semantic awareness** - Respect HTML5 semantic meaning
5. **Graceful degradation** - Works with legacy HTML too

---

## Implementation Steps

### Step 1: Update Type Definitions

**File:** `types/content.ts`

**Current section types:**
```typescript
type SectionType = "hero" | "content" | "list" | "contact";
```

**Add new semantic types:**
```typescript
type SectionType = 
  | "hero"        // Existing: hero sections, now also <header>
  | "content"     // Existing: generic content
  | "list"        // Existing: list-based sections
  | "contact"     // Existing: contact forms
  | "navigation"  // NEW: <nav> elements
  | "footer"      // NEW: <footer> elements
  | "article"     // NEW: <article> elements (blog posts, news)
  | "sidebar"     // NEW: <aside> elements
  | "main"        // NEW: <main> wrapper content
  | "orphan";     // NEW: uncategorized content (fallback)
```

**Why these types:**
- Map directly to HTML5 semantic elements
- Cover 95% of real-world HTML patterns
- Clear meaning for users and AI

**No code changes needed elsewhere yet** - Types are backward compatible.

---

### Step 2: Create Extraction Utilities

**File:** `lib/content/extraction-utils.ts` (NEW FILE)

**Purpose:** Helper functions for multi-pass extraction

#### Utility 1: Check if Element is Nested

```typescript
/**
 * Check if element is a child/descendant of any already-extracted element
 * Prevents duplicate extraction of nested content
 */
export function isNestedInExtracted(
  element: Element,
  extractedElements: Set<Element>
): boolean {
  let parent = element.parentElement;
  
  while (parent) {
    if (extractedElements.has(parent)) {
      return true;
    }
    parent = parent.parentElement;
  }
  
  return false;
}
```

**Usage:** Before extracting an element, check if it's already inside a previously extracted element.

#### Utility 2: Check if Node Has Editable Content

```typescript
/**
 * Determine if a node contains editable text content
 * Ignore empty nodes, whitespace-only, script tags, style tags
 */
export function hasEditableContent(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim() || '';
    return text.length > 0;
  }
  
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    
    // Skip non-content elements
    const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK'];
    if (skipTags.includes(element.tagName)) {
      return false;
    }
    
    // Has text content or editable children
    const text = element.textContent?.trim() || '';
    return text.length > 0;
  }
  
  return false;
}
```

#### Utility 3: Generate Stable Section ID

```typescript
/**
 * Generate consistent section ID from element
 * Priority: id attribute > data-section-id > tag name + index
 */
export function generateSectionId(
  element: Element,
  tagName: string,
  index: number
): string {
  // Use existing ID if present
  if (element.id) {
    return element.id;
  }
  
  // Use data attribute if present
  const dataId = element.getAttribute('data-section-id');
  if (dataId) {
    return dataId;
  }
  
  // Generate from tag name and index
  return `${tagName}-${index + 1}`;
}
```

#### Utility 4: Get Element Position in Document

```typescript
/**
 * Get numerical position of element in document for sorting
 * Uses compareDocumentPosition for accurate ordering
 */
export function getDocumentPosition(
  element: Element,
  document: Document
): number {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT
  );
  
  let position = 0;
  let currentNode: Node | null;
  
  while (currentNode = walker.nextNode()) {
    if (currentNode === element) {
      return position;
    }
    position++;
  }
  
  return position;
}
```

#### Utility 5: Check if Node is Within Extracted Set

```typescript
/**
 * Check if a node is within any element in the extracted set
 * Used for orphan detection
 */
export function isWithinExtracted(
  node: Node,
  extractedElements: Set<Element>
): boolean {
  let parent: Node | null = node.parentNode;
  
  while (parent) {
    if (parent.nodeType === Node.ELEMENT_NODE) {
      if (extractedElements.has(parent as Element)) {
        return true;
      }
    }
    parent = parent.parentNode;
  }
  
  return false;
}
```

---

### Step 3: Create Semantic Element Extractor

**File:** `lib/content/semantic-extractor.ts` (NEW FILE)

**Purpose:** Extract content from HTML5 semantic elements

#### Main Function

```typescript
import { WebsiteSection } from "@/types/content";
import { generateSectionId, isNestedInExtracted } from "./extraction-utils";
import { extractSectionContent } from "./extractor"; // Reuse existing logic

/**
 * Extract content from semantic HTML5 elements
 * Pass 1 of multi-pass extraction
 */
export function extractSemanticElements(
  document: Document,
  extractedElements: Set<Element>
): WebsiteSection[] {
  const sections: WebsiteSection[] = [];
  
  // Define semantic element mappings
  const semanticMappings = [
    { selector: 'header', type: 'hero' as const, label: 'Header' },
    { selector: 'nav', type: 'navigation' as const, label: 'Navigation' },
    { selector: 'main', type: 'main' as const, label: 'Main Content' },
    { selector: 'footer', type: 'footer' as const, label: 'Footer' },
    { selector: 'article', type: 'article' as const, label: 'Article' },
    { selector: 'aside', type: 'sidebar' as const, label: 'Sidebar' }
  ];
  
  // Extract each semantic element type
  semanticMappings.forEach(({ selector, type, label }) => {
    const elements = Array.from(document.querySelectorAll(selector));
    
    elements.forEach((element, index) => {
      // Skip if already extracted (nested case)
      if (isNestedInExtracted(element, extractedElements)) {
        return;
      }
      
      // Extract content from element
      const content = extractSectionContent(element);
      
      // Skip if element is empty
      if (Object.keys(content).length === 0) {
        return;
      }
      
      // Create section
      const section: WebsiteSection = {
        id: generateSectionId(element, selector, index),
        type: type,
        label: label,
        content: content
      };
      
      sections.push(section);
      extractedElements.add(element);
    });
  });
  
  return sections;
}
```

**Key features:**
- Processes all semantic elements in priority order
- Skips nested elements (avoid duplication)
- Reuses existing `extractSectionContent` logic
- Skips empty elements
- Marks elements as extracted

---

### Step 4: Update Main Extractor

**File:** `lib/content/extractor.ts`

**Current structure:**
```typescript
export function extractContentFromHtml(html: string): WebsiteContent {
  const document = parseHTML(html);
  const sections = extractSections(document); // Only looks for <section>
  return { metadata, sections, assets };
}
```

**New structure:**
```typescript
import { extractSemanticElements } from './semantic-extractor';
import { extractOrphanContent } from './orphan-extractor'; // Step 5

export function extractContentFromHtml(html: string): WebsiteContent {
  const document = parseHTML(html);
  const extractedElements = new Set<Element>();
  let sections: WebsiteSection[] = [];
  
  // PASS 1: Extract semantic HTML5 elements
  const semanticSections = extractSemanticElements(document, extractedElements);
  sections.push(...semanticSections);
  
  // PASS 2: Extract explicit <section> elements
  const explicitSections = extractExplicitSections(document, extractedElements);
  sections.push(...explicitSections);
  
  // PASS 3: Extract orphan content (fallback)
  const orphanSections = extractOrphanContent(document, extractedElements);
  sections.push(...orphanSections);
  
  // PASS 4: Sort by document order
  sections = sortSectionsByDocumentOrder(sections, document);
  
  // Return complete content
  return {
    metadata: extractMetadata(document),
    sections: sections,
    assets: extractAssets(document)
  };
}
```

#### Updated Helper: Extract Explicit Sections

```typescript
/**
 * Extract <section> elements (Pass 2)
 * Skips sections already captured in Pass 1
 */
function extractExplicitSections(
  document: Document,
  extractedElements: Set<Element>
): WebsiteSection[] {
  const sections: WebsiteSection[] = [];
  const sectionElements = Array.from(document.querySelectorAll('section'));
  
  sectionElements.forEach((element, index) => {
    // Skip if nested within already-extracted element
    if (isNestedInExtracted(element, extractedElements)) {
      return;
    }
    
    // Extract content
    const content = extractSectionContent(element);
    
    // Skip if empty
    if (Object.keys(content).length === 0) {
      return;
    }
    
    // Determine section type (existing logic)
    const type = inferSectionType(element);
    
    // Generate label from heading or ID
    const label = generateSectionLabel(element, index);
    
    sections.push({
      id: generateSectionId(element, 'section', index),
      type: type,
      label: label,
      content: content
    });
    
    extractedElements.add(element);
  });
  
  return sections;
}
```

#### New Helper: Sort Sections

```typescript
/**
 * Sort sections by their appearance order in HTML document
 */
function sortSectionsByDocumentOrder(
  sections: WebsiteSection[],
  document: Document
): WebsiteSection[] {
  // Create position map
  const positionMap = new Map<string, number>();
  
  sections.forEach(section => {
    // Find original element by ID
    let element = document.getElementById(section.id);
    
    if (!element) {
      // Try finding by other attributes
      element = document.querySelector(`[data-section-id="${section.id}"]`);
    }
    
    if (element) {
      const position = getDocumentPosition(element, document);
      positionMap.set(section.id, position);
    } else {
      // If can't find, put at end
      positionMap.set(section.id, 999999);
    }
  });
  
  // Sort by position
  return sections.sort((a, b) => {
    const posA = positionMap.get(a.id) || 999999;
    const posB = positionMap.get(b.id) || 999999;
    return posA - posB;
  });
}
```

---

### Step 5: Create Orphan Content Extractor

**File:** `lib/content/orphan-extractor.ts` (NEW FILE)

**Purpose:** Detect and extract content not captured by semantic or section extraction

```typescript
import { WebsiteSection } from "@/types/content";
import { isWithinExtracted, hasEditableContent } from "./extraction-utils";

/**
 * Extract orphan content (Pass 3)
 * Finds content not within any extracted semantic or section elements
 */
export function extractOrphanContent(
  document: Document,
  extractedElements: Set<Element>
): WebsiteSection[] {
  const sections: WebsiteSection[] = [];
  const orphanGroups: Element[] = [];
  
  // Walk through all body children
  const bodyChildren = Array.from(document.body.children);
  
  bodyChildren.forEach(child => {
    // Skip if already extracted
    if (extractedElements.has(child)) {
      return;
    }
    
    // Skip if nested within extracted element
    if (isWithinExtracted(child, extractedElements)) {
      return;
    }
    
    // Skip if no editable content
    if (!hasEditableContent(child)) {
      return;
    }
    
    orphanGroups.push(child);
  });
  
  // Create orphan sections
  orphanGroups.forEach((element, index) => {
    const content = extractSectionContent(element);
    
    if (Object.keys(content).length > 0) {
      sections.push({
        id: `orphan-${index + 1}`,
        type: 'orphan',
        label: `Other Content ${index + 1}`,
        content: content
      });
    }
  });
  
  return sections;
}
```

**Orphan detection logic:**
1. Check all direct body children
2. Skip if already extracted
3. Skip if nested within extracted element
4. Skip if no editable content
5. Extract remaining content as "orphan" sections

---

### Step 6: Update Type Inference

**File:** `lib/content/extractor.ts`

**Current `inferSectionType()` function:**
```typescript
function inferSectionType(element: Element): SectionType {
  const explicitType = element.getAttribute("data-section-type");
  if (explicitType) return explicitType as SectionType;

  if (element.querySelector("form")) return "contact";
  if (element.querySelector("ul, ol")) return "list";
  if (element.querySelector("h1, h2")) return "hero";
  
  return "content";
}
```

**Enhanced version:**
```typescript
function inferSectionType(element: Element): SectionType {
  // Priority 1: Explicit data attribute
  const explicitType = element.getAttribute("data-section-type");
  if (explicitType) {
    return explicitType as SectionType;
  }
  
  // Priority 2: Semantic element mapping
  const tagName = element.tagName.toLowerCase();
  const semanticTypeMap: Record<string, SectionType> = {
    'header': 'hero',
    'nav': 'navigation',
    'footer': 'footer',
    'article': 'article',
    'aside': 'sidebar',
    'main': 'main'
  };
  
  if (semanticTypeMap[tagName]) {
    return semanticTypeMap[tagName];
  }
  
  // Priority 3: Content-based heuristics
  if (element.querySelector("form")) return "contact";
  if (element.querySelector("nav, [role='navigation']")) return "navigation";
  if (element.querySelector("footer, [role='contentinfo']")) return "footer";
  if (element.querySelector("ul, ol")) return "list";
  if (element.querySelector("h1")) return "hero";
  
  // Priority 4: Default
  return "content";
}
```

---

### Step 7: Update UI Components

**Files to update:**
- `components/editor/ContentTree.tsx`
- `components/editor/SectionLabel.tsx` (if exists)

#### Display New Section Types

**Add type badges/icons:**

```typescript
const sectionTypeIcons: Record<SectionType, string> = {
  hero: '🎯',
  content: '📄',
  list: '📋',
  contact: '📧',
  navigation: '🧭',    // NEW
  footer: '⬇️',        // NEW
  article: '📰',       // NEW
  sidebar: '📌',       // NEW
  main: '📦',          // NEW
  orphan: '🔍'         // NEW
};

const sectionTypeLabels: Record<SectionType, string> = {
  hero: 'Hero',
  content: 'Content',
  list: 'List',
  contact: 'Contact',
  navigation: 'Navigation',   // NEW
  footer: 'Footer',           // NEW
  article: 'Article',         // NEW
  sidebar: 'Sidebar',         // NEW
  main: 'Main',               // NEW
  orphan: 'Other'             // NEW
};
```

**In ContentTree component:**

```typescript
<div className="section-header">
  <span className="section-icon">
    {sectionTypeIcons[section.type]}
  </span>
  <span className="section-label">
    {section.label}
  </span>
  <span className="section-type-badge">
    {sectionTypeLabels[section.type]}
  </span>
</div>
```

---

### Step 8: Update AI System Prompt

**File:** `lib/ai/prompts.ts`

**Add new section types to AI's knowledge:**

```typescript
const systemPrompt = `
You are CogniCMS Assistant...

AVAILABLE SECTION TYPES:
- hero: Header sections, hero banners, main page headers
- content: Generic content sections
- list: List-based content (ul, ol)
- contact: Contact forms and information
- navigation: Site navigation menus (NEW)
- footer: Footer sections with links/contact (NEW)
- article: Blog posts, news articles (NEW)
- sidebar: Sidebars, asides, related content (NEW)
- main: Main content wrapper (NEW)
- orphan: Miscellaneous content (NEW)

When users reference "navigation", "footer", "sidebar", etc., you can now edit those sections.
`;
```

**Update tool descriptions:**

```typescript
{
  name: 'updateSectionText',
  description: 'Update text in any section including navigation, footer, sidebar, etc.',
  // ...
}
```

---

### Step 9: Handle Content Regeneration

**File:** `lib/content/generator.ts`

**Issue:** Regenerating HTML from extracted content needs to preserve structure

**Current approach:**
- Generate HTML from JSON using templates

**Update needed:**
- Map section types back to HTML elements

```typescript
function generateHTMLFromSection(section: WebsiteSection): string {
  // Map section type to HTML element
  const elementMap: Record<SectionType, string> = {
    hero: 'header',
    navigation: 'nav',
    footer: 'footer',
    article: 'article',
    sidebar: 'aside',
    main: 'main',
    content: 'section',
    list: 'section',
    contact: 'section',
    orphan: 'div'
  };
  
  const tagName = elementMap[section.type] || 'section';
  
  return `
    <${tagName} id="${section.id}">
      ${generateSectionHTML(section.content)}
    </${tagName}>
  `;
}
```

---

### Step 10: Testing Strategy

#### Test Cases Required

**Test 1: Pure Semantic HTML**
```html
<header><h1>Title</h1></header>
<nav><a href="#">Home</a></nav>
<main><p>Content</p></main>
<footer><p>Footer</p></footer>
```
**Expected:** 4 sections (header, navigation, main, footer)

**Test 2: Mixed Semantic + Sections**
```html
<header><h1>Title</h1></header>
<section><h2>Section 1</h2></section>
<section><h2>Section 2</h2></section>
```
**Expected:** 3 sections (header, section-1, section-2)

**Test 3: Nested Semantic Elements**
```html
<header>
  <nav><a href="#">Menu</a></nav>
  <h1>Title</h1>
</header>
```
**Expected:** 1 section (header with nested nav content)

**Test 4: Orphan Content**
```html
<div class="banner">
  <h1>Not in any section</h1>
</div>
<section><h2>Regular section</h2></section>
```
**Expected:** 2 sections (orphan-1, section-1)

**Test 5: Empty Elements**
```html
<header></header>
<nav></nav>
<section><p>Content</p></section>
```
**Expected:** 1 section (section-1) - empty header/nav skipped

**Test 6: Zincafé Zweeloo (Real Case)**
```html
<header>
  <h1>Zincafé Zweeloo</h1>
  <p>Gesprekken die ertoe doen</p>
</header>
<section>
  <h2>Waarom een Zincafé?</h2>
  <p>...</p>
</section>
```
**Expected:** 2 sections (header with h1+p, section-1 with h2+content)

#### Test Implementation

**Create test file:** `lib/content/__tests__/extractor.test.ts`

```typescript
import { extractContentFromHtml } from '../extractor';

describe('HTML Extraction', () => {
  it('should extract semantic header element', () => {
    const html = `
      <html><body>
        <header>
          <h1>Title</h1>
          <p>Subtitle</p>
        </header>
      </body></html>
    `;
    
    const result = extractContentFromHtml(html);
    
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].type).toBe('hero');
    expect(result.sections[0].label).toBe('Header');
    expect(result.sections[0].content.heading).toBe('Title');
  });
  
  it('should extract navigation element', () => {
    const html = `
      <html><body>
        <nav>
          <a href="#">Home</a>
          <a href="#">About</a>
        </nav>
      </body></html>
    `;
    
    const result = extractContentFromHtml(html);
    
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].type).toBe('navigation');
  });
  
  // Add more tests for each case...
});
```

---

### Step 11: Migration Strategy

**For existing sites that were already extracted:**

#### Option A: Auto-Reextract on Load

**File:** `lib/content/version.ts` (NEW)

```typescript
export const CONTENT_SCHEMA_VERSION = 2;

export function needsMigration(content: WebsiteContent): boolean {
  const currentVersion = content.metadata?.schemaVersion || 1;
  return currentVersion < CONTENT_SCHEMA_VERSION;
}

export function migrateContent(
  oldContent: WebsiteContent,
  html: string
): WebsiteContent {
  // Re-extract from original HTML
  const newContent = extractContentFromHtml(html);
  
  // Preserve any manual customizations (if needed)
  // For MVP: Full re-extraction is fine
  
  return {
    ...newContent,
    metadata: {
      ...newContent.metadata,
      schemaVersion: CONTENT_SCHEMA_VERSION
    }
  };
}
```

**Update extractor to add version:**

```typescript
export function extractContentFromHtml(html: string): WebsiteContent {
  // ... extraction logic ...
  
  return {
    metadata: {
      ...extractMetadata(document),
      schemaVersion: CONTENT_SCHEMA_VERSION  // NEW
    },
    sections,
    assets
  };
}
```

**In site loading logic:**

```typescript
async function loadSiteContent(siteId: string) {
  const content = await fetchContent(siteId);
  
  if (needsMigration(content)) {
    const html = await fetchOriginalHTML(siteId);
    const migratedContent = migrateContent(content, html);
    await saveContent(siteId, migratedContent);
    return migratedContent;
  }
  
  return content;
}
```

#### Option B: Manual Reextraction

**Add button in UI:**

```tsx
<button onClick={handleReextract}>
  🔄 Re-scan Website
  <span className="tooltip">
    Scan your HTML again to find any missed content
  </span>
</button>
```

**Recommendation:** Use Option A (auto-migrate) for better UX.

---

### Step 12: Error Handling

**Add error boundaries for extraction failures:**

```typescript
export function extractContentFromHtml(html: string): WebsiteContent {
  try {
    // ... extraction logic ...
  } catch (error) {
    console.error('Extraction failed:', error);
    
    // Return minimal valid structure
    return {
      metadata: {
        title: 'Extraction Failed',
        description: 'Unable to extract content from HTML',
        schemaVersion: CONTENT_SCHEMA_VERSION
      },
      sections: [],
      assets: { images: [], links: [] }
    };
  }
}
```

**Log extraction warnings:**

```typescript
if (sections.length === 0) {
  console.warn('No sections extracted from HTML - empty page?');
}

if (orphanSections.length > 5) {
  console.warn(`Many orphan sections detected (${orphanSections.length}) - HTML may have unusual structure`);
}
```

---

### Step 13: Performance Optimization

**For large HTML documents:**

#### Caching

```typescript
const extractionCache = new Map<string, WebsiteContent>();

export function extractContentFromHtml(
  html: string,
  useCache = true
): WebsiteContent {
  if (useCache) {
    const cacheKey = hashHTML(html);
    const cached = extractionCache.get(cacheKey);
    if (cached) return cached;
  }
  
  const result = performExtraction(html);
  
  if (useCache) {
    extractionCache.set(hashHTML(html), result);
  }
  
  return result;
}
```

#### Lazy Extraction

```typescript
// For very large pages (>1MB), extract on-demand
export async function extractContentLazy(html: string): Promise<WebsiteContent> {
  // Use Web Worker for large extraction
  if (html.length > 1_000_000) {
    return extractInWorker(html);
  }
  
  return extractContentFromHtml(html);
}
```

---

## Implementation Checklist

### Phase 1: Core Extraction (Priority 1)
- [ ] Add new section types to `types/content.ts`
- [ ] Create `lib/content/extraction-utils.ts` with helper functions
- [ ] Create `lib/content/semantic-extractor.ts`
- [ ] Create `lib/content/orphan-extractor.ts`
- [ ] Update `lib/content/extractor.ts` with multi-pass logic
- [ ] Update `inferSectionType()` function
- [ ] Add `sortSectionsByDocumentOrder()` function

### Phase 2: Testing (Priority 1)
- [ ] Create test file with 6 core test cases
- [ ] Test with pure semantic HTML
- [ ] Test with mixed semantic + sections
- [ ] Test with nested elements
- [ ] Test with orphan content
- [ ] Test with real Zincafé Zweeloo HTML
- [ ] Verify no content is lost

### Phase 3: UI Updates (Priority 2)
- [ ] Update ContentTree to display new section types
- [ ] Add icons/badges for new types
- [ ] Update section type labels
- [ ] Test UI with new section types

### Phase 4: AI Integration (Priority 2)
- [ ] Update system prompts with new section types
- [ ] Update tool descriptions
- [ ] Test AI understanding of new types
- [ ] Verify AI can edit navigation, footer, etc.

### Phase 5: Generation (Priority 2)
- [ ] Update `lib/content/generator.ts` 
- [ ] Map section types back to HTML elements
- [ ] Test round-trip (extract → modify → generate)
- [ ] Verify HTML structure preserved

### Phase 6: Migration (Priority 3)
- [ ] Add schema version to content
- [ ] Implement migration logic
- [ ] Test auto-migration on existing sites
- [ ] Add UI notification for migrations

### Phase 7: Polish (Priority 3)
- [ ] Add error handling
- [ ] Add extraction warnings
- [ ] Optimize for large HTML
- [ ] Add caching if needed
- [ ] Documentation updates

---

## Testing Procedure

### Manual Testing Steps

**1. Create Test HTML File**

Create `test-cases/semantic-test.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Semantic Test</title>
</head>
<body>
  <header>
    <h1>Test Site</h1>
    <p>Test subtitle</p>
  </header>
  
  <nav>
    <a href="#">Home</a>
    <a href="#">About</a>
  </nav>
  
  <main>
    <article>
      <h2>Article Title</h2>
      <p>Article content</p>
    </article>
    
    <aside>
      <h3>Sidebar</h3>
      <p>Related links</p>
    </aside>
  </main>
  
  <section>
    <h2>Regular Section</h2>
    <p>Section content</p>
  </section>
  
  <div class="orphan">
    <p>Orphan content</p>
  </div>
  
  <footer>
    <p>Contact: test@example.com</p>
  </footer>
</body>
</html>
```

**2. Upload to CogniCMS**

- Go to "Add Website" dialog
- Paste test HTML or connect test repo
- Click "Create Site"

**3. Verify Extraction**

Check "CURRENT SITE CONTENT" panel shows:
- ✅ header (hero)
- ✅ navigation (navigation)
- ✅ main (main)
- ✅ article (article)
- ✅ sidebar (sidebar)
- ✅ section-1 (content)
- ✅ orphan-1 (orphan)
- ✅ footer (footer)

**4. Test Editing**

- Edit header title
- Edit navigation links
- Edit footer contact
- Verify preview updates
- Publish and check live site

**5. Test Zincafé Zweeloo**

- Re-extract zincafe-zweeloo.nl
- Verify header content now appears
- Verify all previously missing content now visible
- Test editing and publishing

---

## Expected Outcomes

### Before Fix

```
CURRENT SITE CONTENT

▼ section-1 (2 fields)
  heading: Waarom een Zincafé?
  paragraphs: Array (5 items)

❌ Missing:
   - <h1>Zincafé Zweeloo</h1>
   - <p>Gesprekken die ertoe doen</p>
   - Navigation links
   - Footer content
```

### After Fix

```
CURRENT SITE CONTENT

▼ header (4 fields)               hero
  title: Zincafé Zweeloo
  subtitle: Gesprekken die ertoe doen
  cta: Blijf op de hoogte
  urgency: Volgende bijeenkomst over 17 dagen

▼ navigation (3 fields)           navigation
  links: Array (3 items)

▼ section-1 (2 fields)            hero
  heading: Waarom een Zincafé?
  paragraphs: Array (5 items)

▼ section-2 (2 fields)            hero
  heading: Eerstvolgende bijeenkomst
  ...

▼ footer (2 fields)               footer
  contact: zincafezweeloo@gmail.com
  ...
```

---

## Success Criteria

**Fix is complete when:**

- [ ] All HTML content appears in "CURRENT SITE CONTENT"
- [ ] Semantic elements (header, nav, footer) are extracted
- [ ] Content maintains document order
- [ ] No duplicate content across sections
- [ ] User can edit all visible text on their site
- [ ] AI understands new section types
- [ ] Preview shows all changes correctly
- [ ] Publishing works with new structure
- [ ] Tests pass for all 6 test cases
- [ ] Real site (zincafe-zweeloo.nl) shows all content

---

## Rollback Plan

**If issues arise:**

1. Keep old extractor as `extractor-v1.ts`
2. Feature flag new extractor:
   ```typescript
   const USE_NEW_EXTRACTOR = process.env.NEXT_PUBLIC_NEW_EXTRACTOR === 'true';
   ```
3. Can switch back via environment variable
4. Existing content.json files still work (backward compatible)

---

## Estimated Time

**Implementation:**
- Core extraction: 3-4 hours
- Testing: 2 hours
- UI updates: 1 hour
- AI integration: 1 hour
- Migration: 1 hour
- Polish: 1 hour

**Total: 9-10 hours**

---

## Next Steps After Implementation

**Phase 2 Enhancements:**
1. Visual HTML preview with element highlighting
2. Click element in preview → Jump to field in content tree
3. Drag-and-drop section reordering
4. Custom section type definitions
5. Template system for common HTML patterns

---

**This fix will make CogniCMS work with ANY HTML structure, not just section-based layouts. It's a foundational improvement that enables all future features to work correctly.**

**Ready to implement! 🚀**
