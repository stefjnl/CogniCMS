# CogniCMS

**AI-Assisted Content Management for GitHub Pages**

CogniCMS is a Next.js-based CMS that enables non-technical editors to manage GitHub Pages sites through natural language conversations. Editors describe desired changes in chat, review visual diffs, and publish directly to GitHub—no HTML or Markdown knowledge required.

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ✨ Features

- **🤖 AI-Powered Editing** – Natural language content updates via NanoGPT streaming API
- **📝 Visual Diff Preview** – Side-by-side comparison of current vs. proposed changes
- **🔐 Secure GitHub Integration** – Encrypted token storage with granular repository access
- **⚡ Real-Time Collaboration** – Server-sent events for responsive chat experience
- **🎨 Structured Content Model** – Section-based editing (hero, content, lists, contact forms)
- **✅ Validation & Warnings** – Accessibility checks, broken link detection, content validation
- **📦 Zero Database** – File-backed storage with optional database provider support
- **🚀 One-Click Publishing** – Direct commits to GitHub with descriptive messages
- **🎯 Multi-Site Management** – Manage multiple GitHub Pages sites from one dashboard

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18.17+** (LTS recommended)
- **npm 9+**
- **NanoGPT API key** – [Sign up here](https://nano-gpt.com)
- **GitHub Personal Access Token** with `repo` scope

### Installation

```powershell
# Clone the repository
git clone https://github.com/stefjnl/CogniCMS.git
cd CogniCMS

# Install dependencies
npm install

# Configure environment variables
Copy-Item .env.local.example .env.local
# Edit .env.local with your credentials

# Start development server
npm run dev
```

Visit `http://localhost:3000` and log in with your configured password.

---

## 🔧 Configuration

### Environment Variables

Create `.env.local` with the following keys:

| Variable           | Purpose                                      | Required |
| ------------------ | -------------------------------------------- | :------: |
| `CMS_PASSWORD`     | Password for editor authentication           |    ✅    |
| `SESSION_SECRET`   | 32+ byte random string for JWT signing       |    ✅    |
| `SESSION_DURATION` | Session lifetime in hours (default: `24`)    |    ⚠️    |
| `NANOGPT_API_KEY`  | Auth token for NanoGPT streaming completions |    ✅    |
| `NANOGPT_BASE_URL` | Override NanoGPT host (optional)             |    ❌    |

**Example `.env.local`:**

```env
CMS_PASSWORD=your-secure-password
SESSION_SECRET=a-long-random-string-min-32-chars
SESSION_DURATION=24
NANOGPT_API_KEY=your-nanogpt-api-key
```

### Adding a GitHub Pages Site

1. Navigate to the **Dashboard**
2. Click **Add Site**
3. Provide:
   - **Display Name** – Friendly site name
   - **Site URL** – Public URL (e.g., `https://username.github.io`)
   - **GitHub Owner** – Repository owner username/org
   - **GitHub Repo** – Repository name
   - **Branch** – Target branch (usually `main`)
   - **GitHub Token** – Personal access token with `repo` scope
   - **Content File** – Path to `content.json` (e.g., `content.json`)
   - **HTML File** – Path to output HTML (e.g., `index.html`)
4. **Save** – Token is encrypted and stored securely

---

## 📖 Usage

### For Editors

1. **Sign In** – Use the shared password to access the dashboard
2. **Select a Site** – Click a site card to open the editor
3. **Describe Changes** – Chat with the AI assistant using natural language:
   - _"Update the hero headline to promote the summer sale"_
   - _"Add a new team member to the About section"_
   - _"Change the contact email address"_
4. **Review Preview** – Inspect the visual diff and validation warnings
5. **Publish** – Click **Publish Draft** to commit changes to GitHub

### Example Conversation

```
Editor: Update the hero section headline to "Welcome to Our New Product Launch"
```
