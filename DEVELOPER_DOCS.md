# Insurance Tracking System - Developer Documentation

This document is the technical reference for the Insurance Tracking System (PolicyFlow), built with Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui, NextAuth v4, and **Prisma ORM on MySQL** (Aiven MySQL in production).

---

## 1. Project Directory Structure

```
.
├── .env                              # Active local runtime environment variables (gitignored)
├── .env.example                      # Distribution template for env configuration
├── CLAUDE.md                         # AI-agent-facing architecture/context reference
├── DEVELOPER_DOCS.md                 # This file
├── next-env.d.ts                     # Next.js custom TypeScript declarations
├── next.config.js                    # Next.js framework configuration
├── package.json                      # Build script pipelines and packages
├── postcss.config.mjs                # PostCSS and Tailwind CSS processing definitions
├── prisma.config.ts                  # Prisma 7 config file (datasource URL, migrations path)
├── prisma/
│   ├── schema.prisma                 # Single source of truth for the database schema
│   └── migrations/                   # Committed, ordered migration history
├── tsconfig.json                     # TypeScript compiler strict constraints
└── src
    ├── app
    │   ├── api                       # Route handlers - see section 8
    │   ├── dashboard                 # Authenticated pages (customers, vehicles, policies, ...)
    │   ├── login/page.tsx             # Credentials/Google sign-in form
    │   ├── layout.tsx                  # Core HTML envelope and SessionProvider wrapper
    │   └── page.tsx                     # Root redirect engine (auto routes to /dashboard or /login)
    ├── components
    │   ├── layout/                   # Header.tsx, Sidebar.tsx
    │   └── providers/SessionProvider.tsx
    ├── generated/prisma/              # Prisma client output (generated, gitignored)
    ├── lib
    │   ├── auth.ts                   # NextAuth config (Credentials + Google)
    │   ├── database.ts               # db client re-export + transaction() helper
    │   ├── env.ts                    # Fail-fast required-env-var validation
    │   ├── objectId.ts               # generateObjectId() - mints row ids
    │   ├── prisma.ts                 # PrismaClient construction (driver adapter, Aiven TLS)
    │   ├── utils.ts                  # Misc frontend utilities
    │   └── validations.ts            # Zod schemas: customer/vehicle/policy
    ├── repositories/                 # Data-access classes, one per entity
    ├── services/                     # Business-logic classes, one per entity
    ├── types/
    │   └── next-auth.d.ts            # Type expansions for Auth roles and user tokens
    └── index.css
```

---

## 2. Environment Variables

See `.env.example` for the full template. Key variables:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL connection string. Aiven requires `?ssl-mode=REQUIRED`. |
| `NEXTAUTH_SECRET` | Yes | Signs session JWTs. App fails to start without it (`src/lib/env.ts`) - no hardcoded fallback. |
| `NEXTAUTH_URL` | Recommended | Canonical deployment URL. |
| `DATABASE_CA_CERT` | Optional | Aiven CA cert PEM contents, for strict TLS verification. |
| `DATABASE_CONNECTION_LIMIT` | Optional | MySQL pool size (mariadb driver default 10). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth; falls back to non-functional dummy values if unset, so the provider is always registered. |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Optional | Unused - the reminders endpoint is a simulation. |
| `CRON_SECRET` | Optional | Placeholder, not read by any current route. |

No `MONGODB_URI`, `GEMINI_API_KEY`, or `APP_URL` are used anywhere in this codebase - remove them if you find them in an old `.env`.

---

## 3. Database Connection (Prisma / MySQL)

PolicyFlow uses **Prisma 7** with the `@prisma/adapter-mariadb` driver adapter against **MySQL** (Aiven MySQL in production). This adapter connects directly over the `mariadb` npm driver rather than through Prisma's classic Rust query engine binary, which avoids the binary-platform-matching issues that Prisma-on-serverless deployments often hit.

### Client construction (`src/lib/prisma.ts`)
1. `DATABASE_URL` is parsed into host/port/user/password/database.
2. If the URL's `ssl-mode`/`sslmode` query param requests TLS (Aiven always does), the adapter is configured with `ssl: true` (or a CA-verified config if `DATABASE_CA_CERT` is set).
3. `allowPublicKeyRetrieval` is enabled only when TLS is **off** - required for MySQL 8's `caching_sha2_password` auth plugin over a plaintext local connection; irrelevant (and left off) against Aiven, which is always TLS.
4. The client is cached on the Node `global` object so dev-mode hot reloads don't spawn a new client per reload.

