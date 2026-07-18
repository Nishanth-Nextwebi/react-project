# PolicyFlow

An insurance policy tracking system for small and medium insurance agencies — customer profiles, vehicle registrations, policy/renewal tracking, and WhatsApp expiry reminders.

## Project Overview

PolicyFlow lets an agency manage the full lifecycle of an insurance policy: customer intake, the vehicles they own, the policies written against those vehicles, and renewal reminders as policies approach expiry. It's built as a single Next.js application — server-rendered pages, API routes, and the database client all live in one deployable unit.

## Features

- **Customers** — profiles with contact details, soft-deletable, phone-uniqueness enforced among active records.
- **Vehicles** — registration/engine/chassis-number tracking, linked to a customer, soft-deletable.
- **Policies** — full policy records (premium, dates, insurer, custom fields), soft-deletable.
- **Smart Save** — a single quick-add flow that finds-or-creates the customer and vehicle, then always creates a new policy, in one atomic transaction.
- **Dashboard** — live stats, monthly/company charts, upcoming expiries, and recent activity.
- **Users & roles** — `admin`/`employee` roles, admin-only user management.
- **Activity log** — audit trail of actions across the app.
- **WhatsApp reminders** — simulated dispatch of renewal reminders for policies expiring soon.
- **Auth** — email/password (bcrypt) and Google OAuth sign-in.

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling / UI | Tailwind CSS v4, shadcn/ui, lucide-react |
| Forms | react-hook-form + Zod |
| Charts | recharts |
| Auth | NextAuth v4 (Credentials + Google) |
| Database | MySQL (Aiven MySQL in production) |
| ORM | Prisma 7, `@prisma/adapter-mariadb` driver adapter |

## Architecture

Every feature follows a **Repository → Service → Route** pattern:

- **Repository** (`src/repositories/`) — Prisma queries only, no business logic.
- **Service** (`src/services/`) — business rules, uniqueness checks, soft-delete guards.
- **Route** (`src/app/api/`) — auth check, Zod validation, delegates to the service, wraps the response.

There is no custom middleware; route protection happens at the server-component layer (`src/app/dashboard/layout.tsx`) and per-route session checks. See `CLAUDE.md` and `DEVELOPER_DOCS.md` for the full architecture reference.

## Installation

```bash
git clone <this-repo>
cd insurance-tracking-system
npm install
```

`npm install` automatically runs `prisma generate` via the `postinstall` script.

## Environment Variables

Copy `.env.example` to `.env` and fill in real values:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL connection string. Aiven requires `?ssl-mode=REQUIRED`. |
| `NEXTAUTH_SECRET` | Yes | Random secret for signing session JWTs. |
| `NEXTAUTH_URL` | Recommended | Your app's canonical URL. |
| `DATABASE_CA_CERT` | Optional | Aiven CA certificate PEM, for strict TLS verification. |
| `DATABASE_CONNECTION_LIMIT` | Optional | MySQL connection pool size. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Enables Google sign-in. |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Optional | Unused — the reminders endpoint is a simulation. |
| `CRON_SECRET` | Optional | Placeholder, not currently read by any route. |

## Database Setup

```bash
npx prisma generate         # generate the Prisma client
npx prisma migrate deploy   # apply migrations (production-safe, non-interactive)
```

For local development against a fresh database, `npx prisma migrate dev` also works and will create migrations as needed.

## Prisma Commands

```bash
npx prisma generate          # regenerate the client after a schema change
npx prisma migrate dev       # create + apply a migration (development)
npx prisma migrate deploy    # apply committed migrations (production/CI)
npx prisma studio            # browse the database in a local GUI
```

## Deployment

Target stack: GitHub → Vercel → Aiven MySQL.

1. Set the environment variables above in your Vercel project settings.
2. Push to your connected branch — Vercel runs `npm install` (which generates the Prisma client) then `npm run build`.
3. Run `npx prisma migrate deploy` against the production `DATABASE_URL` yourself (locally or via a deploy hook) whenever the schema changes — this is deliberately not part of the automatic build.
4. Hit `GET /api/setup` once against a non-production environment to seed the first admin account, then change its password.
5. Point your health checks at `GET /api/health`.

See `CLAUDE.md` for full deployment notes (TLS/Aiven specifics, connection pooling, runtime requirements).

## Folder Structure

```
src/
├── app/
│   ├── api/           # Route handlers (Repository → Service → Route pattern)
│   └── dashboard/      # Authenticated pages
├── components/         # Layout, providers, shadcn/ui components
├── lib/                 # auth, database/prisma client, env validation, Zod schemas
├── repositories/         # Prisma data-access classes
├── services/              # Business logic
└── types/                  # NextAuth type augmentation

prisma/
├── schema.prisma       # Database schema
└── migrations/          # Committed migration history
```

## License

Proprietary — internal use only unless otherwise licensed by the project owner.
