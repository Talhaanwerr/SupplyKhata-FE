/** Types mirroring the backend UsersService shapes. */

export type UserStatus = "ACTIVE" | "INACTIVE" | "INVITED" | "SUSPENDED";

export interface UserRoleInfo {
  assignmentId: string;
  assignedAt: string;
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
}

/** Returned by GET /users (list) */
export interface UserListItem {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  emailVerified: boolean;
  avatarUrl: string | null;
  timezone: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  /** Roles in this tenant — returned by GET /users list */
  roles?: Array<{
    id: string;
    name: string;
    slug: string;
    isSystem: boolean;
  }>;
  memberships?: Array<{
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    status: UserStatus;
    roles: Array<{
      id: string;
      name: string;
      slug: string;
      isSystem: boolean;
    }>;
  }>;
}

/** Returned by GET /users/:id (detail) */
export interface UserDetail extends UserListItem {
  emailVerifiedAt: string | null;
  roles: UserRoleInfo[];
}

/** POST /users/invite */
export interface InviteUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  roleIds?: string[];
}

/** POST /users */
export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleIds?: string[];
}

/** PATCH /users/:id */
export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  timezone?: string;
}

/** POST /users/:id/roles */
export interface AssignUserRolesPayload {
  roleIds: string[];
}
