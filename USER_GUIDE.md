# CogniCMS User Guide

This guide describes how non-technical editors can manage sites, collaborate with the AI assistant, and publish updates safely.

## 1. Sign In

1. Visit your CogniCMS deployment URL.
2. Enter the shared password (communicated by your admin).
3. Sessions last the configured number of hours; log out by closing the browser or selecting **Sign Out** in the top-right menu.

## 2. Dashboard Overview

- **Sites List** – Shows every configured site and latest publish status.
- **Add Site** – Launches a modal to register a new GitHub Pages repository.
- **Recent Activity** – Displays completed publishes with timestamps and commit links.

### Add a Site

1. Click **Add Site**.
2. Provide:
   - Display name
   - Public site URL (e.g., `https://example.github.io`)
   - GitHub repository (`owner/name`)
   - Default branch (usually `main`)
   - Encrypted GitHub token (PAT with `repo` scope)
3. Save. The token stores encrypted locally on the server.

## 3. Launch the Editor

- Select a site from the dashboard.
- The editor page loads with:
  - **Chat panel** (left): conversational requests
  - **Diff preview** (right): rendered HTML comparison
  - **Context tabs**: base HTML, generated draft, commit summary

## 4. Collaborate With the Assistant

1. Describe desired changes (“Update the hero headline to promote the summer sale.”).
2. The assistant:
   - Fetches current HTML from GitHub Pages
   - Generates updated HTML using NanoGPT
   - Runs validation and shows warnings (missing alt text, broken links, etc.)
3. Review assistant messages for notes or action items.

### Iterating

- Send follow-up instructions to refine the draft.
- Use **Regenerate** to request fresh AI output from the same instruction.
- Use **Reset Draft** to return to the original HTML.

## 5. Review the Preview

- **Visual diff** highlights inserted/removed HTML segments.
- **Warnings** flag potential issues (accessibility, broken anchors).
- **Commit summary** outlines proposed GitHub commit notes.

## 6. Approve & Publish

1. Click **Publish Draft**.
2. Confirm the summary and target branch.
3. The system commits the generated HTML to the configured repository using the stored token.
4. Success message includes the GitHub commit link.

If publishing fails (e.g., token expired), the error banner explains the cause. Fix the configuration or retry after addressing the issue.

## 7. Managing Drafts

- Drafts persist per site until published or reset.
- Leaving the page retains the latest draft for the next session.
- Publishing clears the stored draft.

## 8. Logging Out

- Sessions expire automatically.
- To force logout, use the profile menu → **Sign Out**.

## 9. Tips

- Be explicit: mention sections, headings, or text to change.
- Provide sample copy to reduce AI iterations.
- Review warnings carefully before publishing to avoid broken content.

For advanced troubleshooting or system configuration, refer to `SETUP.md` (administrators) and `ARCHITECTURE.md`.
