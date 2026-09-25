export type CollectionBucket = "DUE_TODAY" | "OVERDUE" | "DUE_SOON" | "ALL";

export type CollectionVisitOutcome =
  "COLLECTED" | "PARTIAL" | "PROMISED" | "NO_CONTACT" | "SKIPPED";

export interface CollectionListItem {
  customerId: string;
  name: string;
  phone: string;
  areaId: string;
  areaName: string;
  balance: number;
  dueDate: string | null;
  daysOverdue: number;
  ageDays: number;
  promisedAmount: number | null;
  lastPaymentDate: string | null;
  defaultRiderId: string | null;
  bucket: CollectionBucket;
}

export interface CollectionsListResponse {
  date: string;
  items: CollectionListItem[];
}

export interface RecordCollectionVisitPayload {
  outcome: CollectionVisitOutcome;
  amount?: number;
  method?: "CASH" | "BANK" | "EASYPAISA" | "JAZZCASH" | "OTHER";
  promiseDate?: string;
  promiseAmount?: number;
  followUpDate?: string;
  notes?: string | null;
  visitDate?: string;
}

export interface CollectionVisitResult {
  id: string;
  customerId: string;
  outcome: CollectionVisitOutcome;
  amountCollected: number | null;
  paymentId: string | null;
  followUpDate: string | null;
  notes: string | null;
}
