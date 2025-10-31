# CogniCMS Architecture

CogniCMS combines a modern Next.js 14 frontend with secure server-side workflows to manage AI-assisted static site updates.

## High-Level Overview

```
Editor UI (Next.js App Router)
│
├── API Routes (Edge-friendly handlers)
│   ├── Auth (password -> session cookie)
│   ├── Sites (CRUD, encrypted tokens)
│   ├── Content (draft cache, extraction)
│   ├── Chat (SSE stream from NanoGPT)
│   └── Publish (GitHub commits)
│
├── Business Logic (`lib/*`)
│   ├── AI orchestrator (tool planner, streaming parser)
│   ├── GitHub client (Octokit wrapper, AES token vault)
│   ├── Content pipeline (extract/generate/diff/validate)
│   └── Utilities (auth, trace, validation)
│
└── Persistence
    ├── File-backed site registry (`data/sites.json`)
    └── In-memory draft cache (per-site)
```

## Key Components

### Frontend (App Router)

- React 18 + Server Components with client islands for interactive workflows.
- Tailwind CSS for styling; headless UI primitives created in `components/ui`.
- `app/editor/[siteId]` hosts chat + preview. Uses EventSource to stream assistant responses and merges results into state.

### Authentication

- Single shared password verified against `CMS_PASSWORD` env var.
- Sessions stored as signed JWT cookies via `createSessionResponse`.
- Middleware (`middleware.ts`) protects dashboard/editor routes.

### AI Pipeline

1. **Chat request** reaches `/api/chat/{siteId}`.
2. `executeChat` coordinates NanoGPT streaming using `lib/ai/assistant.ts`.
3. Tool invocations (extract HTML, validate, regenerate copy) run via adapters in `lib/ai/tools.ts`.
4. Stream transformer (`lib/ai/streaming.ts`) converts upstream SSE into structured events.
5. Frontend reduces events into draft content, warnings, commit summary.

### Content Processing

- `extractor.ts` uses JSDOM to convert HTML into structured `WebsiteContent`.
- `generator.ts` merges AI output with base HTML to ensure deterministic sections.
- `validator.ts` checks accessibility, link integrity, metadata completeness.
- `differ.ts` produces human-readable diffs for UI preview and commit summaries.

### GitHub Integration

- Personal tokens encrypted with AES-GCM (key derived from `SESSION_SECRET`).
- `lib/github/operations.ts` wraps Octokit for content fetches and commits.
- Publish flow writes both the JSON content model and rendered HTML to the repository.

### Storage

- Site registry stored in `data/sites.json` using `SiteStorage` interface.
- Draft content cached in-memory (`lib/storage/cache.ts`). Swap implementation if multi-instance scaling is required.

## Security Considerations

- Password-only access keeps surface minimal (expandable to OTP or SSO).
- Tokens never leave the server; encrypted at rest, decrypted per request.
- `HttpOnly`, `Secure`, `SameSite=Lax` cookies mitigate session theft.
- Validation pipeline guards against unsafe HTML mutations and broken assets.

## Deployment

- Designed for Render.com web services.
- Stateless servers require shared storage for sites file if multiple instances run; recommended to replace file storage with Postgres or Redis in that scenario.

## Observability

- `lib/utils/trace.ts` provides structured logging helpers with trace IDs.
- Chat endpoint seeds `traceId`, `conversationId`, and `messageId` for correlating logs.

## Extensibility Roadmap

- **Multi-user auth:** integrate email-based magic links or OAuth.
- **Real-time collaboration:** store drafts in Redis to share across editors.
- **Analytics integration:** attach Lighthouse or Web Vitals post-publish checks.
- **Testing harness:** automate validator regression via Playwright snapshots.

For endpoint specifics, see `API.md`. Deployment and local setup details live in `SETUP.md`.
