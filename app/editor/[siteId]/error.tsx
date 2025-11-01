"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/Button";

/**
 * Editor Error Boundary
 *
 * Catches errors in the editor without breaking navigation.
 * Provides context-specific recovery options.
 */
export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const route = window.location.pathname;
    const isSiteLoadError =
      error.message?.includes("not found") ||
      error.message?.includes("Site configuration");

    console.error("[EditorErrorBoundary]", {
      message: error.message,
      digest: error.digest,
      route,
      isSiteLoadError,
    });

    // Send to Sentry with editor context
    Sentry.captureException(error, {
      level: isSiteLoadError ? "warning" : "error",
      tags: {
        boundary: "editor",
        route,
        digest: error.digest || "unknown",
        errorType: isSiteLoadError ? "site_not_found" : "editor_error",
      },
      contexts: {
        errorBoundary: {
          componentStack: "Editor route",
          siteLoadError: isSiteLoadError,
        },
      },
    });
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === "development";

  // Check if this is a site loading error
  const isSiteLoadError =
    error.message?.includes("not found") ||
    error.message?.includes("Site configuration");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="space-y-2">
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-destructive"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            {isSiteLoadError ? "Site Not Found" : "Editor Error"}
          </h1>

          <p className="text-muted-foreground">
            {isDevelopment
              ? error.message
              : isSiteLoadError
              ? "The site you're trying to edit could not be found or loaded."
              : "Unable to load the editor. Please try again."}
          </p>

          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {!isSiteLoadError && (
            <Button
              onClick={() => reset()}
              variant="primary"
              className="w-full"
            >
              Retry loading editor
            </Button>
          )}

          <Button
            onClick={() => router.push("/dashboard")}
            variant={isSiteLoadError ? "primary" : "outline"}
            className="w-full"
          >
            Back to dashboard
          </Button>

          <Button
            onClick={() => router.push("/")}
            variant="ghost"
            className="w-full"
          >
            Go to home page
          </Button>
        </div>

        {isDevelopment && error.stack && (
          <details className="mt-6 rounded-lg border border-border bg-muted p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium">
              Stack trace
            </summary>
            <pre className="mt-2 overflow-auto text-xs whitespace-pre-wrap">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
