# CogniCMS - Functionality Inventory

This document provides a comprehensive inventory of all functionalities available in CogniCMS.

---

## 1. Authentication & Session Management

| Feature | Description | Location |
|---------|-------------|----------|
| Password-based authentication | Single shared password login system | `app/api/auth/`, `lib/utils/auth.ts` |
| JWT session tokens | Signed JWT stored in HttpOnly cookies (`cognicms_session`) | `lib/utils/auth.ts` |
| Session validation | Automatic session validation via `requireSession()` | `lib/utils/auth.ts` |
| Configurable session duration | Via `SESSION_DURATION` env var (default 24h) | `lib/utils/auth.ts` |
| User tiers | Support for free/pro/enterprise tiers with different rate limits | `lib/utils/auth.ts` |

---

## 2. Site Management

| Feature | Description | Location |
|---------|-------------|----------|
| Create sites | Add new site configurations | `POST /api/sites`, `lib/storage/sites.ts` |
| List sites | View all configured sites | `GET /api/sites`, `lib/storage/sites.ts` |
| Update sites | Modify site configurations | `PATCH /api/sites/{siteId}` |
| Delete sites | Remove sites and cached drafts | `DELETE /api/sites/{siteId}` |
| Multi-site support | Manage multiple GitHub Pages sites | `data/sites.json` |
| Encrypted token storage | GitHub tokens encrypted at rest using AES-256-GCM | `lib/utils/crypto.ts` |

---

## 3. Content Editing

| Feature | Description | Location |
|---------|-------------|----------|
| Schema-driven content model | `PageDefinition` system for typed content schemas | `types/content-schema.ts`, `lib/config/site-definitions.ts` |
| Section types | hero, content, list, contact, navigation, footer, article, sidebar, main, orphan, custom | `types/content.ts` |
| Inline editing | Direct field editing within content overview | `components/editor/InlineEditor.tsx` |
| Modal editing | Full-screen editing for complex fields | `components/editor/ModalEditor.tsx` |
| List item management | Add/edit/remove items in list sections | `components/editor/ListItemEditor.tsx` |
| Field type support | text, longtext, email, url, date, time, number fields | `types/content.ts` |
| Content overview panel | Expandable sections showing current content | `components/editor/ContentOverview.tsx` |

---

## 4. AI-Powered Content Assistance

| Feature | Description | Location |
|---------|-------------|----------|
| Natural language editing | Describe changes in plain English | `lib/ai/assistant.ts`, `app/api/chat/` |
| NanoGPT integration | OpenAI-compatible API with configurable models | `lib/ai/assistant.ts`, `lib/ai/nanogpt.ts` |
| Structured tool calling | AI generates tool calls for content mutations | `lib/ai/tools.ts` |
| Multi-step execution | Up to 5 tool execution steps per request | `lib/ai/assistant.ts` |
| Smart suggestions | Pre-built prompt suggestions for common tasks | `components/editor/SmartSuggestions.tsx` |
| Streaming responses | Real-time AI response streaming via SSE | `lib/ai/streaming.ts` |

### AI Tools Available

| Tool | Description |
|------|-------------|
| `updateSectionText` | Update text fields in section content |
| `updateMetadata` | Update title, description, lastModified |
| `updateListItem` | Modify existing list items |
| `addListItem` | Add new items to lists (start/end) |
| `removeListItem` | Delete items from lists |
| `batchUpdate` | Atomic multi-action changes |
| `updateNextEvent` | Update next event date (Dutch NL focused) |

---

## 5. Content Extraction & Generation

| Feature | Description | Location |
|---------|-------------|----------|
| HTML to WebsiteContent extraction | Parse HTML into structured JSON | `lib/content/extractor.ts` |
| Schema-driven extraction | Use PageDefinition for deterministic extraction | `lib/content/extractor.ts` |
| Heuristic extraction | Multi-pass fallback for unknown HTML structures | `lib/content/extractor.ts` |
| Semantic element extraction | Extract `<header>`, `<nav>`, `<main>`, `<footer>`, etc. | `lib/content/semantic-extractor.ts` |
| Orphan content capture | Capture content outside structured sections | `lib/content/orphan-extractor.ts` |
| HTML generation | Generate HTML from WebsiteContent | `lib/content/generator.ts` |
| CSS selector tracking | Track element positions for updates | `lib/content/extraction-utils.ts` |

---

## 6. Diff & Preview System

| Feature | Description | Location |
|---------|-------------|----------|
| Content diffing | Compare old vs new content | `lib/content/differ.ts` |
| Visual diff preview | Side-by-side change comparison | `components/editor/PreviewPanel.tsx` |
| Change cards | Individual change visualization | `components/editor/ChangeCard.tsx` |
| Live HTML preview | iframe-based site preview | `components/editor/SitePreview.tsx` |
| Discard individual changes | Remove specific changes before publish | `components/editor/PreviewPanel.tsx` |
| Commit message generation | Auto-generated descriptive commit messages | `lib/utils/commit.ts` |

---

## 7. GitHub Integration

| Feature | Description | Location |
|---------|-------------|----------|
| File content fetching | Read files from GitHub repos | `lib/github/operations.ts` |
| URL normalization | Handle various GitHub URL formats | `lib/github/operations.ts` |
| Permission validation | Verify token has required scopes | `lib/github/operations.ts` |
| Multi-file publishing | Commit JSON + HTML together | `lib/github/operations.ts` |
| Branch support | Publish to configurable branches | `lib/github/operations.ts` |
| Retry logic | Automatic retry for transient failures | `lib/utils/retry.ts` |
| Local dev mode | Load from `examples/` folder in development | `lib/github/operations.ts` |

