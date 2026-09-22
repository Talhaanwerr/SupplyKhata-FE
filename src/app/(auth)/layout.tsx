import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="bg-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white">
            <span className="text-lg font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SaaS Boilerplate</h1>
          <p className="mt-1 text-sm text-slate-500">Multi-tenant platform</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
