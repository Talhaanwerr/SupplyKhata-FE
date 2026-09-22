"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-2xl">💥</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Critical Error</h1>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            A critical error occurred. Please refresh the page or contact support.
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
