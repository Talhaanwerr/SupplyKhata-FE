import { API_URL } from "@/constants";
import { ApiError } from "./api-error";
import { apiClient } from "./api-client";
import { tokenManager } from "./token";
import type { ApiEnvelope } from "@/types/api";
import type {
  GenerateInvoicePayload,
  InvoiceDetail,
  InvoicesListPayload,
  ListInvoicesParams,
  VoidInvoicePayload,
} from "@/types/invoices";

function buildQuery(params?: ListInvoicesParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.customerId) q.set("customerId", params.customerId);
  if (params.status) q.set("status", params.status);
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  const s = q.toString();
  return s ? `?${s}` : "";
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

export const invoicesApi = {
  list: (params?: ListInvoicesParams) =>
    apiClient.get<ApiEnvelope<InvoicesListPayload>>(`/invoices${buildQuery(params)}`),

  listForCustomer: (customerId: string, params?: ListInvoicesParams) =>
    apiClient.get<ApiEnvelope<InvoicesListPayload>>(
      `/customers/${customerId}/invoices${buildQuery(params)}`
    ),

  get: (id: string) => apiClient.get<ApiEnvelope<InvoiceDetail>>(`/invoices/${id}`),

  generate: (payload: GenerateInvoicePayload) =>
    apiClient.post<ApiEnvelope<InvoiceDetail>>("/invoices/generate", payload),

  issue: (id: string) => apiClient.post<ApiEnvelope<InvoiceDetail>>(`/invoices/${id}/issue`),

  void: (id: string, payload: VoidInvoicePayload) =>
    apiClient.post<ApiEnvelope<InvoiceDetail>>(`/invoices/${id}/void`, payload),

  deleteDraft: (id: string) => apiClient.delete<void>(`/invoices/${id}`),

  downloadPdf: async (id: string): Promise<void> => {
    const token = tokenManager.getAccessToken();
    const res = await fetch(`${API_URL}/invoices/${id}/pdf`, {
      method: "GET",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let message = "PDF download failed";
      try {
        const json = (await res.json()) as { message?: string };
        if (typeof json?.message === "string" && json.message.length < 200) {
          message = json.message;
        }
      } catch {
        // ignore
      }
      throw new ApiError(message, res.status);
    }
    const blob = await res.blob();
    const filename = filenameFromDisposition(
      res.headers.get("Content-Disposition"),
      `invoice-${id}.pdf`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
