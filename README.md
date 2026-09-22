# SaaS Boilerplate — Next.js Frontend

Production-ready multi-tenant SaaS frontend built with Next.js 15 App Router, Tailwind CSS, and TypeScript.

---

## Tech Stack

| Tool                    | Purpose                             |
| ----------------------- | ----------------------------------- |
| Next.js 15 (App Router) | Framework                           |
| TypeScript (strict)     | Type safety                         |
| Tailwind CSS v4         | Styling                             |
| shadcn/ui + Radix UI    | Component primitives                |
| Zustand                 | Global auth state                   |
| TanStack Query v5       | Data fetching & caching             |
| React Hook Form + Zod   | Forms & validation                  |
| ESLint + Prettier       | Linting & formatting                |
| Husky + lint-staged     | Pre-commit hooks                    |
| Docker                  | Containerisation (standalone build) |
| GitHub Actions          | CI pipeline                         |

---

## Quick Start (Local)

### 1. Prerequisites

- Node.js 20+
- Backend API running (see `Backend-BoilerPlate-Nestjs`)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to your backend URL
```

### 4. Start development server

```bash
npm run dev
```

App runs at: `http://localhost:3010`

---

## Docker

### Build image

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1 \
  --build-arg NEXT_PUBLIC_APP_URL=https://yourdomain.com \
  -t saas-web .
```

> `NEXT_PUBLIC_*` variables are baked into the bundle at build time — they must be passed as `--build-arg`, not as runtime env vars.

### Run container

```bash
docker run -d -p 3000:3000 saas-web
```

---

## Available Scripts

| Script               | Description                        |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Development server with hot reload |
| `npm run build`      | Production build                   |
| `npm run start`      | Run production build locally       |
| `npm run lint`       | Lint & auto-fix                    |
| `npm run type-check` | TypeScript type check              |
| `npm run format`     | Format all files with Prettier     |

---

## Environment Variables

| Variable               | Required | Description                                                     |
| ---------------------- | -------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | ✅       | Backend API base URL (e.g. `https://api.yourdomain.com/api/v1`) |
| `NEXT_PUBLIC_APP_URL`  |          | App public URL (used in meta tags)                              |
| `NEXT_PUBLIC_APP_NAME` |          | App display name                                                |

> **Never put secrets in `NEXT_PUBLIC_*` variables** — they are embedded in the browser bundle and visible to everyone.

---

## Architecture

```
src/
├── app/
│   ├── (auth)/               # Login, forgot-password, reset-password, invite
│   ├── (super-admin)/        # Super admin panel (SUPER_ADMIN role only)
│   ├── (tenant)/             # Tenant workspace (authenticated users)
│   ├── select-workspace/     # Multi-tenant workspace picker
│   ├── 403/                  # Forbidden page
│   ├── account-suspended/    # Suspended tenant page
│   ├── error.tsx             # Root error boundary
│   ├── not-found.tsx         # 404 page
│   └── layout.tsx            # Root layout (QueryProvider, ToastProvider)
├── components/
│   ├── layout/               # Sidebar, TopHeader, TenantSwitcher
│   └── ui/                   # shadcn/ui + custom components
├── constants/                # ROUTES, API_URL
├── features/
│   ├── tenant/
│   │   ├── users/            # User management table + drawers + modals
│   │   ├── roles/            # Role management + permission modal
│   │   └── activity-logs/   # Audit log table
│   └── super-admin/          # Super admin tenant & user views
├── hooks/                    # usePaginatedQuery, useApiMutation, usePermission, useUserStatusMutation
├── lib/                      # api-client, auth, token, session-cookie, api-error
├── providers/                # QueryProvider (TanStack Query)
├── schemas/                  # Zod validation schemas (auth, invite)
├── store/                    # auth-store (Zustand)
└── types/                    # Shared TypeScript types
```

---

## Route Groups

| Group              | Paths                                                                     | Access                        |
| ------------------ | ------------------------------------------------------------------------- | ----------------------------- |
| `(auth)`           | `/login`, `/forgot-password`, `/reset-password`, `/invite/[token]`        | Public                        |
| `select-workspace` | `/select-workspace`                                                       | Public (post-login selection) |
| `(tenant)`         | `/dashboard`, `/users`, `/roles`, `/activity-logs`, `/files`, `/settings` | Authenticated tenant users    |
| `(super-admin)`    | `/super-admin/*`                                                          | `SUPER_ADMIN` role only       |
| Error pages        | `/403`, `/account-suspended`                                              | Public                        |

---

## Key Patterns

### Authentication Flow

1. `useAuthStore.initialize()` — called on app mount; calls `/auth/refresh` (httpOnly cookie auto-sent) → `/auth/me` → hydrates user state.
2. On login: access token stored **in memory only** (lost on page reload, refreshed automatically). Refresh token in **httpOnly cookie** (never accessible to JS).
3. Multi-tenant login: redirects to `/select-workspace` with a short-lived `selectionToken`, then exchanges it for full session tokens.
4. `apiClient` auto-retries on 401 by calling `/auth/refresh` before replaying the failed request.

### Tenant Isolation

- Active tenant is set via the `X-Tenant-ID` header (read from the JWT on the backend).
- `TenantSwitcher` in sidebar lets multi-workspace users switch without re-login.

### Permission-based UI

```tsx
// Hide a button if user lacks permission — backend still enforces
<PermissionGuard permission="users:create">
  <Button>Invite User</Button>
</PermissionGuard>

// OR-logic (any one permission is enough)
<PermissionGuardAny permissions={["users:read", "users:manage"]}>
  <UserList />
</PermissionGuardAny>
```

> These guards are **UX-only**. All authorization is enforced on the backend.

---

## Security Highlights

- **Access token in memory** — never in `localStorage` or `sessionStorage`
- **Refresh token as httpOnly cookie** — XSS cannot steal it
- **No secrets in `NEXT_PUBLIC_*` envs** — only public API URL is exposed
- **Route protection** — middleware checks `next-session` cookie for role/status routing
- **Open redirect prevention** — `redirectTo` validated to start with `/` and not `//`
- **Permission guards** — hide sensitive UI for unauthorized users
- **Security headers** — CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **Error boundaries** — root + per-route-group, no raw error messages shown to users
- **Input validation** — Zod schemas with max-length caps on all password and email fields

---

## CI Pipeline

GitHub Actions runs on every push/PR to `main` and `develop`:

1. Install dependencies (`npm ci`)
2. Lint (`eslint`)
3. Type-check (`tsc --noEmit`)
4. Build (`next build`)

See `.github/workflows/ci.yml`.

---

## Production Deployment

### VPS / Cloud VM

```bash
# 1. Build image (with your production API URL)
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1 \
  --build-arg NEXT_PUBLIC_APP_URL=https://yourdomain.com \
  -t saas-web:latest .

# 2. Run
docker run -d \
  --name saas-web \
  --restart unless-stopped \
  -p 3000:3000 \
  saas-web:latest
```

### Vercel / Netlify (Zero-config)

Set the following environment variables in the platform dashboard:

```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME=Your App Name
```

> **Note:** Remove `output: "standalone"` from `next.config.ts` when deploying to Vercel — Vercel handles its own output format automatically.

### Nginx reverse proxy (in front of Docker)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```
