# CogniCMS - AI-Powered CMS for Static Websites

## Project Overview

Build a generic, AI-powered Content Management System that enables non-technical users to update static HTML/CSS/JavaScript websites through natural language conversation. The system should work with any static site hosted on GitHub Pages.

---

## Core Requirements

### Product Name

**CogniCMS** - A conversational CMS for static websites

### Target Users

- Non-technical content editors
- Small business owners
- Community website managers
- Anyone managing static HTML sites on GitHub Pages

### Primary Use Case

User opens CogniCMS, chats with AI in natural language (any language), requests content changes, previews changes, approves, and changes are automatically deployed to their live website via GitHub.

---

## Technical Stack

**Required:**

- TypeScript (strict mode)
- React 18+
- Next.js 16+ (App Router)
- Node.js 18+
- Vercel AI SDK (latest)
- Tailwind CSS
- Octokit (GitHub REST API)

**AI Model implementation:**

- see the following document on how to use the NanoGPT model provider:
  nanogpt-request-flow.md

**Deployment Target:**

- Render.com (free tier compatible)
- Auto-sleep after inactivity
- Environment variable configuration

---

## Architecture Overview

### Three-Layer Architecture

**1. Frontend (React + Next.js)**

- Chat interface for natural language editing
- Side-by-side preview panel (current vs. proposed changes)
- Approval workflow UI
- Simple password authentication

**2. Backend (Next.js API Routes)**

- AI chat endpoint (Vercel AI SDK integration)
- Content management (read/write operations)
- GitHub integration (via Octokit)
- Content extraction and generation

**3. GitHub Integration**

- Read content from target repository
- Write updated content back to repository
- Automatic GitHub Pages deployment
- Version control (Git commits as audit trail)

---

## Content Model - Generic Approach

### Strategy: Structured Data Extraction

The CMS should be **site-agnostic** and work with any static HTML site. It achieves this through:

**1. Initial Setup (Per Website)**

- User provides GitHub repo URL
- CMS analyzes HTML structure
- AI extracts semantic content into structured JSON
- User can customize content schema if needed

**2. Content Schema (Generic Structure)**

```typescript
interface WebsiteContent {
  metadata: {
    title: string;
    description: string;
    lastModified: string;
  };

  sections: Array<{
    id: string;
    type: "hero" | "content" | "list" | "contact" | "custom";
    label: string; // Human-readable: "Hero Section", "About Us", etc.
    content: Record<string, any>; // Flexible nested structure
  }>;

  assets: {
    images: string[];
    links: Array<{ text: string; url: string }>;
  };
}
```

**3. Content Operations**

The CMS should support:

- **Extract**: HTML → JSON (one-time setup per site)
- **Edit**: JSON modification via AI tools
- **Generate**: JSON → HTML (preserve original structure)
- **Validate**: Ensure HTML remains valid after changes

---

## Core Features (MVP)

### 1. Multi-Site Management

**Functionality:**

- Support multiple websites per CMS instance
- Each website = separate GitHub repo
- Switch between sites via dropdown/sidebar
- Store site configs in local database or JSON file

**Site Configuration:**

```typescript
interface SiteConfig {
  id: string;
  name: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string; // default: 'main'
  contentFile: string; // default: 'content.json'
  htmlFile: string; // default: 'index.html'
  customSchema?: object; // optional schema overrides
}
```

### 2. Natural Language Content Editing

**AI Capabilities (Level 1 - MVP):**

- Update existing text content
- Change dates, times, numbers
- Modify headings and descriptions
- Update contact information
- Edit list items (add/remove/modify)
- Multi-language support (AI detects language)

**Example User Requests:**

- "Change the meeting date to December 6th"
- "Update the email address to hello@example.com"
- "Add a new FAQ: 'How much does it cost?' Answer: 'Free entry'"
- "Verander de datum naar 6 december" (Dutch)

### 3. AI Tool System

**Implement structured tool calling (not free-form HTML editing):**

**Generic Tools:**

```typescript
// Tool 1: Update text in any section
updateSectionText(sectionId: string, field: string, newValue: string)

// Tool 2: Update list item
updateListItem(sectionId: string, itemId: string, updates: object)

// Tool 3: Add list item
addListItem(sectionId: string, item: object)

// Tool 4: Remove list item
removeListItem(sectionId: string, itemId: string)

// Tool 5: Update metadata
updateMetadata(field: string, value: string)

// Tool 6: Batch update (multiple changes at once)
batchUpdate(changes: Array<Change>)
```

