import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <h1 className="text-6xl font-extrabold text-slate-300">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-slate-900">Page not found</h2>
      <p className="mt-3 text-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="bg-primary hover:bg-primary/90 mt-8 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