---

## 8. Publishing Workflow

| Feature | Description | Location |
|---------|-------------|----------|
| One-click publish | Commit approved draft to GitHub | `POST /api/publish/{siteId}` |
| Draft persistence | In-memory draft cache per site | `lib/storage/cache.ts` |
| HTML regeneration | Auto-generate HTML from content changes | `lib/content/generator.ts` |
| Publish status tracking | Loading, success, error states | `components/editor/PublishingStatus.tsx` |
| Approval workflow | Review and approve before publish | `components/editor/ApprovalButtons.tsx` |

---

## 9. Editor UI Features

| Feature | Description | Location |
|---------|-------------|----------|
| Tabbed interface | Metadata, Sections, AI Chat tabs | `components/editor/ChatInterface.tsx` |
| Resizable sidebar | Drag to resize content panel | `components/editor/ChatInterface.tsx` |
| Message list | Chat history with user/AI bubbles | `components/editor/MessageList.tsx` |
| Message input | Chat input with keyboard shortcuts | `components/editor/MessageInput.tsx` |
| Site header | Site info and navigation | `components/editor/SiteHeader.tsx` |
| Status bar | GitHub connection, AI model, unpublished changes | `components/ui/StatusBar.tsx` |
| Keyboard shortcuts | Editor hotkeys support | `lib/utils/keyboard.ts` |

---

## 10. Security Features

| Feature | Description | Location |
|---------|-------------|----------|
| AES-256-GCM encryption | Encrypt GitHub tokens at rest | `lib/utils/crypto.ts` |
| HttpOnly cookies | Secure session storage | `lib/utils/auth.ts` |
| Input validation | Zod schemas for all inputs | `lib/utils/validation.ts` |
| Rate limiting | Tier-based request limits via Upstash Redis | `lib/utils/ratelimit.ts` |
| Session expiration | Configurable session duration | `lib/utils/auth.ts` |

### Rate Limits (Free Tier)

| Endpoint | Limit |
|----------|-------|
| Chat API | 10 requests/min |
| Publish API | 5 requests/min |
| Content Extract | 20 requests/min |
| Sites API | 30 requests/min |
| Default | 60 requests/min |

---

## 11. Error Handling & Monitoring

| Feature | Description | Location |
|---------|-------------|----------|
| Sentry integration | Error tracking and session replay | `sentry.*.config.ts`, `lib/utils/sentry.ts` |
| Error boundaries | Graceful error UI with recovery | `app/error.tsx` |
| Structured logging | Trace IDs for debugging | `lib/utils/trace.ts` |
| Error classification | Expected vs unexpected errors | `lib/utils/errors.ts` |
| Custom error types | AppError, AuthError, NotFoundError, ConflictError | `lib/utils/errors.ts` |

---

## 12. UI Components Library

| Component | Purpose |
|-----------|---------|
| `Button` | Action buttons with variants |
| `Card` | Content containers |
| `Dialog` | Modal dialogs |
| `Input` | Form text inputs |
| `Textarea` | Multi-line text inputs |
| `Label` | Form labels |
| `Badge` | Status indicators |
| `Modal` | Modal overlays |
| `Toast` | Notification messages |
| `LoadingSpinner` | Loading indicators |
| `Skeleton` | Loading placeholders |
| `EmptyState` | Empty content placeholders |
| `Navigation` | App navigation |
| `ThemeToggle` | Dark/light mode toggle |

---

## 13. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth` | POST | Authenticate user |
| `/api/auth` | DELETE | Destroy session |
| `/api/sites` | GET | List all sites |
| `/api/sites` | POST | Create site |
| `/api/sites/{siteId}` | GET | Get site config |
| `/api/sites/{siteId}` | PATCH | Update site |
| `/api/sites/{siteId}` | DELETE | Delete site |
| `/api/content/{siteId}` | GET | Get draft/content |
| `/api/content/{siteId}` | PUT | Save draft |
| `/api/content/{siteId}/extract` | POST | Re-extract from HTML |
| `/api/chat/{siteId}` | POST | AI chat (SSE stream) |
| `/api/publish/{siteId}` | POST | Publish to GitHub |
| `/api/preview/{siteId}` | POST | Generate preview HTML |

---

## 14. Configuration & Environment

| Variable | Purpose |
|----------|---------|
| `CMS_PASSWORD` | Shared authentication password |
| `SESSION_SECRET` | JWT signing key + encryption key |
| `SESSION_DURATION` | Session lifetime in hours |
| `NANOGPT_API_KEY` | AI API key |
| `NANOGPT_BASE_URL` | AI API endpoint |
| `NANOGPT_MODEL` | AI model identifier |
| `UPSTASH_REDIS_REST_URL` | Redis for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth token |
| `SENTRY_DSN` | Error monitoring DSN |

---

## Tech Stack Summary

- **Framework:** Next.js 16.0.1 with App Router
- **UI:** React 18.2, Tailwind CSS
- **AI:** Vercel AI SDK v5, NanoGPT (OpenAI-compatible)
- **GitHub:** Octokit
- **Validation:** Zod
- **Testing:** Vitest
- **Error Monitoring:** Sentry
- **Rate Limiting:** Upstash Redis

---

*Last updated: December 2025*