**Tool Design Principles:**

- Content-type agnostic (works for any structured data)
- Validate all inputs before applying
- Return structured diff for preview
- Support undo/redo via Git history

### 4. Preview & Approval Workflow

**Preview Panel:**

- Split view: Current content | Proposed changes
- Highlight differences (text-based diff)
- Optional: Visual HTML preview (iframe)
- Show which sections will be affected

**Approval Options:**

- ✅ **Approve & Publish** - Apply changes and push to GitHub
- ❌ **Reject** - Discard changes, keep current version
- 🔄 **Revise** - Continue chatting to refine changes

**After Approval:**

- Generate commit message (AI-written, descriptive)
- Push to GitHub with attribution
- Show success confirmation + estimated deployment time
- Link to live site

### 5. Authentication & Access Control

**MVP: Simple Password Protection**

```typescript
interface AuthConfig {
  method: "password"; // future: 'oauth', 'magic-link'
  password: string; // stored in env variable
  sessionDuration: number; // hours
}
```

**Implementation:**

- Middleware checks password on protected routes
- Session stored in httpOnly cookie
- No user accounts (single shared password per deployment)
- Future: Multi-user with GitHub OAuth

### 6. GitHub Integration

**Required Operations:**

- Authenticate via Personal Access Token (PAT)
- Read file content from repository
- Write/update files in repository
- Create commits with descriptive messages
- Handle merge conflicts (prevent concurrent edits)

**Error Handling:**

- Rate limiting (GitHub API: 5000 req/hour)
- Network failures (retry logic)
- Invalid credentials (clear error message)
- Repository not found
- Permission errors

---

## File Structure

```
cognicms/
├── README.md
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── .env.local.example
│
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing/login page
│   │
│   ├── dashboard/
│   │   └── page.tsx               # Site selector dashboard
│   │
│   ├── editor/
│   │   └── [siteId]/
│   │       └── page.tsx           # Main chat editor interface
│   │
│   └── api/
│       ├── auth/
│       │   └── route.ts           # Password authentication
│       │
│       ├── sites/
│       │   ├── route.ts           # List/create/delete sites
│       │   └── [siteId]/
│       │       └── route.ts       # Get/update site config
│       │
│       ├── content/
│       │   └── [siteId]/
│       │       ├── route.ts       # Get current content
│       │       └── extract/route.ts # Extract HTML → JSON
│       │
│       ├── chat/
│       │   └── [siteId]/route.ts  # AI chat endpoint (Vercel AI SDK)
│       │
│       └── publish/
│           └── [siteId]/route.ts  # Push changes to GitHub
│
├── components/
│   ├── auth/
│   │   └── PasswordLogin.tsx
│   │
│   ├── dashboard/
│   │   ├── SiteList.tsx
│   │   └── AddSiteModal.tsx
│   │
│   ├── editor/
│   │   ├── ChatInterface.tsx      # Main chat UI
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   ├── PreviewPanel.tsx       # Side-by-side diff
│   │   ├── ApprovalButtons.tsx
│   │   └── SiteHeader.tsx
│   │
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── LoadingSpinner.tsx
│
├── lib/
│   ├── ai/
│   │   ├── client.ts              # Vercel AI SDK setup
│   │   ├── tools.ts               # Tool definitions
│   │   ├── prompts.ts             # System prompts
│   │   └── streaming.ts           # Stream handling
│   │
│   ├── github/
│   │   ├── client.ts              # Octokit wrapper
│   │   ├── operations.ts          # Read/write/commit
│   │   └── auth.ts                # Token management
│   │
│   ├── content/
│   │   ├── extractor.ts           # HTML → JSON parser
│   │   ├── generator.ts           # JSON → HTML generator
│   │   ├── validator.ts           # Validation logic
│   │   └── differ.ts              # Generate diffs
│   │
│   ├── storage/
│   │   ├── sites.ts               # Site config CRUD
│   │   └── cache.ts               # Content caching
│   │
│   └── utils/
│       ├── auth.ts                # Auth helpers
│       ├── errors.ts              # Error handling
│       └── validation.ts          # Input validation
│
├── types/
│   ├── site.ts                    # Site config types
│   ├── content.ts                 # Content schema types
│   ├── github.ts                  # GitHub API types
│   └── ai.ts                      # AI tool types
│
├── styles/
│   └── globals.css                # Tailwind + custom styles
│
└── public/
    └── favicon.ico
```

