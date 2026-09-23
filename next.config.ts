import type { NextConfig } from "next";
import path from "path";

/**
 * Production security headers for the App Router.
 * CSP is intentionally moderate so Next.js inline scripts/styles still work;
 * tighten further per-deployment (nonce-based CSP) when ready.
 */
const isProd = process.env.NODE_ENV === "production";

/** CSP connect-src needs an origin (scheme + host + port), not a path like /api/v1. */
function apiConnectOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) {
    throw new Error(
      "Missing required environment variable NEXT_PUBLIC_API_URL. Set it in .env.local or deployment env."
    );
  }
  try {
    return new URL(raw).origin;
  } catch {
    throw new Error(
      `NEXT_PUBLIC_API_URL is invalid: "${raw}". Use a full URL such as https://api.example.com/api/v1`
    );
  }
}

/**
 * Real Nest API origin (Railway). Used for rewrites + CSP when the browser
 * calls the FE origin (`NEXT_PUBLIC_API_URL` = https://fe.vercel.app/api/v1)
 * so refresh cookies stay first-party.
 */
function backendOrigin(): string | null {
  const raw = process.env.API_BACKEND_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    throw new Error(
      `API_BACKEND_URL is invalid: "${raw}". Use origin only, e.g. https://xxx.up.railway.app`
    );
  }
}

const beOrigin = backendOrigin();
const feApiOrigin = apiConnectOrigin();
const connectExtra = [feApiOrigin, beOrigin].filter(Boolean).join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `img-src 'self' data: blob: https: ${connectExtra}`,
  "font-src 'self' data:",
  // Next.js requires unsafe-inline for some styles in App Router; avoid unsafe-eval in prod
  isProd ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${connectExtra}${isProd ? "" : " ws: wss:"}`,
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Required for Docker standalone builds — emits a minimal server.js with
  // only the files needed at runtime (no node_modules copy required).
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  /**
   * Same-origin API proxy: browser → /api/v1/* on Vercel → Railway Nest.
   * Makes the httpOnly refresh cookie first-party (fixes cross-site logout).
   * Set API_BACKEND_URL on Vercel; leave unset for local (call BE directly).
   */
  async rewrites() {
    if (!beOrigin) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${beOrigin}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
