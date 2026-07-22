# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**PolicyFlow** — an insurance policy tracking system for small/medium insurance agencies (customer profiles, vehicle registrations, policy/renewal tracking, WhatsApp expiry reminders). Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, NextAuth v4, and **Prisma ORM on MySQL** (Aiven MySQL in production).

`metadata.json` and `assets/.aistudio/` are leftovers from the Google AI Studio scaffold this repo originally came from — they describe a different, unrelated Gemini-powered starter app and are not part of PolicyFlow's actual functionality.

## Commands

```bash
npm run dev      # next dev -p 3000 --hostname 0.0.0.0
npm run build    # next build
npm run start    # next start
npm run clean    # rm -rf .next dist
npm run lint     # next lint
```

There is no test suite configured in this repo.

For a from-scratch environment: copy `.env.example` to `.env`, set `DATABASE_URL` (MySQL) and `NEXTAUTH_SECRET`, then:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Hit `GET /api/setup` once (dev only, blocked when `NODE_ENV=production`) to seed the first admin account (`admin@insurance.com` / `Admin123!`).

## Architecture

### Layering pattern

Every feature follows the same three-layer flow — replicate it for new entities:

1. **Repository** (`src/repositories/*.ts`) — Prisma query classes. No business logic. Constructor takes an optional `Database` client (defaults to the shared singleton from `src/lib/database.ts`); `SmartSaveService` passes a transaction client here to make its multi-entity write atomic.
2. **Service** (`src/services/*.ts`) — holds all business logic: uniqueness checks, cross-entity existence checks, soft-delete guards, Prisma error-code translation (`P2025` → not found, `P2003` → foreign-key conflict). Routes never touch Prisma models directly for anything beyond trivial reads.
3. **API route** (`src/app/api/**/route.ts`) — thin handler: `getServerSession` auth/role check → Zod validation (`src/lib/validations.ts`) → delegate to service → wrap result in the response envelope → `_serialize.ts` maps Prisma's `id` field to the `_id` key the frontend reads (a deliberate compatibility shim — see "Wire format" below).

Standard response envelope used by most routes:
```json
// success
{ "success": true, "message": "...", "data": {} }
// failure
{ "success": false, "message": "...", "errors": ["..."] }
```
`users`, `activities`, `dashboard`, and `setup` use a narrower shape without the `data`/`errors` wrapper — this is original, intentional, per-route API behavior; do not "fix" it into the standard envelope without confirming the frontend still expects the old shape (it does).

### Data model relationships

`Customer` 1—N `Vehicle` 1—N `Policy`. `Policy` also carries a direct `customer` FK (denormalized alongside `vehicle`, not derived through it) — relied on by `policyService`/`dashboardService` for simpler single-hop queries. `User` (`admin` | `employee`) is referenced by every record's `createdBy`/`updatedBy` for audit trail. `ActivityLog` records free-text audit entries independent of the main entities, and is never soft-deleted or updated after creation.

Soft delete is universal: every entity except `ActivityLog` has `isActive`; deletion sets it to `false` rather than removing the row. Deactivation is blocked at the service layer if the entity is still referenced by an active child (deleting a `Customer` fails if it has active `Vehicle`s; deactivating a `Vehicle` fails if it has an active `Policy`). Uniqueness (vehicle number, engine number, chassis number, policy number) is enforced at the database level via Prisma `@unique` **globally** (not scoped to `isActive` — a deactivated vehicle permanently reserves its numbers), while phone-number uniqueness for `Customer` is intentionally **not** a DB constraint — it's enforced only in `customerService.ts` and only among active customers.

### Wire format / id shape

Every table's `id` is a 24-character hex string minted by `src/lib/objectId.ts`'s `generateObjectId()` (via the `bson` package), matching the shape of a MongoDB ObjectId. This is a deliberate compatibility choice, not an accident: it lets the frontend's Zod reference-id validators (`/^[0-9a-fA-F]{24}$/` in `src/lib/validations.ts`) and every existing component keep working unchanged. Each entity route folder has a colocated `_serialize.ts` that maps Prisma's `id` → `_id` (and does the same for nested `createdBy`/`updatedBy`/`customer`/`vehicle`/`user` sub-objects). Don't remove either of these without also auditing every frontend component that reads `_id`.

### Auth & route protection

There is no Next.js middleware. Access control is done at the server-component layer:
- `src/app/page.tsx` — checks session, redirects to `/dashboard` or `/login`.
- `src/app/dashboard/layout.tsx` — server component; redirects to `/login` if no session.
- Role-gated sections (e.g. admin-only nav items in `Sidebar.tsx`, admin-only checks inside `/api/users/*` routes) branch on `session.user.role` (`"admin" | "employee"`).

`src/lib/auth.ts` configures NextAuth: `CredentialsProvider` (bcrypt-hashed passwords) + `GoogleProvider` (auto-provisions a new `employee` user on first Google sign-in; rejects sign-in if the matched account is `isActive: false`). JWT session strategy, 30-day maxAge. `NEXTAUTH_SECRET` has no hardcoded fallback — `src/lib/env.ts` fails the app at startup if it's missing, so don't reintroduce a fallback string "for convenience." Cookies are set with `sameSite: "none", secure: true` deliberately to keep auth working when the app is previewed inside a sandboxed iframe — don't "fix" this to `lax` without checking that context still matters; it also means the app **requires HTTPS** in any real deployment (secure cookies are silently dropped over plain HTTP).

### Database connection

