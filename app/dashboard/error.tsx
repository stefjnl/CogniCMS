"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Navigation } from "@/components/ui/Navigation";

/**
 * Dashboard Error Boundary
 *
 * Catches errors in dashboard routes without breaking the entire app.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardErrorBoundary]", {
      message: error.message,
      digest: error.digest,
      route: "/dashboard",
    });
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <>
      <Navigation />
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="space-y-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-destructive"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Dashboard Error
            </h1>
            <p className="text-muted-foreground">
              {isDevelopment
                ? error.message
                : "Unable to load dashboard. Please try again."}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => reset()}
              variant="primary"
              className="w-full"
            >
              Reload dashboard
            </Button>
            <Button
              onClick={() => (window.location.href = "/")}
              variant="outline"
              className="w-full"
            >
              Go home
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
    </>
  );
}
