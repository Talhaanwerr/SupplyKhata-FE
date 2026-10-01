import Link from "next/link";

/**
 * Offline fallback for the PWA service worker (app shell only).
 * No fake business data — reconnect required for API use.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="bg-primary mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white">
        SK
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-600">
        Reconnect to the internet to use SupplyKhata. Deliveries, orders, and khata need a live
        connection.
      </p>
      <Link
        href="/"
        className="bg-primary mt-8 inline-flex rounded-lg px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        Try again
      </Link>
    </main>
  );
}