---

## Detailed Implementation Requirements

### 1. Content Extraction (HTML → JSON)

**Goal:** Automatically parse any static HTML and extract editable content into structured JSON.

**Algorithm:**

1. Load HTML file from GitHub
2. Parse DOM structure (use jsdom or similar)
3. Identify semantic sections:
   - Headers (h1-h6)
   - Paragraphs (p)
   - Lists (ul, ol)
   - Links (a)
   - Images (img)
   - Forms (input, textarea)
4. Extract text content and attributes
5. Generate unique IDs for each section
6. Create hierarchical JSON structure
7. Save as `content.json` in same repo

**Example Extraction:**

**Input HTML:**

```html
<section id="hero">
  <h1>Welcome to Our Café</h1>
  <p>Join us for philosophical discussions.</p>
  <a href="#contact">Contact Us</a>
</section>
```

**Output JSON:**

```json
{
  "sections": [
    {
      "id": "hero",
      "type": "content",
      "label": "Hero Section",
      "content": {
        "heading": "Welcome to Our Café",
        "description": "Join us for philosophical discussions.",
        "cta": {
          "text": "Contact Us",
          "href": "#contact"
        }
      }
    }
  ]
}
```

**Edge Cases to Handle:**

- Nested HTML structures
- Inline styles (preserve them)
- JavaScript-generated content (skip, warn user)
- Multiple HTML files (support choosing main file)
- Non-semantic HTML (use heuristics to identify sections)

### 2. Content Generation (JSON → HTML)

**Goal:** Regenerate HTML from JSON while preserving original structure, styles, and non-content elements.

**Strategy:**

- Store original HTML as template
- Replace content placeholders with JSON values
- Preserve all HTML structure, classes, IDs, attributes
- Keep inline styles and scripts intact

**Implementation Options:**

**Option A: Template Replacement**

- Mark editable regions in original HTML with special comments
- Replace marked regions with updated content from JSON
- Fastest, least error-prone

**Option B: DOM Manipulation**

- Parse original HTML to DOM
- Update specific nodes based on JSON
- Serialize back to HTML
- More flexible but riskier

**Recommendation:** Start with Option A (template replacement)

**Template Markers:**

```html
<!-- COGNICMS:START:section_id:field_name -->
<h1>Welcome to Our Café</h1>
<!-- COGNICMS:END:section_id:field_name -->
```

### 3. AI System Prompt

**Purpose:** Guide AI to understand user intent and call appropriate tools.

**Prompt Structure:**

```
You are CogniCMS Assistant, an AI that helps users update their website content through natural language.

CURRENT WEBSITE: {{site_name}}
CONTENT STRUCTURE: {{content_json}}

YOUR CAPABILITIES:
- Understand requests in any language
- Update text content in any section
- Modify lists (add/remove/edit items)
- Change dates, times, and contact information
- Show clear previews before making changes

YOUR LIMITATIONS:
- You cannot add entirely new sections (only update existing ones)
- You cannot modify HTML structure or styling
- You cannot upload images (user must provide URLs)

WORKFLOW:
1. Understand the user's request
2. Identify which section(s) and field(s) to update
3. Call the appropriate tool(s)
4. Show a clear before/after preview
5. Ask for confirmation before applying changes

TOOL CALLING GUIDELINES:
- Use specific tools for specific changes (don't batch unrelated changes)
- Always provide clear descriptions in tool calls
- Validate data before calling tools (e.g., check date formats)
- If unsure, ask clarifying questions

RESPONSE STYLE:
- Be friendly and conversational
- Match the user's language
- Explain what you're about to change
- Be concise but clear
- Use bullet points for multiple changes

EXAMPLE INTERACTIONS:
User: "Change the event date to December 6th"
You: "I'll update the event date to December 6, 2025. Here's what will change:
- Current: November 26, 2025
- New: December 6, 2025

Shall I apply this change?"

User: "Voeg een nieuwe FAQ toe over de kosten"
You: "Ik begrijp dat je een FAQ wilt toevoegen over kosten. Wat moet het antwoord zijn op die vraag?"
```

