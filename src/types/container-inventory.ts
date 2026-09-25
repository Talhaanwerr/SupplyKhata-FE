export interface ContainerHoldingCustomer {
  customerId: string;
  customerName: string;
  balance: number;
}

export interface ContainerInventoryRow {
  productId: string;
  productName: string;
  ownedTotal: number;
  withCustomers: number;
  onVehicles: number;
  onHand: number;
  hasOpeningOnHand: boolean;
  customersHolding: ContainerHoldingCustomer[];
}

export interface SetContainerOpeningPayload {
  items: Array<{ productId: string; quantity: number }>;
}

export interface AdjustOwnedContainersPayload {
  productId: string;
  quantityDelta: number;
  notes?: string | null;
}
