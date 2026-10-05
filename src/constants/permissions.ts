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

  // ─── Schedules (recurring delivery cadences) ─────────────────────────────
  SCHEDULES: {
    CREATE: "schedules:create",
    READ: "schedules:read",
    UPDATE: "schedules:update",
    DELETE: "schedules:delete",
    MANAGE: "schedules:manage",
  },

  // ─── Planned Stops (daily delivery list) ─────────────────────────────────
  PLANNED_STOPS: {
    CREATE: "planned-stops:create",
    READ: "planned-stops:read",
    UPDATE: "planned-stops:update",
    DELETE: "planned-stops:delete",
    MANAGE: "planned-stops:manage",
  },

  // ─── Orders (customer order channel) ─────────────────────────────────────
  ORDERS: {
    CREATE: "orders:create",
    READ: "orders:read",
    UPDATE: "orders:update",
    DELETE: "orders:delete",
    MANAGE: "orders:manage",
    CANCEL: "orders:cancel",
    REFUND: "orders:refund",
  },

  // ─── POS (counter / walk-in sales) ───────────────────────────────────────
  POS: {
    CREATE: "pos:create",
    READ: "pos:read",
    UPDATE: "pos:update",
    DELETE: "pos:delete",
    MANAGE: "pos:manage",
    VOID: "pos:void",
  },

  // ─── Invoices (period statements) ───────────────────────────────────────
  INVOICES: {
    CREATE: "invoices:create",
    READ: "invoices:read",
    UPDATE: "invoices:update",
    DELETE: "invoices:delete",
    MANAGE: "invoices:manage",
    VOID: "invoices:void",
  },

  // ─── Inventory (finished-goods warehouse stock) ─────────────────────────
  INVENTORY: {
    CREATE: "inventory:create",
    READ: "inventory:read",
    UPDATE: "inventory:update",
    DELETE: "inventory:delete",
    MANAGE: "inventory:manage",
    ADJUST: "inventory:adjust",
    TRANSFER: "inventory:transfer",
  },

  // ─── Vendors (supplier master) ──────────────────────────────────────────
  VENDORS: {
    CREATE: "vendors:create",
    READ: "vendors:read",
    UPDATE: "vendors:update",
    DELETE: "vendors:delete",
    MANAGE: "vendors:manage",
  },

  // ─── Raw materials ──────────────────────────────────────────────────────
  RAW_MATERIALS: {
    CREATE: "raw-materials:create",
    READ: "raw-materials:read",
    UPDATE: "raw-materials:update",
    DELETE: "raw-materials:delete",
    MANAGE: "raw-materials:manage",
    ADJUST: "raw-materials:adjust",
  },

  // ─── Purchase orders ────────────────────────────────────────────────────
  PURCHASE_ORDERS: {
    CREATE: "purchase-orders:create",
    READ: "purchase-orders:read",
    UPDATE: "purchase-orders:update",
    DELETE: "purchase-orders:delete",
    MANAGE: "purchase-orders:manage",
    CANCEL: "purchase-orders:cancel",
  },

  // ─── Goods receipt (GRN) ────────────────────────────────────────────────
  GRN: {
    CREATE: "grn:create",
    READ: "grn:read",
  },

  // ─── Vendor bills & payables ────────────────────────────────────────────
  VENDOR_BILLS: {
    CREATE: "vendor-bills:create",
    READ: "vendor-bills:read",
    UPDATE: "vendor-bills:update",
    DELETE: "vendor-bills:delete",
    MANAGE: "vendor-bills:manage",
    PAY: "vendor-bills:pay",
  },

  // ─── BOM / recipes ──────────────────────────────────────────────────────
  BOM: {
    CREATE: "bom:create",
    READ: "bom:read",
    UPDATE: "bom:update",
  },

  // ─── Production orders ──────────────────────────────────────────────────
  PRODUCTION: {
    CREATE: "production:create",
    READ: "production:read",
    UPDATE: "production:update",
    DELETE: "production:delete",
    MANAGE: "production:manage",
    START: "production:start",
    COMPLETE: "production:complete",
    CANCEL: "production:cancel",
  },
} as const;

/** Union of every permission string — useful for typing props. */
export type Permission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS][keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS]];