### 4. AI Tool Implementations

**Tool 1: updateSectionText**

```typescript
{
  name: 'updateSectionText',
  description: 'Update text content in a specific section and field',
  parameters: z.object({
    sectionId: z.string().describe('The section ID to update'),
    field: z.string().describe('The field name within the section'),
    newValue: z.string().describe('The new text value'),
  }),
  execute: async ({ sectionId, field, newValue }) => {
    // 1. Validate section exists
    // 2. Validate field exists
    // 3. Create change object
    // 4. Return preview data
    return {
      success: true,
      preview: {
        section: sectionLabel,
        field: field,
        current: currentValue,
        proposed: newValue,
      }
    };
  }
}
```

**Tool 2: updateListItem**

```typescript
{
  name: 'updateListItem',
  description: 'Update an existing item in a list',
  parameters: z.object({
    sectionId: z.string(),
    itemId: z.string().describe('The ID of the list item'),
    updates: z.record(z.any()).describe('Fields to update'),
  }),
  execute: async ({ sectionId, itemId, updates }) => {
    // Implementation
  }
}
```

**Tool 3: addListItem**

```typescript
{
  name: 'addListItem',
  description: 'Add a new item to a list',
  parameters: z.object({
    sectionId: z.string(),
    item: z.record(z.any()).describe('The new item data'),
    position: z.enum(['start', 'end']).optional().default('end'),
  }),
  execute: async ({ sectionId, item, position }) => {
    // Implementation
  }
}
```

**Implement 5-7 tools total** covering common operations.

### 5. Preview System

**Requirements:**

- Show clear before/after comparison
- Highlight specific changes (text diff)
- Support multiple simultaneous changes
- Optional: Live HTML preview in iframe

**Preview Data Structure:**

```typescript
interface PreviewData {
  changes: Array<{
    sectionId: string;
    sectionLabel: string;
    field: string;
    currentValue: any;
    proposedValue: any;
    changeType: "update" | "add" | "remove";
  }>;
  commitMessage: string; // AI-generated
  estimatedDeployTime: string; // "1-2 minutes"
}
```

**UI Components:**

- Left panel: Current content (read-only)
- Right panel: Proposed content (highlighted changes)
- Bottom: Approve/Reject buttons + commit message preview

### 6. GitHub Publishing

**Workflow:**

1. User approves changes
2. Generate new HTML from updated JSON
3. Validate HTML (check for syntax errors)
4. Create commit with descriptive message
5. Push to GitHub (content.json + index.html)
6. Return success confirmation
7. GitHub Pages auto-deploys (1-2 min)

**Commit Message Format:**

```
[CogniCMS] Update: <AI-generated summary>

Changes made:
- Updated section "Hero" field "heading"
- Added FAQ item "How much does it cost?"

Edited by: CogniCMS AI Assistant
Timestamp: 2025-10-31T14:30:00Z
```

**Error Handling:**

```typescript
try {
  await pushToGitHub(content, html, commitMessage);
  return { success: true, message: "Changes published!" };
} catch (error) {
  if (error.status === 409) {
    // Conflict: someone else edited
    return { success: false, error: "conflict" };
  } else if (error.status === 401) {
    // Auth failed
    return { success: false, error: "auth" };
  } else {
    // Generic error
    return { success: false, error: "unknown" };
  }
}
```

---

## Configuration & Environment Variables

**Required Environment Variables:**

```bash
# AI Configuration
ANTHROPIC_API_KEY=sk-ant-xxxxx
# OR
OPENAI_API_KEY=sk-xxxxx

# Authentication
CMS_PASSWORD=your-secure-password-here
SESSION_SECRET=random-secret-for-cookie-signing

# Optional: Multi-user (future)
# GITHUB_CLIENT_ID=xxxxx
# GITHUB_CLIENT_SECRET=xxxxx

# Application
NEXT_PUBLIC_APP_NAME=CogniCMS
NEXT_PUBLIC_APP_URL=https://your-cms.onrender.com

# Storage (for site configs)
# Option A: File-based (default)
STORAGE_TYPE=file
STORAGE_PATH=./data/sites.json

# Option B: Database (future)
# STORAGE_TYPE=database
# DATABASE_URL=postgresql://...
```

