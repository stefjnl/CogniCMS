# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CogniCMS is an AI-assisted content management system for static HTML websites hosted on GitHub Pages. Non-technical editors can describe desired changes in natural language, review a structured preview, and publish updates without touching code.

**Tech Stack:** Next.js 16.0.1, React 18.2, TypeScript, Tailwind CSS, Vercel AI SDK v5, NanoGPT (OpenAI-compatible API), Octokit, Vitest (via `npm run test`)

**Key Features:**
- Schema-driven content editing with PageDefinition support
- Tabbed editor interface (Metadata, Sections, AI Chat)
- Real-time AI-powered content updates with visual diff preview
- One-click publishing to GitHub Pages

## Development Commands

```bash
# Development
npm run dev          # Start Next.js dev server on :3000
npm run build        # Type-check and create production build
npm run start        # Start production server

# Quality
npm run lint         # Run ESLint
npm run test         # Run Vitest tests

# Run a single test file
npm run test -- lib/ai/tools.test.ts

# Run tests in watch mode
npm run test -- --watch
```

## Environment Setup

Copy `.env.local.example` to `.env.local` and configure:

```bash
CMS_PASSWORD=your-password
SESSION_SECRET=long-random-string
SESSION_DURATION=24
NANOGPT_API_KEY=sk-...
NANOGPT_BASE_URL=https://nano-gpt.com/api/v1  # Optional, defaults to this
NANOGPT_MODEL=z-ai/glm-4.6                     # Optional, defaults to this
```

## Architecture

### Core Data Flow

1. **User Chat** → Editor sends natural language request via `/api/chat/[siteId]`
2. **NanoGPT Processing** → AI generates structured tool calls using content context
3. **Tool Execution** → `applyToolActions` mutates draft content in-memory
4. **Diff Preview** → `diffWebsiteContent` compares old vs. new content
5. **Publish** → Commits JSON + HTML to GitHub via Octokit

### Content Model

Content is represented as `WebsiteContent` (`types/content.ts`):

```typescript
{
  metadata: { title, description, lastModified },
  sections: WebsiteSection[],  // Primary editing unit
  assets: { images, links }
}
```

**Key Patterns:**

- **Sections** have stable `id`, `type`, `label`, and polymorphic `content` object
- Tools mutate section content fields, never add/remove sections
- Field names are normalized: `title`, `headline`, `header` → `heading`

**Schema-Driven Architecture:**

- `PageDefinition` (`types/content-schema.ts`) defines the structure of a page
- Each page definition includes metadata fields and section definitions
- Site configs can reference a `pageDefinitionId` to enable schema-driven editing
- `lib/config/page-definition-resolver.ts` resolves the appropriate schema for a site
- ContentOverview component adapts UI based on PageDefinition (grouped metadata fields, typed section fields)

### AI Integration Architecture

**NanoGPT Integration** (`lib/ai/assistant.ts`):

- Uses `@ai-sdk/openai` provider with custom `baseURL` pointing to NanoGPT
- Default model: `z-ai/glm-4.6` (configurable via `NANOGPT_MODEL`)
- System prompt dynamically generated per request, includes full content structure
- Single tool: `applyUpdates` with actions array
- Multi-step execution enabled via `stopWhen: stepCountIs(5)` for complex workflows
- **Fallback mechanism**: Parses JSON from text responses if model doesn't use tool calling

**Supported Tools** (`lib/ai/tools.ts`):

- `updateSectionText`: Update text fields in section content
- `updateMetadata`: Update title, description, or lastModified
- `updateListItem`/`addListItem`/`removeListItem`: Array operations on `section.content.items`
- `updateNextEvent`: Update the next event date in an events section (Dutch NL focused)
- `batchUpdate`: Atomic multi-action changes

All tools use strict Zod validation. Invalid params abort the chat response.

### Storage & Encryption

- **Site configs**: `data/sites.json` (file-backed, JSON)
- **GitHub tokens**: Encrypted at rest using AES-256-CBC (`lib/utils/crypto`)
- **Draft content**: In-memory cache per session (lost on restart)
- Always call `resolveToken()` to decrypt tokens before GitHub API calls

### GitHub Integration

