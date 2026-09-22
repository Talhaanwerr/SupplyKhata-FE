/** Types mirroring the backend RolesService shapes. */

/** A single permission returned by GET /roles/permissions/list */
export interface PermissionItem {
  id: string;
  module: string;
  action: string;
  slug: string; // "module:action"
}

/** A role with nested permissions */
export interface RoleItem {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissions: PermissionItem[];
  _count?: { userRoles: number };
}

/** POST /roles | PATCH /roles/:id */
export interface CreateRolePayload {
  name: string;
  slug?: string;
  description?: string;
}

/** POST /roles/:id/permissions — replaces ALL permissions for a role */
export interface AssignPermissionsPayload {
  permissionIds: string[];
}

/** POST /roles/users/:userId/roles */
export interface AssignRoleToUserPayload {
  roleId: string;
  tenantId?: string;
}