**Site-Specific Configuration (per website):**

Stored in `data/sites.json`:

```json
[
  {
    "id": "zincafe-zweeloo",
    "name": "Zincafé Zweeloo",
    "githubOwner": "stefjnl",
    "githubRepo": "zincafe-zweeloo",
    "githubToken": "ghp_xxxxx",
    "githubBranch": "main",
    "contentFile": "content.json",
    "htmlFile": "index.html",
    "createdAt": "2025-10-31T14:00:00Z",
    "lastModified": "2025-10-31T14:30:00Z"
  }
]
```

**Security Considerations:**

- Store GitHub tokens encrypted (use crypto module)
- Never expose tokens in frontend
- Validate all user inputs
- Sanitize HTML output
- Use httpOnly cookies for sessions

---

## User Interface Design

### 1. Login Page (`/`)

**Layout:**

- Centered card
- Logo/title: "CogniCMS"
- Tagline: "AI-powered content editing for static websites"
- Password input field
- "Login" button
- Simple, clean design

### 2. Dashboard (`/dashboard`)

**Layout:**

- Header: Logo, user menu (logout)
- Main area: Grid of website cards
- Each card shows:
  - Site name
  - Last modified date
  - Quick actions: Edit, Settings, Delete
- Bottom: "+ Add New Website" button

**Add Website Modal:**

- Form fields:
  - Website name
  - GitHub repository URL
  - GitHub Personal Access Token
  - Branch (default: main)
- "Analyze" button → Extracts content → Creates site config
- Show progress indicator during extraction

### 3. Editor Interface (`/editor/[siteId]`)

**Layout (Three-Panel):**

**Top Bar:**

- Site name
- Last saved timestamp
- "View Live Site" button (opens in new tab)
- Settings icon

**Left Panel (40% width):**

- Chat interface
- Message history (user + AI)
- Input field at bottom
- Auto-scroll to latest message

**Right Panel (60% width):**

- Preview area
- Tabs: "Current" | "Proposed" | "Diff"
- Approval buttons (when changes pending)
- Collapsible (more space for chat if needed)

**Responsive:**

- Mobile: Stack panels vertically
- Tablet: Keep side-by-side but narrower
- Desktop: Full three-panel layout

---

## Testing Requirements

### Unit Tests

- Content extractor (HTML → JSON)
- Content generator (JSON → HTML)
- Tool functions (each tool independently)
- GitHub client operations
- Validation functions

### Integration Tests

- Full flow: Chat → Tool call → Preview → Publish
- GitHub API interactions (mock responses)
- AI SDK integration (mock model responses)
- Authentication middleware

### End-to-End Tests (Manual for MVP)

- Add new website
- Extract content successfully
- Make simple edit via chat
- Preview shows correct changes
- Publish updates GitHub
- Live site reflects changes

### Test Data

- Include sample HTML files (simple, medium, complex)
- Sample content.json structures
- Mock AI responses

---

## Deployment Instructions

### Prerequisites

1. Render.com account (free tier)
2. GitHub account with PAT (repo scope)
3. Anthropic API key (or OpenAI)

### Steps

**1. Prepare Repository**

```bash
git init
git add .
git commit -m "Initial commit: CogniCMS"
git remote add origin https://github.com/yourusername/cognicms.git
git push -u origin main
```

**2. Deploy to Render**

- Go to render.com
- "New +" → "Web Service"
- Connect GitHub repository
- Settings:
  - Name: cognicms
  - Region: Choose closest
  - Branch: main
  - Build Command: `npm install && npm run build`
  - Start Command: `npm start`
  - Plan: Free

**3. Environment Variables (in Render dashboard)**

- Add all variables from `.env.local.example`
- Save changes

**4. Deploy**

- Render auto-deploys on push to main
- First deploy takes 5-10 minutes
- Check logs for errors

**5. Custom Domain (Optional)**

- Render Settings → Custom Domain
- Add your domain
- Update DNS (CNAME record)

### Post-Deployment

- Test login with password
- Add first website
- Verify GitHub integration works
- Monitor Render logs for issues

