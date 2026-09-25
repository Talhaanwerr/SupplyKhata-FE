import { apiClient } from "./api-client";
import type { ApiEnvelope } from "@/types/api";
import type {
  CollectionBucket,
  CollectionsListResponse,
  CollectionVisitResult,
  RecordCollectionVisitPayload,
} from "@/types/collections";

function qs(params: Record<string, string | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const collectionsApi = {
  list: (params: {
    date?: string;
    riderId?: string;
    areaId?: string;
    bucket?: CollectionBucket;
    search?: string;
  }) => apiClient.get<ApiEnvelope<CollectionsListResponse>>(`/collections/list${qs(params)}`),

  recordVisit: (customerId: string, payload: RecordCollectionVisitPayload) =>
    apiClient.post<ApiEnvelope<CollectionVisitResult>>(`/collections/${customerId}/visit`, payload),
};
