import { redirect } from "next/navigation";
import { PasswordLogin } from "@/components/auth/PasswordLogin";
import { getSession } from "@/lib/utils/auth";
import Link from "next/link";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <span className="text-7xl">🧠</span>
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Edit Your GitHub Pages Site
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Through Conversation
            </span>
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-xl text-slate-600">
            CogniCMS is an AI-powered CMS that lets non-technical editors update
            websites using natural language. Chat with your content, review
            changes, and publish to GitHub—no coding required.
          </p>

          {/* 3-Step Process */}
          <div className="mx-auto mb-16 grid max-w-4xl gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <div className="mb-4 text-4xl">🔗</div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                1. Connect
              </h3>
              <p className="text-sm text-slate-600">
                Link your GitHub Pages repository in seconds
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <div className="mb-4 text-4xl">💬</div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                2. Chat
              </h3>
              <p className="text-sm text-slate-600">
                Describe changes in plain English—AI does the rest
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <div className="mb-4 text-4xl">🚀</div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                3. Publish
              </h3>
              <p className="text-sm text-slate-600">
                Review, approve, and deploy changes with one click
              </p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="mx-auto mb-20 max-w-md">
          <PasswordLogin />
        </div>

        {/* Features Grid */}
        <div className="mx-auto mb-20 max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
            Powerful Features for Content Teams
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-3 text-3xl">🤖</div>
              <h3 className="mb-2 text-lg font-semibold">AI-Powered Editing</h3>
              <p className="text-sm text-slate-600">
                Natural language understanding powered by cutting-edge AI models
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-3 text-3xl">👁️</div>
              <h3 className="mb-2 text-lg font-semibold">Live Preview</h3>
              <p className="text-sm text-slate-600">
                See changes instantly before publishing to production
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-3 text-3xl">📊</div>
              <h3 className="mb-2 text-lg font-semibold">Smart Diffs</h3>
              <p className="text-sm text-slate-600">
                Review exactly what changed with side-by-side comparisons
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-3 text-3xl">🔒</div>
              <h3 className="mb-2 text-lg font-semibold">Secure by Design</h3>
              <p className="text-sm text-slate-600">
                Encrypted tokens, session management, and audit trails
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-3 text-3xl">⚡</div>
              <h3 className="mb-2 text-lg font-semibold">Lightning Fast</h3>
              <p className="text-sm text-slate-600">
                Optimistic UI and real-time streaming for instant feedback
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-3 text-3xl">🔄</div>
              <h3 className="mb-2 text-lg font-semibold">Version Control</h3>
              <p className="text-sm text-slate-600">
                Full Git integration with commit history and rollback support
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-600 sm:px-6 lg:px-8">
          <p>© 2025 CogniCMS. Powered by AI for GitHub Pages.</p>
        </div>
      </footer>
    </div>
  );
}
