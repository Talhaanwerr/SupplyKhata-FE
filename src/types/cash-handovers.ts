export interface CashHandoverPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CashHandover {
  id: string;
  tenantId: string;
  riderId: string;
  receivedById: string;
  amount: number;
  handoverDate: string;
  reference: string | null;
  notes: string | null;
  deliveryRunId: string | null;
  rider: CashHandoverPerson;
  receivedBy: CashHandoverPerson;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCashHandoverPayload {
  riderId: string;
  receivedById: string;
  amount: number;
  handoverDate: string;
  reference?: string | null;
  notes?: string | null;
  deliveryRunId?: string | null;
}

export type UpdateCashHandoverPayload = Partial<CreateCashHandoverPayload>;

export interface ListCashHandoversParams {
  page?: number;
  limit?: number;
  riderId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface RiderCashBalance {
  cashCollected: number;
  riderPaidExpenses: number;
  cashHandedOver: number;
  currentBalance: number;
}