### Access pattern (`src/lib/database.ts`)
Repositories import the shared client as `db` from `@/lib/database`, never directly from `@/lib/prisma`. This file also exports `transaction()`, a thin wrapper around `db.$transaction()` used by `SmartSaveService` to make its combined Customer+Vehicle+Policy write atomic.

### Primary keys
Every table's `id` has no `@default()` in the schema. IDs are minted application-side by `generateObjectId()` (`src/lib/objectId.ts`, backed by the `bson` package), producing the same 24-character hex string shape as a MongoDB ObjectId. This is deliberate: the frontend's Zod validators (`/^[0-9a-fA-F]{24}$/` in `src/lib/validations.ts`) and every existing form/component were built against that id shape, so keeping it avoids touching frontend code or validation rules during the database migration.

---

## 4. Authentication Flow & NextAuth Configuration

PolicyFlow implements authorization via **NextAuth v4**, with two providers: `CredentialsProvider` (email/password, bcrypt-hashed) and `GoogleProvider` (OAuth).

```
[ Client Login Page ] ---> Submits Credentials ---> [ CredentialsProvider: authorize() ]
                                                                 │
                                                   UserRepository.findByEmail()
                                                                 │
                                                   Verifies hash using bcryptjs
                                                                 │
                                                       Checks "isActive" flag
                                                                 │
                                                     [ jwt() Callback Triggered ]
                                                       Maps User ID & Role -> JWT
                                                                 │
                                                   [ session() Callback Triggered ]
                                                    Maps JWT -> Client Session

[ Client ] ---> Google OAuth ---> [ signIn() callback ]
                                        │
                        UserRepository.findByEmail() by Google profile email
                                        │
                    Not found: create as "employee", isActive true, store googleId
                    Found + inactive: reject sign-in (return false)
                    Found + no googleId yet: backfill it
```

