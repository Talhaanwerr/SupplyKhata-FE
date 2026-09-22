export interface Area {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAreaPayload {
  name: string;
}

export interface UpdateAreaPayload {
  name?: string;
  isActive?: boolean;
}

export interface ListAreasParams {
  search?: string;
  includeInactive?: boolean;
}