---

## Documentation Requirements

**Include in project:**

### 1. README.md

- Project overview
- Features list
- Quick start guide
- Deployment instructions
- Environment variables explanation
- Troubleshooting section

### 2. SETUP.md

- Detailed setup for developers
- Prerequisites
- Local development workflow
- Testing guide

### 3. USER_GUIDE.md

- How to add a website
- How to use the AI chat
- Common use cases and examples
- Tips for writing good prompts
- Troubleshooting for end users

### 4. API.md

- API routes documentation
- Request/response formats
- Error codes
- Rate limiting info

### 5. ARCHITECTURE.md

- System architecture diagram
- Data flow explanation
- Technology choices rationale
- Future enhancement ideas

---

## Success Criteria

**MVP is complete when:**

- [ ] User can add a static HTML website by providing GitHub URL
- [ ] CMS successfully extracts content into structured JSON
- [ ] User can chat with AI to request content changes
- [ ] AI understands requests in multiple languages
- [ ] Preview accurately shows before/after changes
- [ ] User can approve changes with one click
- [ ] Changes publish to GitHub within 30 seconds
- [ ] Live website updates within 2 minutes
- [ ] No manual coding required from user
- [ ] Works with at least 3 different website structures
- [ ] Deployed to Render and accessible via URL
- [ ] Basic error handling (network, auth, validation)
- [ ] Session persists for 24 hours after login

**Quality Metrics:**

- AI understands 80%+ of natural language requests correctly
- Content extraction works for 90%+ of semantic HTML sites
- Zero data loss during edit operations
- UI responsive on mobile/tablet/desktop
- Page load time < 3 seconds (after wake from sleep)

---

## Future Enhancements (Post-MVP)

### Phase 2: Advanced Editing

- Add new sections (not just update existing)
- Restructure content (move sections around)
- Delete sections
- Image upload and management
- Multi-file website support (blog, multiple pages)

### Phase 3: Collaboration

- Multiple user accounts
- Role-based access (editor, admin, viewer)
- Change approval workflow (editor proposes, admin approves)
- Activity log (who changed what when)

### Phase 4: Advanced Features

- Visual WYSIWYG editor (fallback from AI)
- Scheduled publishing (draft → publish at date/time)
- A/B testing (try variations before publishing)
- SEO optimization suggestions
- Accessibility checker
- Performance optimization (image compression, etc.)

### Phase 5: Integrations

- Connect to CMSs (WordPress, Contentful as backend)
- Deploy to other platforms (Netlify, Vercel, custom servers)
- Webhook support (trigger builds on external events)
- Analytics integration (track content performance)

---

## Edge Cases & Error Scenarios

**Handle gracefully:**

1. **GitHub API Rate Limiting**

   - Cache content locally (60 min expiry)
   - Show warning when approaching limit
   - Queue changes if limit reached

2. **Concurrent Edits**

   - Detect when GitHub content changed since last fetch
   - Prompt user to refresh before editing
   - Prevent overwriting others' changes

3. **Invalid HTML Generation**

   - Validate HTML before pushing
   - Show validation errors to user
   - Offer to revert to previous version

4. **AI Misunderstanding**

   - AI asks clarifying questions
   - User can rephrase request
   - Fallback: "I'm not sure what to change. Can you be more specific?"

5. **Large Files**

   - Warn if HTML > 1MB
   - Chunk large content extractions
   - Show progress indicators

6. **Network Failures**

   - Retry logic (3 attempts with exponential backoff)
   - Show clear error messages
   - Save draft locally (localStorage) to prevent data loss

7. **Expired Tokens**
   - Detect 401 errors
   - Prompt user to update GitHub token
   - Clear instructions on how to generate new token

---

## Performance Considerations

**Optimization Strategies:**

1. **Content Caching**

   - Cache fetched content for 5-60 minutes
   - Invalidate on successful publish
   - Reduce GitHub API calls

