# Cursor Pitfalls

Rules to follow on every new module. Read before touching auth, guards, API, forms, or env.

## Guards and Tenant Context

- Never put `TenantGuard` at class level on a controller that Super Admins also call.
  SA has no `tenantId` in their JWT — `@CurrentTenant()` will throw `400 Tenant context is missing`.
  Rule: apply `TenantGuard` only at method level on routes that need a real tenant.
  For SA-accessible routes, read `user.tenantId` from `@CurrentUser()` and handle null gracefully.

- Never use `@CurrentTenant()` on a route that SA will call. Use `user.tenantId ?? ''` from `@CurrentUser()` instead.

## API Endpoints

- Every resource that only regular users need a tenant for must still have a SA-safe variant or skip the guard.
  Example: profile update uses `PATCH /auth/me` (JwtAuthGuard only), not `PATCH /users/:id` (which has TenantGuard).

- Login DTOs must NOT have `@MinLength`, password complexity rules, or any strength validation.
  Password strength belongs only on register, reset-password, change-password, and accept-invite flows.

- `/auth/refresh` body field must be optional. The real refresh token comes from the httpOnly cookie.
  A required body field causes `400` on every silent token refresh and breaks session restore.

- When adding a new uniqueness constraint (slug, name, subdomain), add it as a private `assertXxxUnique` helper
  and call it in BOTH `create` and `update`. Slug-only uniqueness is never enough for human-readable fields like name.

- Stats and counts must come from real DB queries. Never return hardcoded or placeholder values in list/stats endpoints.

- Uniqueness checks (`assertSlugUnique`, `assertNameUnique`, `assertSubdomainUnique`) must always include `deletedAt: null` in the where clause. Without it, soft-deleted records block re-use of the same slug/name, causing false 409 Conflict errors.

- Soft-delete alone does NOT free up DB-level unique constraints (e.g. `tenants_slug_key`). MySQL has no partial index support. When soft-deleting a record that has a unique field, mangle the field value at delete time — e.g. append `_deleted_<Date.now()>` to slug and subdomain — so the original value is immediately available for reuse.

## Frontend API Client

- The API client must NOT retry or redirect on `401` for auth routes: login, refresh, forgot-password, reset-password, verify-email, select-tenant.
  These routes return legitimate 4xx errors that the UI must display inline.

- When the request body is `FormData`, do NOT set `Content-Type: application/json` and do NOT JSON-stringify the body.
  Let the browser set `multipart/form-data` with the correct boundary automatically.

## Storage

- Never construct `S3StorageProvider` (or call `config.getOrThrow('S3_BUCKET')`) unless `STORAGE_DRIVER=s3`.
  Local mode must start with all S3 env vars missing.

- Block `image/svg+xml` uploads by default. SVG can carry scripts — XSS risk when served from the same origin.

## CSP

- `connect-src` must list the API **origin** only: `http://localhost:4700`.
  Do not include the path `/api/v1` — CSP origin matching is exact and a path suffix blocks all requests.

## Frontend Routing

- Super Admin must never land on a tenant-scoped page. Check `user.isSuperAdmin` in `UserMenu` and similar
  navigation before building hrefs. SA profile → `/super-admin/profile`, tenant user → `/profile`.

- After any full-page redirect (e.g. post-login), call `initialize()` on app mount via `AuthProvider`.
  The in-memory access token is lost on navigation — without this, every API call returns `401`
  and the user appears to be logged out even though the refresh cookie is valid.

## Forms

- Do not show the `required` asterisk (`required` prop on `FormField`) on login forms.
  It is visual noise when all fields are obviously required. Use `required` only when a form has a mix of required and optional fields.

- Never rely on HTML5 constraint attributes (`min`, `max`, `required`, `type="email"` browser bubbles) to block invalid money/number submits.
  Wrong: `<Input type="number" min="0" />` → native browser tooltip, no field-level red error, Zod never runs.
  Correct: put `noValidate` on the `<form>`, validate with Zod + `FormField error={...}`, and only then call the API.
  Use `@/lib/form-number` helpers (`refineNonNegativeMoney`, `refineNonNegativeInteger`) for amounts.
  Invalid / negative / wrong-decimal values must fail on the FE and must not hit the backend.

- Money fields (prices, costs, opening receivable): non-negative, max 2 decimal places.
  Whole-number-only fields (e.g. container deposit, page size): non-negative integers — no decimals.
  Mirror the same rules on BE DTOs (`@Min(0)`, `@IsNumber({ maxDecimalPlaces: 2 })` or `@IsInt()`).

## SupplyKhata Domain Rules

Read before touching delivery, container, pricing, ledger, products, or usage UI.

- The delivery entry form must send all line items (19L Can + 13L Can) in a single POST /api/v1/deliveries request with an items array. Never fire one API call per item. Splitting into multiple calls means the backend cannot wrap everything in one transaction and partial saves will corrupt ledger and container data.

- Never mix 19L Can and 13L Can container counts in the same display row or combined total. Container balance must always be shown per product separately. If a component receives container data without productId, reject it — do not display it as a combined number.

- Price fields in the delivery form must be pre-loaded from the customer-specific price for that product (CustomerProductPrice), falling back to Product.defaultSellingPrice. The user sees the resolved price. If the user changes it (and has permission), send the override in the request — the backend will snapshot whatever value is sent. Never send a blank price and let the backend guess.

- Customer balance displayed in the UI must always come from GET /api/v1/customers/:id/balance (derived from ledger SUM on the backend). Never calculate or cache a balance value on the frontend. After recording a payment or saving a delivery, invalidate the balance and ledger TanStack Query cache so the display stays accurate.

- The dashboard product breakdown (19L Can units, 13L Can units) must use the byProduct array from the dashboard API response. Never aggregate DeliveryItem quantities on the frontend — the numbers will be wrong for date-filtered views and will not account for cancellations.

- Reports with Export CSV / Export PDF must trigger a file download by hitting the /api/v1/reports/export endpoint and handling the binary response correctly (Blob + URL.createObjectURL). Do not try to generate CSV or PDF on the frontend from table data — historical cost snapshots and accurate totals only exist on the backend.

- The tenant billing page must show the usage counter from GET /api/v1/usage/current. Do not count deliveries client-side from a deliveries list — cancelled deliveries and edits will cause the displayed count to differ from what the backend bills.

- There is NO ProductVariant model. The product dropdown in any form (delivery entry, customer pricing, refill batch) must fetch from GET /api/v1/products (flat list). Never construct a two-level product/variant selector.

- Customer Area field must be a combobox/select fed by GET /api/v1/areas. Existing area → send areaId. New area name → send areaName (backend find-or-creates). Never use a free-text-only area input without this flow, and never manage areas as a JSON tag list on the Settings form — Settings Served Areas section must use the Areas API so new areas from customer create show up there after invalidating the areas query cache.
