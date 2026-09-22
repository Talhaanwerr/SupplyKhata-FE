import { API_URL, ROUTES } from "@/constants";
import { ApiError } from "./api-error";
import { tokenManager } from "./token";
import type { ApiResponse, PaginatedResponse } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions extends Omit<RequestInit, "method" | "body"> {
  params?: Record<string, string | number | boolean | undefined | null>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const base = path.startsWith("http") ? path : `${API_URL}${path}`;
  if (!params) return base;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!res.ok) throw new ApiError(res.statusText || "Request failed", res.status);
    return undefined as T;
  }

  const json = await res.json();

  if (!res.ok) {
    // Never pass through raw nested objects / stacks to the UI
    const rawMessage = typeof json?.message === "string" ? json.message : "Request failed";
    const safeMessage =
      rawMessage.length > 200 || /stack|exception|prisma|sql/i.test(rawMessage)
        ? "Request failed"
        : rawMessage;
    throw new ApiError(safeMessage, res.status, json?.errors);
  }

  return json as T;
}

// ─── Refresh token flow ───────────────────────────────────────────────────────

let isRefreshing = false;
// Queue of callbacks waiting for the new token
let refreshQueue: Array<(token: string) => void> = [];
// Queue of callbacks to reject if refresh fails
let rejectQueue: Array<(err: unknown) => void> = [];

async function refreshAccessToken(): Promise<string> {
  // The refresh token is an httpOnly cookie — the browser sends it automatically.
  // No body needed; credentials: "include" ensures the cookie is included.
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  // BE wraps in ApiEnvelope: { data: { accessToken } }
  // The rotated refresh token is set as a new httpOnly cookie by the BE.
  const json = (await res.json()) as { data?: { accessToken?: string } } | undefined;

  const newAccessToken = json?.data?.accessToken;
  if (!newAccessToken || typeof newAccessToken !== "string") {
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  return newAccessToken;
}

/**
 * Public auth routes where a 401 means "bad credentials / invalid token",
 * not "access token expired". Never trigger silent refresh + redirect here.
 */
function isCredentialAuthPath(path: string): boolean {
  const normalized = path.split("?")[0] ?? path;
  return (
    normalized === "/auth/login" ||
    normalized === "/auth/refresh" ||
    normalized === "/auth/forgot-password" ||
    normalized === "/auth/reset-password" ||
    normalized === "/auth/verify-email" ||
    normalized === "/auth/select-tenant"
  );
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
  isRetry = false
): Promise<T> {
  const { params, headers: extraHeaders, ...rest } = options;
  const url = buildUrl(path, params);

  const isFormData = body instanceof FormData;

  // For FormData, omit Content-Type so the browser sets multipart/form-data + boundary.
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(extraHeaders as Record<string, string>),
  };

  const token = tokenManager.getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    credentials: "include",
    headers,
    body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
    ...rest,
  });

  // Auto-refresh on 401 for authenticated API calls only — not for login/public auth
  if (res.status === 401 && !isRetry && !isCredentialAuthPath(path)) {
    if (!isRefreshing) {
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        tokenManager.setAccessToken(newToken);
        refreshQueue.forEach((cb) => cb(newToken));
      } catch (err) {
        rejectQueue.forEach((cb) => cb(err));
        tokenManager.clearAccessToken();
        // Redirect to login on unrecoverable session failure
        if (typeof window !== "undefined") {
          window.location.href = ROUTES.LOGIN;
        }
        throw err;
      } finally {
        isRefreshing = false;
        refreshQueue = [];
        rejectQueue = [];
      }
    } else {
      // Another request already triggered refresh — wait for it
      await new Promise<string>((resolve, reject) => {
        refreshQueue.push(resolve);
        rejectQueue.push(reject);
      });
    }

    // Retry original request with the new token
    return request<T>(method, path, body, options, true);
  }

  return parseResponse<T>(res);
}

// ─── Public API client ────────────────────────────────────────────────────────

export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("GET", path, undefined, options);
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("POST", path, body, options);
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PUT", path, body, options);
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PATCH", path, body, options);
  },

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("DELETE", path, undefined, options);
  },

  // ── Typed convenience wrappers ─────────────────────────────────────────────

  /** GET endpoint that returns { data, message } */
  getOne<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>("GET", path, undefined, options);
  },

  /** GET endpoint that returns paginated { data[], meta } */
  getPaginated<T>(path: string, options?: RequestOptions): Promise<PaginatedResponse<T>> {
    return request<PaginatedResponse<T>>("GET", path, undefined, options);
  },

  /** POST that returns { data, message } */
  postOne<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>("POST", path, body, options);
  },

  /** PATCH that returns { data, message } */
  patchOne<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>("PATCH", path, body, options);
  },
};
