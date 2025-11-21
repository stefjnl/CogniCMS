# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CogniCMS is an AI-assisted content management system for static HTML websites hosted on GitHub Pages. Non-technical editors can describe desired changes in natural language, review a structured preview, and publish updates without touching code.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Vercel AI SDK, NanoGPT (OpenAI-compatible API), Octokit, Vitest

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
- `updateCollectionItem`: Update items in named collections within sections
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

1. Define Zod schema in `lib/ai/tools.ts`
2. Add tool name to `SUPPORTED_TOOL_NAMES` constant
3. Implement case in `executeAction()` switch
4. Add test in schema validation suite
5. Update system prompt in `lib/ai/prompts.ts` to describe the new tool

### Modifying Content Structure

1. Update `types/content.ts` (WebsiteSection, WebsiteContent)
2. Regenerate system prompts if section types/fields changed
3. Update differ in `lib/content/differ.ts` if top-level fields added
4. Update preview component: `components/editor/ChangeCard.tsx`

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

- **Edge Runtime**: Set `export const runtime = 'edge'` for API routes when possible
- **Streaming**: Use `streamText` for server-side generation, `OpenAIStream`, `StreamingTextResponse`
- **Message Types**: `UIMessage` for application UI (includes metadata), `ModelMessage[]` for server (no metadata)
- **Multi-Step Tool Execution**: Use `stopWhen` to allow models to automatically send tool results back
- **Error Boundaries**: Use React Error Boundaries for client errors, wrap routes in `error.tsx`

### Rate Limiting & Security

- Upstash Redis rate limiting configured (`lib/utils/ratelimit.ts`)
- Apply user-based rate limits using `rateLimitKey: auth.orgId`
- Validate all user input to protect against XSS, SQL injection, file upload attacks
- Use secret management tools, scan artifacts with Trufflehog

### Performance

- Implement code splitting to avoid loading entire app at once
- Extract reusable logic into custom hooks (follow DRY principle)
- Always run in production mode for production workloads

## File Reference

| File                             | Purpose                                           |
| -------------------------------- | ------------------------------------------------- |
| `lib/ai/assistant.ts`            | Chat execution, tool binding, streaming response  |
| `lib/ai/tools.ts`                | Content mutation tools and Zod schemas            |
| `lib/ai/prompts.ts`              | System prompt generation with content context     |
| `lib/content/differ.ts`          | Diff engine (compare old vs. new content)         |
| `lib/content/extractor.ts`       | HTML → WebsiteContent extraction                  |
| `lib/github/operations.ts`       | GitHub API operations (fetch, publish, normalize) |
| `lib/storage/sites.ts`           | Site CRUD and token encryption/decryption         |
| `lib/storage/cache.ts`           | In-memory draft cache per site                    |
| `lib/utils/auth.ts`              | Session validation and JWT signing                |
| `lib/utils/trace.ts`             | Structured logging with trace IDs                 |
| `lib/utils/errors.ts`            | Error classification and sanitization             |
| `types/content.ts`               | Content model (metadata, sections, assets)        |
| `types/site.ts`                  | Site configuration interface                      |
| `app/api/chat/[siteId]/route.ts` | Chat SSE endpoint                                 |

## Common Issues

- **"Site not found"**: Verify siteId in URL; check `data/sites.json` exists
- **NanoGPT timeout**: Check API key, network; increase timeout if needed
- **Tool validation error**: Review Zod schema; ensure params match expected types
- **GitHub 404 on content file**: Confirm htmlFile/contentFile paths are relative to repo root
- **Session expired**: User must re-authenticate; clear cookies and retry
- **Draft disappears**: In-memory cache lost on restart; use persistent storage for production
- **Model not using tools**: Check `toolChoice: "required"` setting; verify system prompt includes tool descriptions
- **Large content truncation**: Consider pagination for 100+ sections to avoid token limits

## Testing

- Test environment: jsdom (configured in `vitest.config.ts`)
- Globals enabled for test utilities
- File pattern: `**/*.test.ts`, `**/*.test.tsx`
- Coverage disabled by default (enable via config if needed)
- Always test tool validation, content mutation, and diff generation

**Next.js/AI SDK best practices**:

## Architecture & Setup

**1. Use Unified API for Provider Flexibility**
Switch between AI providers by changing a single line of code. The AI SDK standardizes integration across OpenAI, Anthropic, Google, and others.

**2. Separate AI Logic into Server Actions**
Create dedicated action files (e.g., `lib/actions.js`) to handle AI model integration. Keep server-side logic isolated from client components.

**3. Leverage Edge Runtime When Possible**
Set `export const runtime = 'edge'` for API routes to improve performance.

**4. Choose the Right SDK Component**

- **AI SDK Core**: Generate text, structured objects, tool calls
- **AI SDK UI**: Framework-agnostic hooks (`useChat`, `useCompletion`)
- **AI SDK RSC**: Stream user interfaces directly from server using React Server Components

## Streaming & Response Handling

**5. Implement Proper Streaming**
Use `streamText` for server-side generation and convert responses with `OpenAIStream` and `StreamingTextResponse`.

**6. Handle UI Message Types Correctly**
Messages are `UIMessage` type for application UI (includes metadata), while server expects `ModelMessage[]` without metadata.

**7. Enable Multi-Step Tool Execution**
Use `stopWhen` to allow models to automatically send tool results back to trigger additional generations.

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