`src/lib/prisma.ts` constructs a `PrismaClient` using the `@prisma/adapter-mariadb` driver adapter — this adapter has no native query-engine binary, so there's no platform/binary-target concern deploying to serverless hosts. `DATABASE_URL` is parsed manually (not passed as a raw connection string, which hits a config-defaulting bug in this adapter version) into host/port/user/password/database, plus TLS settings derived from a `ssl-mode`/`sslmode` query param (Aiven's connection strings include `?ssl-mode=REQUIRED`; local/self-hosted URLs simply omit it). `allowPublicKeyRetrieval` is enabled only when TLS is off, to satisfy MySQL 8's `caching_sha2_password` auth plugin over a plaintext local connection — it's a no-op against Aiven, which is always TLS. `src/lib/database.ts` re-exports the client as `db` — always import from there, not `@/lib/prisma` directly, and always go through a repository rather than calling `db.<model>` from a service or route. `transaction()` in the same file wraps `db.$transaction()`, used by `SmartSaveService`.

`src/lib/env.ts` validates `DATABASE_URL` and `NEXTAUTH_SECRET` are present at process startup (imported for its side effect by both `auth.ts` and `prisma.ts`) and throws before the app can start in a misconfigured state.

### Notable non-obvious endpoints

- `POST /api/policies/smart-save` — a combined "quick add" flow used by the UI: finds-or-creates a `Customer` by phone, finds-or-creates a `Vehicle` by vehicle number/chassis number, then always creates a new `Policy`. Only phone, customer name, insurance company, expiry date, and vehicle number are actually required (route-level checks and the frontend form agree on this); everything else the DB still requires but has no natural default for — `policyNumber`, `engineNumber`, `chassisNumber` (all globally `@unique`) — gets an `AUTO-...` placeholder generated in `SmartSaveService` when omitted, rather than blocking the save. It infers "renewal" vs "created" activity-log wording by checking whether `comments` contains the word "renewal" (case-insensitive substring match — a fragile but intentional original design choice, not a bug to fix). Runs inside a single Prisma transaction (`transaction()` in `src/lib/database.ts`), so a failure partway through rolls back the whole operation.
- `GET /api/policies/expiry-window?window=15|10|5|expired` — powers the Track FollowUp page (`/dashboard/follow-up`). Lists active policies for one of four expiry checkpoints (exact-day offsets 15/10/5, or expired within the last 15 days — all computed from `new Date()` at request time, never a fixed date). No message is ever sent server-side: the page opens `tel:`/`wa.me` links directly via `PhoneActions` (client-side only, no API credentials involved), and `PATCH /api/policies/[id]/follow-up` records the click as a formatted date-time **string** on `Policy.lastFollowUpAt` (nullable — `null` means never contacted), shown in green once set.
- `GET /api/setup` — dev-only seeding endpoint; 403s in production; only ever creates a single default admin, never seeds employees.
- `DELETE /api/users/[id]` — hard delete (not soft delete), blocked for self-deletion. Also catches MySQL's `P2003` foreign-key-constraint error (when the target user is still referenced as `createdBy`/`updatedBy` on other rows) and returns a clean message instead of a raw database error — this failure mode has no equivalent in a document database without enforced referential integrity; it's a necessary adaptation to the relational engine, not a business-logic change.
- `ActivityService.log(...)` — fire-and-forget audit logging; swallows its own errors so a logging failure never fails the parent request. Called from most mutation routes/services after a successful write.

### VehicleType enum mapping

Prisma enum identifiers can't contain hyphens, so `prisma/schema.prisma` maps `TwoWheeler @map("Two-Wheeler")` etc. The client only ever hands back the Prisma-side identifier; `src/repositories/VehicleRepository.ts`'s `WIRE_TO_PRISMA_VEHICLE_TYPE`/`PRISMA_TO_WIRE_VEHICLE_TYPE` tables (and its exported `toWireVehicleType()` helper, reused by `PolicyRepository.ts` for its own separate `vehicle` include) translate back to the exact hyphenated wire value the frontend and Zod schema expect. If you add a new `VehicleType` member, update both tables and the `vehicleSchema` enum in `validations.ts` — the Prisma enum alone is not enough.

### Frontend conventions

- Path alias `@/*` → `src/*` (see `tsconfig.json`).
- UI components come from shadcn/ui (`components.json`: style `base-nova`, base color `neutral`, icons from `lucide-react`), added under `src/components/ui/`.
- Client pages under `src/app/dashboard/*/page.tsx` fetch directly from the `/api/*` routes (no shared API client layer) and follow a consistent list/drawer pattern: paginated list + search/sort/filter, a slide-over drawer for add/edit forms with Zod-mirrored client-side validation, and a details panel with related-entity lookups (e.g. a customer's vehicle list is fetched separately via `GET /api/vehicles?customerId=...`).

## Deployment (Vercel + Aiven MySQL)

- **Env vars**: `DATABASE_URL` (with `?ssl-mode=REQUIRED` for Aiven), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, optionally `DATABASE_CA_CERT` and `DATABASE_CONNECTION_LIMIT`. See `.env.example`.
- **Build**: `package.json`'s `postinstall` script runs `prisma generate` automatically after every `npm install` — required because the Prisma client is generated into the gitignored `src/generated/prisma` and won't exist otherwise.
- **Migrations**: use `prisma migrate deploy`, not `prisma db push` — this project has real committed migration history (`prisma/migrations/`). Run it as an explicit, separate step against the production `DATABASE_URL`, not baked into the automatic Vercel build (to avoid re-applying migrations across concurrent/preview builds).
- **Connection pooling**: on serverless hosts, many concurrent function instances each open their own pool — keep `DATABASE_CONNECTION_LIMIT` low (e.g. 3–5) relative to your Aiven plan's `max_connections`.
- **Runtime**: every API route needs the Node.js runtime (not Edge) — the `mariadb` driver uses raw TCP/TLS sockets unavailable on Edge.
