import { API_URL } from "@/constants";

/**
 * Turn API-relative media paths into absolute URLs the browser can load.
 * Avatars are served from the Nest API host, not the Next.js origin.
 */
export function resolveAssetUrl(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const raw = url.trim();

  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }

  let apiOrigin: string;
  try {
    apiOrigin = new URL(API_URL).origin;
  } catch {
    throw new Error(
      "NEXT_PUBLIC_API_URL is invalid. Set a full API URL such as https://api.example.com/api/v1"
    );
  }

  if (raw.startsWith("/api/")) {
    return `${apiOrigin}${raw}`;
  }

  // Legacy: `/files/download?path=...` (missing /api/v1 prefix)
  if (raw.startsWith("/files/")) {
    return `${apiOrigin}/api/v1${raw}`;
  }

  if (raw.startsWith("/")) {
    return `${apiOrigin}${raw}`;
  }

  return raw;
}