2. **Lazy Loading**

   - Load sites list on demand
   - Don't fetch all site content at once
   - Stream AI responses (don't wait for full response)

3. **Debouncing**

   - Debounce user input in chat (300ms)
   - Don't send every keystroke to AI

4. **Code Splitting**

   - Lazy load editor components
   - Separate bundles for dashboard vs. editor
   - Tree-shake unused dependencies

5. **Render Sleep Optimization**
   - Keep instance warm with health check (if needed)
   - Show loading state during cold start
   - Educate users about free tier tradeoffs

---

## Security Checklist

**Must implement:**

- [ ] Input validation on all user inputs
- [ ] Output sanitization (XSS prevention)
- [ ] CSRF protection (Next.js built-in)
- [ ] Secure session cookies (httpOnly, sameSite)
- [ ] Encrypt GitHub tokens at rest
- [ ] Rate limiting on API routes (prevent abuse)
- [ ] Content Security Policy headers
- [ ] HTTPS enforcement (Render provides)
- [ ] Secrets in environment variables (never in code)
- [ ] Audit log for sensitive operations

**Optional (future):**

- [ ] Two-factor authentication
- [ ] IP whitelisting
- [ ] Webhook signature verification
- [ ] Regular security audits

---

## Monitoring & Observability

**What to track:**

1. **Application Metrics**

   - API response times
   - Error rates
   - AI token usage (cost tracking)
   - GitHub API quota usage

2. **User Metrics**

   - Number of sites managed
   - Edits per site per month
   - AI request success rate
   - Session duration

3. **System Health**
   - Uptime percentage
   - Memory usage
   - CPU usage
   - Render free tier limits

**Tools:**

- Render dashboard (built-in logs)
- Console logs (structured JSON)
- Optional: Sentry (error tracking)
- Optional: Plausible Analytics (privacy-friendly)

---

## Development Best Practices

**Code Quality:**

- TypeScript strict mode enabled
- ESLint + Prettier configured
- Consistent code style
- Meaningful variable names
- Comments for complex logic only

**Git Workflow:**

- Feature branches
- Descriptive commit messages
- Small, atomic commits
- Keep main branch deployable

**Component Design:**

- Small, focused components
- Prop types defined with TypeScript
- Reusable UI components in /components/ui
- Separation of concerns (logic vs. presentation)

**Error Handling:**

- Try-catch blocks for all async operations
- Meaningful error messages for users
- Log errors for debugging
- Never expose stack traces to users

**Testing:**

- Test critical paths
- Mock external dependencies (GitHub API, AI)
- Keep tests fast
- Run tests before commit (git hooks)

---

## Questions for Clarification

**Before starting, confirm:**

1. **AI Model:** Claude 3.5 Sonnet or GPT-4? (Both work with Vercel AI SDK)
2. **Storage:** File-based (JSON) or database (Supabase) for site configs?
3. **Authentication:** Just password or future-proof with OAuth?
4. **Scope:** MVP only or include some Phase 2 features?
5. **Design:** Use headless UI library (Radix, shadcn) or build from scratch?

---

## Final Checklist

**Before considering project complete:**

- [ ] All core features implemented and tested
- [ ] Deployed to Render successfully
- [ ] Documentation written (README, USER_GUIDE)
- [ ] Sample website tested end-to-end
- [ ] Error handling covers common scenarios
- [ ] UI responsive on mobile/tablet/desktop
- [ ] Environment variables documented
- [ ] Git repository clean (no secrets committed)
- [ ] Code formatted and linted
- [ ] Performance acceptable (< 3s load, < 1s interactions)

---

## Getting Started

**Step 1: Initialize Project**

```bash
npx create-next-app@latest cognicms --typescript --tailwind --app
cd cognicms
npm install @ai-sdk/anthropic ai zod octokit jsdom bcrypt
npm install -D @types/node @types/react
```

**Step 2: Set Up Project Structure**

- Create folders as per file structure above
- Set up TypeScript paths in tsconfig.json
- Configure Tailwind with custom colors

**Step 3: Implement in Order**

1. Authentication system
2. Site management (CRUD)
3. Content extractor (HTML → JSON)
4. Content generator (JSON → HTML)
5. GitHub client
6. AI tools
7. Chat interface
8. Preview system
9. Publishing workflow

**Step 4: Test & Deploy**

- Local testing
- Deploy to Render
- Production testing
- User acceptance testing

---

## Support & Maintenance

**After deployment:**

- Monitor Render logs weekly
- Check GitHub API quota usage
- Update dependencies monthly
- Review AI token costs
- User feedback collection