**Normalization** (`lib/github/operations.ts`):

- Handles various input formats (URLs, GitHub URLs, plain names)
- Example: `normalizeOwner("https://github.com/acme")` → `"acme"`

**Publishing**:

- Uses low-level Octokit Git API (tree/blob/commit)
- Preserves commit SHAs for partial updates
- Function: `publishFiles` with `GitHubContent[]` structure

### Session & Authentication

- Session tokens: Signed JWTs in `cognicms_session` HttpOnly cookies
- Session validation: `lib/utils/auth.ts` using `SESSION_SECRET` env var
- All API handlers must call `requireSession()` or `isSessionValid()` first
- Protected routes: `/dashboard`, `/editor`, `/api/*` (except `/api/auth`)
- Rate limiting: Tier-based limits via Upstash Redis (`lib/utils/ratelimit.ts`)
  - Free: 10 chat requests/min, Pro: 50/min, Enterprise: 200/min

### Server Actions

Server Actions (`lib/actions/`) provide an alternative to API routes for some operations:

- `chat.ts`: Chat validation, draft management
- `content.ts`: Content CRUD operations
- `sites.ts`: Site configuration operations

Note: Streaming chat still uses API routes (`/api/chat/[siteId]`) as Server Actions don't yet have first-class streaming support in AI SDK v5.

### Editor UI Architecture

**Tabbed Interface** (`components/editor/ChatInterface.tsx`):

The editor features a VS Code-style tabbed sidebar with three main views:

1. **Metadata Tab** - Site metadata editing (SEO, branding, contact, social, CTA fields)
2. **Sections Tab** - Page sections content editing (hero, content, lists, contact forms)
3. **AI Chat Tab** - Conversational content editing interface

**Component Structure:**

- `ChatInterface.tsx` - Main editor container with tab state management
- `ContentOverview.tsx` - Schema-driven content editing with conditional rendering (`showOnlyMetadata`, `showOnlySections`)
- `MessageList.tsx` - Chat message display with distinct user/AI bubble styling
- `MessageInput.tsx` - Chat input with emerald-themed send button and keyboard shortcuts
- `SmartSuggestions.tsx` - Quick suggestion chips for common editing tasks

**Design System:**

- User messages: `bg-blue-700` with white text, right-aligned, max-width 80%
- AI messages: `bg-gray-50` with dark text and border, left-aligned, max-width 90%
- Action buttons: Emerald green theme (`bg-emerald-600`) matching GitHub integration
- Inputs: `focus:ring-emerald-100` for consistent focus states

### Observability

**Structured Logging**:

```typescript
const logger = buildTraceLogger("ChatExecutor", context.traceId);
logger("draft-updated", { actionCount: 3, changeCount: 5 });
```

**NEVER use `console.log()` except for temporary debugging**. Use trace logger for production debugging via trace IDs passed in headers/responses.

**Error Monitoring**:

- Sentry integration configured (`lib/utils/sentry.ts`)
- Separate expected vs unexpected errors
- Sanitize production error messages to avoid leaking sensitive info

## API Route Patterns

All API handlers follow this structure:

1. Extract params from `context.params` (async in Next.js 15+)
2. Call `requireSession()` or `isSessionValid()` first
3. Parse request body with Zod schema from `lib/utils/validation`
4. Use `buildTraceLogger(scope, traceId)` for logging
5. Return JSON or SSE stream (chat endpoint)

**Example**: See `app/api/chat/[siteId]/route.ts` and `app/api/sites/route.ts`

## Common Development Tasks

### Adding a New Content Tool

1. Define Zod schema in `lib/ai/tools.ts` (e.g., `myNewToolSchema`)
2. Add tool name to `SUPPORTED_TOOL_NAMES` array constant
3. Add tool name to `SupportedTool` type union
4. Implement case in `executeAction()` switch statement
5. Add test in `__tests__/` for schema validation
6. Update system prompt in `lib/ai/prompts.ts` to describe the new tool (under AVAILABLE TOOLS)

### Modifying Content Structure

1. Update `types/content.ts` (WebsiteSection, WebsiteContent)
2. Regenerate system prompts if section types/fields changed
3. Update differ in `lib/content/differ.ts` if top-level fields added
4. Update preview component: `components/editor/ChangeCard.tsx`

