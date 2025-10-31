# CogniCMS Setup Guide

This guide walks through configuring a local development environment and preparing CogniCMS for deployment on Render.com.

## Prerequisites

- **Node.js 18.17+** (LTS recommended)
- **npm 9+**
- **Git** (for cloning/publishing)
- **NanoGPT API key** (streaming chat completions)
- **GitHub personal access tokens** (per managed site; `repo` scope)

## 1. Clone & Install

```powershell
cd c:\git
git clone <repo-url> CogniCMS
cd CogniCMS
npm install
```

## 2. Environment Variables

Copy and edit the environment template.

```powershell
Copy-Item .env.local.example .env.local
```

Populate the following keys:

| Variable           | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `CMS_PASSWORD`     | Password used by editors to authenticate     |
| `SESSION_SECRET`   | 32+ byte random string for JWT signing       |
| `SESSION_DURATION` | Session lifetime in hours (default `24`)     |
| `NANOGPT_API_KEY`  | Auth token for NanoGPT streaming completions |
| `NANOGPT_BASE_URL` | _(Optional)_ Override NanoGPT host           |

> **Note:** GitHub tokens are encrypted per-site and stored via the runtime storage provider (`lib/storage/sites.ts`).

## 3. Development Workflow

Start the dev server:

```powershell
npm run dev
```

- Visit `http://localhost:3000`
- Log in with `CMS_PASSWORD`
- Add GitHub-backed sites via the dashboard
- Chat with the editor UI to propose content changes

Run linting:

```powershell
npm run lint
```

Type-check (Next.js handles with `next build`):

```powershell
npm run build
```

## 4. Render Deployment

1. Push the repository to GitHub.
2. Create a new Render Web Service.
3. Select the repository and branch.
4. Set build command to `npm install && npm run build`.
5. Set start command to `npm run start`.
6. Configure environment variables (same as `.env.local`).
7. Provision persistent storage if you prefer file-backed `data/sites.json`, or swap `SiteStorage` to a database provider.

## 5. Post-Deployment Checks

- Validate password login and session persistence.
- Attempt a NanoGPT chat to ensure SSE streaming works through your domain.
- Publish a test change to confirm GitHub integration (requires site token).
- Monitor logs for `error` level entries (structured logging via `lib/utils/trace`).

## 6. Troubleshooting

| Issue                        | Resolution                                                |
| ---------------------------- | --------------------------------------------------------- |
| `Cannot find module 'react'` | Ensure `npm install` completed successfully               |
| 401 on API routes            | Check `CMS_PASSWORD` and session cookie domain            |
| NanoGPT request fails        | Verify API key and network access to NanoGPT host         |
| GitHub publish errors        | Confirm token scopes; check repository branch permissions |

For additional context on architecture or API contracts, see `ARCHITECTURE.md` and `API.md`.
