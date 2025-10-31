# CogniCMS

CogniCMS is an AI-assisted content management system for static HTML websites hosted on GitHub Pages. Non-technical editors can describe desired changes in natural language, review a structured preview, and publish updates without touching code.

## Features

- 🔐 Password-protected access with signed sessions
- 🗂️ Multi-site management backed by encrypted GitHub tokens
- 🤖 NanoGPT-driven conversational editing with structured tool outputs
- 🔍 Draft diff previews and optional HTML regeneration
- 🚀 One-click publishing to GitHub with descriptive commit messages
- 🌐 Render-friendly Next.js 14 + React 18 stack with Tailwind CSS UI

## Getting Started

1. Clone the repository and install dependencies:
   ```powershell
   npm install
   ```
2. Copy `.env.local.example` to `.env.local` and provide real values:
   ```text
   CMS_PASSWORD=your-password
   SESSION_SECRET=long-random-string
   SESSION_DURATION=24
   NANOGPT_API_KEY=sk-...
   ```
3. Start the development server:
   ```powershell
   npm run dev
   ```
4. Open `http://localhost:3000`, authenticate with the password, and begin adding sites.

## Core Scripts

- `npm run dev` – start the Next.js dev server
- `npm run build` – create a production build
- `npm run start` – start the production server
- `npm run lint` – run ESLint

## Project Structure

```
app/                # App Router pages & API routes
components/         # UI and domain-specific React components
lib/                # Business logic (AI, GitHub, content, storage, utils)
types/              # Shared TypeScript declarations
data/sites.json     # File-backed site configuration store (encrypted tokens)
```

## Documentation

- `SETUP.md` – local development environment walkthrough
- `USER_GUIDE.md` – operator guide for editors
- `API.md` – HTTP endpoints and payload contracts
- `ARCHITECTURE.md` – system design and future roadmap

## Requirements

- Node.js 18+
- GitHub Personal Access Token with `repo` scope for each site
- NanoGPT API key (see `nanogpt-request-flow.md`)

See the linked docs for deployment instructions (Render.com), testing strategies, and security checklist.
