export type VehicleStatus = "ACTIVE" | "INACTIVE";

export interface Vehicle {
  id: string;
  tenantId: string;
  name: string;
  plateNumber: string | null;
  type: string | null;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehiclePayload {
  name: string;
  plateNumber?: string | null;
  type?: string | null;
  status?: VehicleStatus;
}

export type UpdateVehiclePayload = Partial<CreateVehiclePayload>;

export interface ListVehiclesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: VehicleStatus;
}
