# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**PolicyFlow** — an insurance policy tracking system for small/medium insurance agencies (customer profiles, vehicle registrations, policy/renewal tracking, WhatsApp expiry reminders). Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, NextAuth v4, and MongoDB/Mongoose.

The repo originated from a Google AI Studio scaffold (see `metadata.json`, `assets/.aistudio/`) — ignore `README.md` and the `GEMINI_API_KEY`/`APP_URL` vars in `.env.example`; they're leftover template boilerplate, not part of this app. The real environment reference is the rest of `.env.example` (`MONGODB_URI`, `NEXTAUTH_*`, `GOOGLE_CLIENT_*`, `WHATSAPP_*`, `CRON_SECRET`).

`DEVELOPER_DOCS.md` is a hand-maintained technical reference but only covers Module 1 (auth) and Module 2 (customers/vehicles) in depth — the codebase has since grown to include Policies, Users, Reports, Settings, and Activity Log modules that aren't documented there. Treat it as background, not a source of truth for current behavior.

## Commands

```bash
npm run dev      # next dev -p 3000 --hostname 0.0.0.0
npm run build    # next build
npm run start    # node server.ts  — NOTE: server.ts does not exist in this repo; this script is currently broken
npm run clean    # rm -rf .next dist
npm run lint     # next lint
```

There is no test suite configured in this repo.

For a from-scratch environment: copy `.env.example` to `.env`, set `MONGODB_URI` and `NEXTAUTH_SECRET`, run `npm install` then `npm run dev`. Hit `POST /api/setup` once (dev only, blocked when `NODE_ENV=production`) to seed the first admin account (`admin@insurance.com` / `Admin123!`).

## Architecture

### Layering pattern

Every feature follows the same three-layer flow — replicate it for new entities:

1. **Model** (`src/models/*.ts`) — Mongoose schema/interface. Guards against model recompilation with `mongoose.models.X || mongoose.model(...)`.
2. **Service** (`src/services/*Service.ts`) — static-method classes holding all business logic: uniqueness checks, cross-entity existence checks, soft-delete guards. Routes never touch Mongoose models directly for anything beyond trivial reads.
3. **API route** (`src/app/api/**/route.ts`) — thin handler: `getServerSession` auth/role check → Zod validation (`src/lib/validations.ts`) → delegate to service → wrap result in the standard response envelope.

Standard response envelope used by every route:
```json
// success
{ "success": true, "message": "...", "data": {} }
// failure
{ "success": false, "message": "...", "errors": ["..."] }
```

### Data model relationships

`Customer` 1—N `Vehicle` 1—N `Policy`. `User` (`admin` | `employee`) is referenced by every record's `createdBy`/`updatedBy` for audit trail. `ActivityLog` records free-text audit entries independent of the main entities.

Soft delete is universal: every entity has `isActive`, deletion sets it to `false` rather than removing the document. Deactivation is blocked at the service layer if the entity is still referenced by an active child (e.g. deleting a `Customer` fails if it has active `Vehicle`s; deactivating a `Vehicle` fails if it has an active `Policy`). Uniqueness (vehicle number, engine number, chassis number, policy number) is enforced against **active** records only, normalized to uppercase, and checked explicitly in the service layer in addition to any Mongoose `unique` index — this is intentional so duplicate errors can carry a friendly message instead of a raw Mongo 11000 error.

### Auth & route protection

There is no Next.js middleware. Access control is done at the server-component layer:
- `src/app/page.tsx` — checks session, redirects to `/dashboard` or `/login`.
- `src/app/dashboard/layout.tsx` — server component; redirects to `/login` if no session.
- Role-gated sections (e.g. admin-only nav items in `Sidebar.tsx`, admin-only checks inside `/api/users/*` routes) branch on `session.user.role` (`"admin" | "employee"`).

`src/lib/auth.ts` configures NextAuth: `CredentialsProvider` (bcrypt-hashed passwords) + `GoogleProvider` (auto-provisions a new `employee` user on first Google sign-in). JWT session strategy, 30-day maxAge. Cookies are set with `sameSite: "none", secure: true` deliberately to keep auth working when the app is previewed inside a sandboxed iframe — don't "fix" this to `lax` without checking that context still matters.

### Database connection

`src/lib/mongodb.ts` caches the Mongoose connection promise on the Node `global` object to survive dev hot-reloads and serverless cold starts. Always call `dbConnect()` at the top of any service method that touches the DB — nothing connects implicitly.

### Notable non-obvious endpoints

- `POST /api/policies/smart-save` — a combined "quick add" flow used by the UI: finds-or-creates a `Customer` by phone, finds-or-creates a `Vehicle` by vehicle number/chassis number, then always creates a new `Policy`. It infers "renewal" vs "created" activity-log wording by checking whether `comments` contains the word "renewal". Not wrapped in a Mongo transaction — partial failures between steps can leave orphaned customer/vehicle records without a policy.
- `POST /api/reminders/whatsapp` — currently a **simulation**: it queries policies expiring within `reminderDays`, builds message text from a template, and marks each as "Sent"/"Failed" based on whether the customer has a phone number, but never actually calls the WhatsApp Cloud API despite `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER` existing as env vars.
- `POST /api/setup` — dev-only seeding endpoint; 403s in production; only ever creates a single default admin, never seeds employees.
- `ActivityService.log(...)` — fire-and-forget audit logging; swallows its own errors so a logging failure never fails the parent request. Called from most mutation routes/services after a successful write.

### Frontend conventions

- Path alias `@/*` → `src/*` (see `tsconfig.json`).
- UI components come from shadcn/ui (`components.json`: style `base-nova`, base color `neutral`, icons from `lucide-react`), added under `src/components/ui/`.
- Client pages under `src/app/dashboard/*/page.tsx` fetch directly from the `/api/*` routes (no shared API client layer) and follow a consistent list/drawer pattern: paginated list + search/sort/filter, a slide-over drawer for add/edit forms with Zod-mirrored client-side validation, and a details panel with related-entity lookups (e.g. a customer's vehicle list is fetched separately via `GET /api/vehicles?customerId=...`).
