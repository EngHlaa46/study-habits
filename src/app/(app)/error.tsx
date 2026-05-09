"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground/70 font-mono bg-secondary/50 p-3 rounded-lg break-all">
          {error.message || "Unknown error"}
        </p>
        {error.stack && (
          <pre className="text-xs text-muted-foreground/50 font-mono bg-secondary/30 p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap break-all">
            {error.stack}
          </pre>
        )}
        <button
          onClick={reset}
          className="w-full py-2 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
