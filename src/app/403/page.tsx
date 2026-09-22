import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "403 – Forbidden",
};

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <span className="text-4xl">🔒</span>
      </div>
      <h1 className="text-6xl font-extrabold text-red-500">403</h1>
      <h2 className="mt-4 text-2xl font-semibold text-slate-900">Access Forbidden</h2>
      <p className="mt-3 max-w-sm text-sm text-slate-500">
        You don&apos;t have permission to access this page. Contact your administrator if you
        believe this is a mistake.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="bg-primary hover:bg-primary/90 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Sign in as different user
        </Link>
      </div>
    </div>
  );
}
