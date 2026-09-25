/**
 * Frontend Permission Constants
 *
 * ⚠️  IMPORTANT — UX ONLY:
 * These constants are used to show/hide UI elements (buttons, menu items, pages).
 * They do NOT enforce actual security. The backend MUST enforce all authorization.
 * A user could bypass these checks by calling the API directly.
 *
 * Format: "module:action" — mirrors the backend PermissionsGuard format exactly.
 * Super admins bypass all permission checks on both frontend and backend.
 */

// ─── Users ────────────────────────────────────────────────────────────────────
export const PERMISSIONS = {
  USERS: {
    CREATE: "users:create",
    READ: "users:read",
    UPDATE: "users:update",
    DELETE: "users:delete",
    MANAGE: "users:manage",
  },

  // ─── Tenants ────────────────────────────────────────────────────────────────
  TENANTS: {
    CREATE: "tenants:create",
    READ: "tenants:read",
    UPDATE: "tenants:update",
    DELETE: "tenants:delete",
    MANAGE: "tenants:manage",
  },

  // ─── Roles ──────────────────────────────────────────────────────────────────
  ROLES: {
    CREATE: "roles:create",
    READ: "roles:read",
    UPDATE: "roles:update",
    DELETE: "roles:delete",
    MANAGE: "roles:manage",
  },

  // ─── Permissions ────────────────────────────────────────────────────────────
  PERMISSIONS: {
    CREATE: "permissions:create",
    READ: "permissions:read",
    UPDATE: "permissions:update",
    DELETE: "permissions:delete",
    MANAGE: "permissions:manage",
  },

  // ─── Subscriptions ──────────────────────────────────────────────────────────
  SUBSCRIPTIONS: {
    CREATE: "subscriptions:create",
    READ: "subscriptions:read",
    UPDATE: "subscriptions:update",
    DELETE: "subscriptions:delete",
    MANAGE: "subscriptions:manage",
  },

  // ─── Settings ───────────────────────────────────────────────────────────────
  SETTINGS: {
    CREATE: "settings:create",
    READ: "settings:read",
    UPDATE: "settings:update",
    DELETE: "settings:delete",
    MANAGE: "settings:manage",
  },

  // ─── Areas (served areas) ───────────────────────────────────────────────────
  AREAS: {
    CREATE: "areas:create",
    READ: "areas:read",
    UPDATE: "areas:update",
    DELETE: "areas:delete",
    MANAGE: "areas:manage",
  },

  // ─── Products ───────────────────────────────────────────────────────────────
  PRODUCTS: {
    CREATE: "products:create",
    READ: "products:read",
    UPDATE: "products:update",
    DELETE: "products:delete",
    MANAGE: "products:manage",
  },

  // ─── Customers ──────────────────────────────────────────────────────────────
  CUSTOMERS: {
    CREATE: "customers:create",
    READ: "customers:read",
    UPDATE: "customers:update",
    DELETE: "customers:delete",
    MANAGE: "customers:manage",
  },

  // ─── Vehicles ───────────────────────────────────────────────────────────────
  VEHICLES: {
    CREATE: "vehicles:create",
    READ: "vehicles:read",
    UPDATE: "vehicles:update",
    DELETE: "vehicles:delete",
    MANAGE: "vehicles:manage",
  },

  // ─── Delivery Runs ─────────────────────────────────────────────────────────
  DELIVERY_RUNS: {
    CREATE: "deliveryruns:create",
    READ: "deliveryruns:read",
    UPDATE: "deliveryruns:update",
    DELETE: "deliveryruns:delete",
    MANAGE: "deliveryruns:manage",
  },

  // ─── Deliveries ────────────────────────────────────────────────────────────
  DELIVERIES: {
    CREATE: "deliveries:create",
    READ: "deliveries:read",
    UPDATE: "deliveries:update",
    DELETE: "deliveries:delete",
    MANAGE: "deliveries:manage",
  },

  // ─── Payments ───────────────────────────────────────────────────────────────
  PAYMENTS: {
    CREATE: "payments:create",
    READ: "payments:read",
    UPDATE: "payments:update",
    DELETE: "payments:delete",
    MANAGE: "payments:manage",
  },

  // ─── Refill batches (plant fill log) ───────────────────────────────────────
  REFILL: {
    CREATE: "refill:create",
    READ: "refill:read",
    UPDATE: "refill:update",
    DELETE: "refill:delete",
    MANAGE: "refill:manage",
  },

  // ─── Expenses ───────────────────────────────────────────────────────────────
  EXPENSES: {
    CREATE: "expenses:create",
    READ: "expenses:read",
    UPDATE: "expenses:update",
    DELETE: "expenses:delete",
    MANAGE: "expenses:manage",
  },

  // ─── Cash handovers ─────────────────────────────────────────────────────────
  HANDOVERS: {
    CREATE: "handovers:create",
    READ: "handovers:read",
    UPDATE: "handovers:update",
    DELETE: "handovers:delete",
    MANAGE: "handovers:manage",
  },

  // ─── Ledger ─────────────────────────────────────────────────────────────────
  LEDGER: {
    CREATE: "ledger:create",
    READ: "ledger:read",
    UPDATE: "ledger:update",
    DELETE: "ledger:delete",
    MANAGE: "ledger:manage",
  },

  // ─── Files ──────────────────────────────────────────────────────────────────
  FILES: {
    CREATE: "files:create",
    READ: "files:read",
    UPDATE: "files:update",
    DELETE: "files:delete",
    MANAGE: "files:manage",
  },

  // ─── Notifications ───────────────────────────────────────────────────────────
  NOTIFICATIONS: {
    CREATE: "notifications:create",
    READ: "notifications:read",
    UPDATE: "notifications:update",
    DELETE: "notifications:delete",
    MANAGE: "notifications:manage",
  },

  // ─── Audit Logs ─────────────────────────────────────────────────────────────
  AUDIT_LOGS: {
    READ: "audit-logs:read",
    MANAGE: "audit-logs:manage",
  },

  // ─── Feature Flags ──────────────────────────────────────────────────────────
  FEATURE_FLAGS: {
    CREATE: "feature-flags:create",
    READ: "feature-flags:read",
    UPDATE: "feature-flags:update",
    MANAGE: "feature-flags:manage",
  },

  // ─── Containers (owned inventory + balances) ────────────────────────────────
  CONTAINERS: {
    CREATE: "containers:create",
    READ: "containers:read",
    UPDATE: "containers:update",
    DELETE: "containers:delete",
    MANAGE: "containers:manage",
  },

  // ─── Reports / Dashboard ────────────────────────────────────────────────────
  REPORTS: {
    CREATE: "reports:create",
    READ: "reports:read",
    UPDATE: "reports:update",
    DELETE: "reports:delete",
    MANAGE: "reports:manage",
  },

  // ─── Collections (field collection workflow) ────────────────────────────────
  COLLECTIONS: {
    CREATE: "collections:create",
    READ: "collections:read",
    UPDATE: "collections:update",
    DELETE: "collections:delete",
    MANAGE: "collections:manage",
  },
} as const;

/** Union of every permission string — useful for typing props. */
export type Permission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS][keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS]];
