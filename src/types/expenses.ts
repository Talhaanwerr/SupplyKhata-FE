import type { PaymentMethod } from "./delivery";

export interface ExpenseStaff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ExpenseVehicle {
  id: string;
  name: string;
  plateNumber: string | null;
}

export interface Expense {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  date: string;
  amount: number;
  vehicleId: string | null;
  deliveryRunId: string | null;
  staffId: string | null;
  paymentMethod: PaymentMethod;
  reference: string | null;
  isPaidByRider: boolean;
  vehicle?: ExpenseVehicle | null;
  staff?: ExpenseStaff | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpensePayload {
  title: string;
  description?: string | null;
  date: string;
  amount: number;
  vehicleId?: string | null;
  deliveryRunId?: string | null;
  staffId?: string | null;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  isPaidByRider?: boolean;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export interface ListExpensesParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  staffId?: string;
  vehicleId?: string;
  isPaidByRider?: boolean;
}

export interface ExpensesListPayload {
  items: Expense[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filterTotal: number;
}