### Adding a New Page Definition Schema

1. Define new `PageDefinition` in `lib/config/site-definitions.ts`
2. Include metadata field definitions with groups (seo, branding, contact, social, cta, technical)
3. Define section schemas with field types (text, longtext, url, email, list, faq, json)
4. Export the definition and add to `siteDefinitionConfig.definitions` array
5. Map sites to the definition via `pageDefinitionId` in site config or by `htmlPath` matching

### Customizing Editor UI

**Tabbed Interface:**
- Tab state managed in `ChatInterface.tsx` via `activeTab` state
- Three tabs: "metadata", "sections", "chat"
- Each tab conditionally renders appropriate content

**ContentOverview Component:**
- Accepts `showOnlyMetadata` or `showOnlySections` props for filtered views
- Automatically groups metadata fields by category when PageDefinition is present
- Renders appropriate input types based on field definitions (Input, Textarea, etc.)

**Chat Interface Styling:**
- Follow emerald green theme for action buttons (`bg-emerald-600`)
- User messages: dark blue bubbles on right (`bg-blue-700`)
- AI messages: light gray bubbles on left (`bg-gray-50`)
- Maintain consistent `rounded-2xl` bubble styling

### Debugging Chat Issues

1. Enable trace logs: `NODE_ENV=development npm run dev`
2. Watch stdout for `[ChatExecutor]` and `[NanoGPT]` logs
3. Check trace IDs for correlation across requests
4. Verify `NANOGPT_API_KEY` and `NANOGPT_BASE_URL` are correct
5. Test NanoGPT endpoint manually:
   ```bash
   curl -X POST https://nano-gpt.com/api/v1/chat/completions \
     -H "Authorization: Bearer $NANOGPT_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"z-ai/glm-4.6","messages":[{"role":"user","content":"hello"}],"stream":true}'
   ```

### GitHub Integration Troubleshooting

1. Check `normalizeOwner`/`normalizeRepo` if parsing user input
2. Verify token has `repo` scope (read + write)
3. Confirm branch exists (publishFiles gets ref first)
4. Use trace logs to inspect SHA conflicts or Octokit errors
5. Test locally with personal token against test repo

## Key Implementation Details

### Next.js/AI SDK Best Practices

- **Node.js Runtime**: API routes use `runtime = "nodejs"` due to `crypto.randomUUID` and file-based storage. Edge Runtime would require database storage and Web Crypto API.
- **Streaming**: Use `streamText` for server-side generation, convert with `toUIMessageStreamResponse()`
- **Message Types**: `UIMessage` for application UI (includes metadata), `ModelMessage[]` for server (no metadata)
- **Multi-Step Tool Execution**: Use `stopWhen: stepCountIs(5)` to allow models to automatically send tool results back
- **Error Boundaries**: Use React Error Boundaries for client errors, wrap routes in `error.tsx`
- **Server Actions**: Use for non-streaming operations (`lib/actions/`); streaming still requires API routes

### Rate Limiting & Security

- Upstash Redis rate limiting configured (`lib/utils/ratelimit.ts`)
- Apply user-based rate limits using `rateLimitKey: auth.orgId`
- Validate all user input to protect against XSS, SQL injection, file upload attacks
- Use secret management tools, scan artifacts with Trufflehog

### Performance

- Implement code splitting to avoid loading entire app at once
- Extract reusable logic into custom hooks (follow DRY principle)
- Always run in production mode for production workloads

## Recent Architecture Changes

### Tabbed Editor Interface (2025-01)

The editor now features a VS Code-style tabbed sidebar:
- **Metadata Tab**: Dedicated view for site metadata editing with grouped fields
- **Sections Tab**: Page sections content editing
- **AI Chat Tab**: Conversational editing interface with improved UX

Benefits:
- Better content organization and focus
- Reduced visual clutter
- Clearer separation between metadata, sections, and AI interaction

### Schema-Driven Content Editing (2025-01)

Introduced `PageDefinition` system for structured content editing:
- Type-safe field definitions with validation
- Metadata field grouping (SEO, branding, contact, social, CTA, technical)
- Section-specific field types (text, longtext, url, email, list, faq, json)
- Automatic UI adaptation based on schema

