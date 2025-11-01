"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/Button";

/**
 * Root Error Boundary
 *
 * Catches all unhandled errors in the application.
 * Provides graceful error UI and automatic error reporting.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to Sentry
    console.error("[RootErrorBoundary]", {
      message: error.message,
      digest: error.digest,
      name: error.name,
    });

    // Send to Sentry with additional context
    Sentry.captureException(error, {
      level: "error",
      tags: {
        boundary: "root",
        digest: error.digest || "unknown",
      },
      contexts: {
        errorBoundary: {
          componentStack: "Root application boundary",
        },
      },
    });
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            {isDevelopment
              ? error.message
              : "We encountered an unexpected error. Please try again."}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={() => reset()} variant="primary" className="w-full">
            Try again
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
            className="w-full"
          >
            Go to home page
          </Button>
        </div>

        {isDevelopment && error.stack && (
          <details className="mt-6 rounded-lg border border-border bg-muted p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium">
              Error details (dev only)
            </summary>
            <pre className="mt-2 overflow-auto text-xs">{error.stack}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
