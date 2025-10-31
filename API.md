# CogniCMS API Reference

All HTTP endpoints require an authenticated session cookie unless stated otherwise. Responses use JSON unless a streaming payload is noted. Errors follow the shape `{ error: string }` with an appropriate HTTP status code.

Base URL (development): `http://localhost:3000/api`

## Authentication

### `POST /auth`

- **Purpose:** Authenticate a user using the shared password.
- **Request body:** `{ "password": "string" }`
- **Responses:**
  - `200` – Sets `cogni_session` HttpOnly cookie.
  - `400` – Missing password.
  - `401` – Invalid password.

### `DELETE /auth`

- **Purpose:** Destroy the session cookie.
- **Responses:**
  - `200` – Session cleared.

---

## Sites

### `GET /sites`

- **Purpose:** List configured sites.
- **Response:** `{ "sites": SiteConfig[] }`
- **Notes:** Requires auth.

### `POST /sites`

- **Purpose:** Create or update a site record.
- **Request body:**
  ```json
  {
    "name": "Marketing Site",
    "url": "https://example.github.io",
    "repoOwner": "org",
    "repoName": "marketing",
    "branch": "main",
    "htmlFile": "index.html",
    "contentFile": "content.json",
    "githubToken": "ghp_..." // encrypted at rest
  }
  ```
- **Response:** `201 { "site": SiteConfig }`

### `GET /sites/{siteId}`

- **Purpose:** Fetch a single site configuration.
- **Response:** `{ "site": SiteConfig }`

### `PATCH /sites/{siteId}`

- **Purpose:** Partially update a site configuration.
- **Request body:** Any subset of the site schema.
- **Response:** `{ "site": SiteConfig }`

### `DELETE /sites/{siteId}`

- **Purpose:** Remove a site and its cached drafts.
- **Response:** `{ "success": true }`

---

## Content Drafts

### `GET /content/{siteId}`

- **Purpose:** Retrieve the current draft. Falls back to the committed JSON content if no draft exists.
- **Response:**
  ```json
  {
    "content": WebsiteContent,
    "draft": true | false
  }
  ```

### `PUT /content/{siteId}`

- **Purpose:** Persist a new draft payload.
- **Request body:** `WebsiteContent`
- **Response:** `{ "success": true }`

### `POST /content/{siteId}/extract`

- **Purpose:** Generate `WebsiteContent` from the published HTML (`htmlFile`).
- **Response:** `{ "content": WebsiteContent }`

---

## Chat & AI Assistant

### `POST /chat/{siteId}`

- **Purpose:** Start or continue a conversational editing session.
- **Request body:**
  ```json
  {
    "messages": [
      { "role": "user", "content": "Update hero headline" }
    ],
    "tools": [ ... ],
    "draft": WebsiteContent | null
  }
  ```
- **Response:** `text/event-stream`
  - Events (`data:`) contain JSON objects with incremental assistant tool calls, content diffs, warnings, and final message text.
  - On completion an event of type `done` closes the stream.

---

## Publishing

### `POST /publish/{siteId}`

- **Purpose:** Commit the approved draft to GitHub.
- **Request body:**
  ```json
  {
    "content": WebsiteContent,
    "html": "<optional fresh HTML>",
    "commitMessage": "feat: refresh hero copy"
  }
  ```
- **Behavior:**
  1. Validates session and site config.
  2. Regenerates HTML when `html` omitted using `generateHtmlFromContent`.
  3. Commits both JSON and HTML files via the site's encrypted GitHub token.
  4. Clears draft cache on success.
- **Response:**
  ```json
  {
    "sha": "commit-sha",
    "url": "https://github.com/org/repo/commit/...",
    "diff": DiffEntry[]
  }
  ```

---

## Data Contracts

- `SiteConfig` – see `types/site.ts`.
- `WebsiteContent` – structured page representation (sections, metadata, assets).
- `DiffEntry` – produced by `diffWebsiteContent`; indicates additions/removals/warnings.

All endpoints enforce authenticated sessions via `requireSession`. Invalid or expired sessions return HTTP 401 with `{ error: "Unauthorized" }`.