Benefits:
- Consistent editing experience across different page types
- Better field labeling and descriptions
- Reduced errors through type constraints

### Chat UI Improvements (2025-01)

Redesigned chat interface following UX best practices:
- Distinct user (dark blue, right) vs AI (light gray, left) message bubbles
- Emerald green action buttons matching GitHub integration theme
- Subtle rounded-full suggestion chips
- Better spacing and readability
- Fixed input area at bottom with proper keyboard shortcuts

Benefits:
- Improved visual hierarchy and readability
- Better color contrast and accessibility
- Consistent design language across the app

## File Reference

| File                                      | Purpose                                           |
| ----------------------------------------- | ------------------------------------------------- |
| `lib/ai/assistant.ts`                     | Chat execution, tool binding, streaming response  |
| `lib/ai/tools.ts`                         | Content mutation tools and Zod schemas            |
| `lib/ai/prompts.ts`                       | System prompt generation with content context     |
| `lib/content/differ.ts`                   | Diff engine (compare old vs. new content)         |
| `lib/content/extractor.ts`                | HTML → WebsiteContent extraction                  |
| `lib/content/preview.ts`                  | HTML preview generation from content changes      |
| `lib/github/operations.ts`                | GitHub API operations (fetch, publish, normalize) |
| `lib/github/client.ts`                    | GitHub API client wrapper                         |
| `lib/storage/sites.ts`                    | Site CRUD and token encryption/decryption         |
| `lib/storage/cache.ts`                    | In-memory draft cache per site                    |
| `lib/config/site-definitions.ts`          | PageDefinition schemas for known site types       |
| `lib/config/page-definition-resolver.ts`  | Resolve PageDefinition for a site config          |
| `lib/utils/auth.ts`                       | Session validation and JWT signing                |
| `lib/utils/trace.ts`                      | Structured logging with trace IDs                 |
| `lib/utils/errors.ts`                     | Error classification and sanitization             |
| `lib/utils/ratelimit.ts`                  | Tier-based rate limiting via Upstash Redis        |
| `lib/actions/chat.ts`                     | Chat Server Actions (validation, draft ops)       |
| `lib/actions/content.ts`                  | Content Server Actions                            |
| `lib/actions/sites.ts`                    | Site Server Actions                               |
| `types/content.ts`                        | Content model (metadata, sections, assets)        |
| `types/content-schema.ts`                 | PageDefinition and schema types                   |
| `types/site.ts`                           | Site configuration interface                      |
| `components/editor/ChatInterface.tsx`     | Main tabbed editor interface                      |
| `components/editor/ContentOverview.tsx`   | Schema-driven content editing component           |
| `components/editor/MessageList.tsx`       | AI chat message display                           |
| `components/editor/MessageInput.tsx`      | Chat input with suggestions                       |
| `app/api/chat/[siteId]/route.ts`          | Chat SSE endpoint                                 |
| `app/api/content/[siteId]/route.ts`       | Content CRUD endpoint                             |
| `app/api/content/[siteId]/extract/route.ts` | HTML re-extraction endpoint                     |
| `__tests__/`                              | Vitest test files                                 |

## Common Issues

### Backend Issues

- **"Site not found"**: Verify siteId in URL; check `data/sites.json` exists
- **NanoGPT timeout**: Check API key, network; increase timeout if needed
- **Tool validation error**: Review Zod schema; ensure params match expected types
- **GitHub 404 on content file**: Confirm htmlFile/contentFile paths are relative to repo root
- **Session expired**: User must re-authenticate; clear cookies and retry
- **Draft disappears**: In-memory cache lost on restart; use persistent storage for production
- **Model not using tools**: Check `toolChoice: "required"` setting; verify system prompt includes tool descriptions
- **Large content truncation**: Consider pagination for 100+ sections to avoid token limits
- **Rate limit exceeded**: Check tier limits; Free tier is 10 chat requests/min

### UI/Editor Issues

