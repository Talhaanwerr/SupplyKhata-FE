import { API_URL } from "@/constants";
import { ApiError } from "./api-error";
import { tokenManager } from "./token";

export type ExportFormat = "csv" | "json";
export type ExportResource = "users" | "audit-logs";

function buildExportUrl(resource: ExportResource, format: ExportFormat): string {
  return `${API_URL}/export/${resource}?format=${format}`;
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^\";]+)"?/i.exec(header);
  if (!match?.[1]) return fallback;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Authenticated download of a workspace data export (CSV/JSON).
 * Uses the Bearer token — cannot be done with a bare window.location link.
 */
async function downloadExport(
  resource: ExportResource,
  format: ExportFormat = "csv"
): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 10);
  const fallbackName = `${resource}-${stamp}.${format}`;
  const url = buildExportUrl(resource, format);

  const headers: Record<string, string> = {};
  const token = tokenManager.getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    let message = "Export failed";
    try {
      const json = (await res.json()) as { message?: string };
      if (typeof json?.message === "string" && json.message.length < 200) {
        message = json.message;
      }
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(message, res.status);
  }

  const blob = await res.blob();
  const filename = filenameFromDisposition(res.headers.get("Content-Disposition"), fallbackName);
  triggerBrowserDownload(blob, filename);
}

export const exportApi = {
  downloadUsersCsv: () => downloadExport("users", "csv"),
  downloadAuditLogsCsv: () => downloadExport("audit-logs", "csv"),
  downloadUsersJson: () => downloadExport("users", "json"),
  downloadAuditLogsJson: () => downloadExport("audit-logs", "json"),
};