### NextAuth Configuration (`src/lib/auth.ts`)
- **Providers**: `CredentialsProvider` and `GoogleProvider` (the latter always registered, using dummy placeholder credentials if `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are unset - so Google sign-in silently fails rather than the app refusing to start).
- **Session Strategy**: `jwt`, 30-day `maxAge`.
- **Callbacks**: `signIn` (Google auto-provisioning, inactive-account rejection), `jwt` (copies `id`/`role` onto the token, supports `trigger: "update"`), `session` (copies them back onto `session.user`).
- **Secret**: `NEXTAUTH_SECRET` only - no hardcoded fallback. `src/lib/env.ts` fails the app at startup if it's missing, so a silent insecure fallback is never reachable.
- **Iframe Compatibility**: cookies are set with `sameSite: "none", secure: true` unconditionally, to keep auth working when the app is previewed inside a sandboxed iframe. This requires HTTPS in any real deployment - `secure` cookies are silently dropped over plain HTTP.

---

## 5. Routing Protection & Navigation Layout

There is no Next.js middleware. Route access control is enforced at the server-component layer:

1. **`src/app/page.tsx`** - checks session, redirects to `/dashboard` or `/login`.
2. **`src/app/dashboard/layout.tsx`** - server component; redirects to `/login` if there's no session. Every page under `/dashboard/*` inherits this guard.
3. **Per-route API auth** - every `route.ts` handler calls `getServerSession(authOptions)` itself and returns `401` if there's no session; admin-only routes (`/api/users*`) additionally check `session.user.role !== "admin"` and return `403`.
4. **Role-based Sidebar Links** - `Sidebar.tsx` conditionally renders admin-only nav items (Users, Settings) based on `session.user.role === "admin"`.

---

## 6. Layering Pattern: Repository → Service → Route

Every feature module follows the same three layers:

1. **Repository** (`src/repositories/*.ts`) - thin Prisma query classes, no business logic. Constructor accepts an optional `Database` client (defaults to the shared singleton), which is how `SmartSaveService` runs repositories against a transaction client instead of the global one.
2. **Service** (`src/services/*.ts`) - business rules: uniqueness checks against active records, cross-entity existence checks, soft-delete guards, Prisma error-code translation (`P2025` → not found, `P2003` → foreign-key conflict).
3. **Route** (`src/app/api/**/route.ts`) - thin handler: session/role check → Zod validation → delegate to service → wrap in the response envelope → `_serialize.ts` maps Prisma's `id` to the `_id` key the frontend expects (matching the original database driver's default JSON serialization, so the frontend needed no changes).

### Standard response envelope
```json
// success
{ "success": true, "message": "...", "data": {} }
// failure
{ "success": false, "message": "...", "errors": ["..."] }
```
A few routes (`users`, `activities`, `dashboard`, `reminders/whatsapp`, `setup`) use a narrower shape without the `data`/`errors` wrapper - this is original, intentional API behavior, preserved exactly.

---

## 7. Secure System Initialization Endpoint (`/api/setup`)

- **Access Level**: Development only. Returns `403` when `NODE_ENV === "production"`.
- **Seeding Logic**: checks if any `admin`-role user exists; if not, creates one:
  - **Email**: `admin@insurance.com`
  - **Password**: `Admin123!`
  - **Role**: `admin`
- No employee accounts are pre-seeded - create them from the Users admin page once logged in.

---

## 8. API Route Reference

All routes require a session (`401` if missing) unless noted. `/api/users*` requires `role === "admin"` (`403` otherwise).

| Route | Methods | Notes |
|---|---|---|
| `/api/customers`, `/api/customers/[id]` | GET, POST, PUT, DELETE | Soft delete blocked if active vehicles exist. Phone uniqueness enforced among active customers only. |
| `/api/vehicles`, `/api/vehicles/[id]` | GET, POST, PUT, DELETE | Soft delete blocked if active policies exist. `vehicleNumber`/`engineNumber`/`chassisNumber` unique globally at the DB level. |
| `/api/policies`, `/api/policies/[id]` | GET, POST, PUT, DELETE | `policyNumber` unique globally. Customer/vehicle existence checked without an `isActive` filter (matches original behavior). |
| `/api/policies/smart-save` | POST | Find-or-create Customer by phone, find-or-create Vehicle by number/chassis, always create a new Policy. Runs inside a single Prisma transaction. |
| `/api/users`, `/api/users/[id]` | GET, POST, PATCH, DELETE | Admin only. Self-deactivation/self-deletion blocked. Hard delete; blocked with a clean message if the user still has authored records (MySQL FK constraint - MongoDB had no equivalent). |
| `/api/activities` | GET, POST | Recent audit log entries, newest first. |
| `/api/dashboard` | GET | Stats/charts/tables computed server-side; see `DashboardService`. |
| `/api/reminders/whatsapp` | POST | **Simulation only** - builds message text and marks Sent/Failed, never calls a real WhatsApp API. |
| `/api/setup` | GET | Dev-only bootstrap, see section 7. |
| `/api/health` | GET | Unauthenticated DB-connectivity liveness check. |
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handler. |

### Database schema (`prisma/schema.prisma`)

- **User**: `name`, `email` (unique), `password` (nullable - OAuth-only accounts have none), `role` (`admin`|`employee`), `isActive`, `googleId`.
- **Customer**: `name`, `phone` (NOT unique at the DB level - active-only uniqueness enforced in `customerService.ts`), `email`, `address`, `isActive`, `createdBy`/`updatedBy`.
- **Vehicle**: `customer` ref, `vehicleNumber`/`engineNumber`/`chassisNumber` (all globally unique), `vehicleType` enum, `manufacturer`, `model`, `year`, `color`, `isActive`, `createdBy`/`updatedBy`.
- **Policy**: `customer` + `vehicle` refs (denormalized - both stored directly), `policyNumber` (globally unique), `insuranceCompany`, `policyType`, `premiumAmount`, `startDate`, `expiryDate`, `extraField1-3`, `comments`, `attachmentUrl`, `isActive`, `createdBy`/`updatedBy`.
- **ActivityLog**: `user` ref (nullable), `userName`, `action`, `details`, `ipAddress` (carried over from the original schema, unused by any current code path), `createdAt` only (write-once, never updated or soft-deleted).

---

## 9. Frontend Modules

Every module under `src/app/dashboard/*/page.tsx` follows the same pattern: paginated list with search/sort/filter, a slide-over drawer for add/edit forms with Zod-mirrored client-side validation, and a details panel with related-entity lookups fetched separately (e.g. a customer's vehicles via `GET /api/vehicles?customerId=...`). Modules: Customers, Vehicles, Policies, Users (admin only), Reports, Settings, plus the Dashboard home page and the global Activity feed.

---

## 10. Production Deployment & Build Verification

```bash
npm install                 # runs "postinstall": "prisma generate" automatically
npx prisma migrate deploy   # apply committed migrations, non-interactive - run separately from the build, not baked into it
npm run build                # next build
npm run start                 # next start
```

`npm run clean` removes `.next`/`dist`. There is no test suite configured in this repo. See `CLAUDE.md` for the full production-deployment checklist (Vercel + Aiven specifics, TLS configuration, connection pooling guidance).