- **Tabs not switching**: Check `activeTab` state in ChatInterface; verify conditional rendering logic
- **Schema not applying**: Ensure site has `pageDefinitionId` or `htmlFile` matches a definition's `htmlPath`
- **Metadata fields not grouped**: PageDefinition must specify `group` property in metadata field definitions
- **Chat messages not styled correctly**: Verify message role ("user" vs "assistant") and className conditions
- **Send button wrong color**: Should be `bg-emerald-600`, not brand primary
- **Input focus ring wrong color**: Should use `focus:ring-emerald-100` for consistency

## Testing

- Tests run via `npm run test` (Vitest)
- Test environment: jsdom
- Globals enabled for test utilities
- File pattern: `**/*.test.ts`, `**/*.test.tsx`
- Coverage disabled by default (enable via config if needed)
- Always test tool validation, content mutation, and diff generation
- Tests located in `__tests__/` directory

**Next.js/AI SDK best practices**:

## Architecture & Setup

**1. Use Unified API for Provider Flexibility**
Switch between AI providers by changing a single line of code. The AI SDK standardizes integration across OpenAI, Anthropic, Google, and others.

**2. Separate AI Logic into Server Actions**
Create dedicated action files (e.g., `lib/actions/`) to handle AI model integration. Keep server-side logic isolated from client components.

**3. Use Node.js Runtime When File/Crypto Operations Are Needed**
API routes that use `crypto.randomUUID()` or file-based storage require `runtime = "nodejs"`. Edge Runtime requires migrating to database storage and Web Crypto API.

**4. Choose the Right SDK Component**

- **AI SDK Core**: Generate text, structured objects, tool calls
- **AI SDK UI**: Framework-agnostic hooks (`useChat`, `useCompletion`)
- **AI SDK RSC**: Stream user interfaces directly from server using React Server Components

## Streaming & Response Handling

**5. Implement Proper Streaming**
Use `streamText` for server-side generation and convert responses with `toUIMessageStreamResponse()`.

**6. Handle UI Message Types Correctly**
Messages are `UIMessage` type for application UI (includes metadata), while server expects `ModelMessage[]` without metadata.

**7. Enable Multi-Step Tool Execution**
Use `stopWhen: stepCountIs(N)` to allow models to automatically send tool results back to trigger additional generations.

## Error Handling

**8. Implement Comprehensive Error Boundaries**
Use React Error Boundaries for client errors, wrapping route segments in `error.tsx` files to isolate errors and keep rest of app functional.

**9. Separate Expected vs Unexpected Errors**
Handle expected errors (form validation, failed requests) as return values using `useActionState`, not try/catch blocks.

**10. Sanitize Production Error Messages**
In production, only send generic message and digest hash to client to avoid leaking sensitive information.

**11. Add Error Monitoring**
Integrate tools like Sentry, LogRocket, or New Relic to capture stack traces and user behaviors.

## Security & Rate Limiting

**12. Implement Rate Limiting**
Use Vercel WAF or `@vercel/firewall` to prevent service overload, manage costs, and safeguard against malicious activities.

**13. Apply User-Based Rate Limits**
Rate limit based on authentication context using `rateLimitKey: auth.orgId` to apply different limits per user type.

**14. Validate All User Input**
Check user input for validity to protect against XSS, SQL injection, and file upload attacks.

**15. Secure Environment Variables**
Use secret management tools and scan build artifacts with tools like Trufflehog to prevent environment variable leaks.

## Data Management & Performance

**16. Use React Query or SWR for Data Fetching**
These packages offer default configurations for caching and performance, making application state more maintainable.

**17. Implement Code Splitting**
Split bundles to avoid loading entire app at once, improving performance by loading only needed code fragments.

**18. Extract Reusable Logic into Custom Hooks**
Follow DRY principle by creating custom hooks that encapsulate logic and remove code redundancy.

## Testing & Production

**19. Run in Production Mode**
Always run Next.js in production mode for production workloads, as development mode doesn't optimize for security and performance.

**20. Handle Tool Invocations Properly**
Render different UI components based on tool invocation state: display loading for `input-available`, results for `output-available`.

## Key Takeaway

Focus on: provider flexibility, proper streaming, comprehensive error handling, robust security with rate limiting, and production-ready error monitoring. The AI SDK simplifies LLM integration but requires careful attention to error handling and security practices.
