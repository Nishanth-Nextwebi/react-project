import "@/lib/env";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Standard Next.js singleton pattern: cache the client on the Node global
// object so hot-reloading in dev doesn't spawn a new client per reload.
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Prisma 7's client requires a driver adapter at construction time. MySQL
// connections go through `@prisma/adapter-mariadb` (the mariadb driver is
// wire-compatible with MySQL). Parsed manually rather than passed as a raw
// connection string, which hits a config-defaulting bug in this adapter version.
const databaseUrl = new URL(process.env.DATABASE_URL as string);

// Configurable pool size (mariadb driver default is 10). On Vercel, every
// concurrent serverless function instance holds its own pool - a pool of 10
// per instance multiplies fast under concurrency and can exceed Aiven's
// max_connections, and a large pool is also slower to establish from cold.
// Default to a small pool automatically when VERCEL is set (Vercel injects
// this env var into every deployment); DATABASE_CONNECTION_LIMIT still
// overrides it explicitly in either environment.
const connectionLimit = process.env.DATABASE_CONNECTION_LIMIT
  ? Number(process.env.DATABASE_CONNECTION_LIMIT)
  : process.env.VERCEL
    ? 3
    : undefined;

// Serverless functions can be frozen (all JS execution paused) between
// invocations and thawed later for a "warm" reuse. mariadb's default
// idleTimeout (30 minutes) lets a pooled connection sit far longer than a
// freeze can last, so a connection borrowed after a thaw can be a zombie
// socket the pool still believes is valid - the driver hangs waiting on a
// dead connection instead of erroring, which is exactly the
// "pool timeout ... active=0 idle=0" symptom. Keep pooled connections short
// enough that a stale one is dropped and replaced well within any plausible
// freeze/thaw window.
const idleTimeout = process.env.VERCEL ? 30 : undefined;

// Managed MySQL providers (e.g. Aiven) reject plaintext connections and
// require TLS. DATABASE_URL carries this as a `ssl-mode`/`sslmode` query
// param (Aiven's own connection strings include `?ssl-mode=REQUIRED`) -
// local/self-hosted MySQL URLs simply omit it, so this stays a no-op for
// local dev setups. Verification follows standard MySQL client `ssl-mode`
// semantics: REQUIRED/PREFERRED means "encrypt, but don't verify the chain"
// (Aiven's default cert is self-signed from Node's point of view, so
// verifying against the default trust store fails outright) - only
// VERIFY_CA/VERIFY_IDENTITY (or supplying DATABASE_CA_CERT) turn on strict
// certificate verification.
const sslMode = (databaseUrl.searchParams.get("ssl-mode") || databaseUrl.searchParams.get("sslmode") || "").toUpperCase();
const caCert = process.env.DATABASE_CA_CERT;

let ssl: boolean | { ca?: string; rejectUnauthorized: boolean } | undefined;
if (caCert) {
  ssl = { ca: caCert, rejectUnauthorized: true };
} else if (sslMode === "VERIFY_CA" || sslMode === "VERIFY_IDENTITY") {
  ssl = { rejectUnauthorized: true };
} else if (sslMode && sslMode !== "DISABLED") {
  ssl = { rejectUnauthorized: false };
}

const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: databaseUrl.port ? Number(databaseUrl.port) : 3306,
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.replace(/^\//, ""),
  connectionLimit,
  idleTimeout,
  ssl,
  // MySQL 8's default caching_sha2_password auth plugin needs the client to
  // fetch the server's RSA public key to encrypt the password, which is only
  // unsafe to allow over a *plaintext* connection - hence gated on `!ssl`.
  // When ssl is active (always true for Aiven, which requires TLS) this key
  // exchange already happens inside the encrypted channel, so the flag is
  // moot in production; it only matters for local/self-hosted MySQL over a
  // non-TLS connection.
  allowPublicKeyRetrieval: !ssl,
});

// Cache on `global` in every environment, not just outside production. This
// was previously gated to non-production (a convention meant to stop
// Next.js dev-mode hot-reload from spawning duplicate clients), but on
// Vercel that gate meant every serverless invocation built a brand new
// PrismaMariaDb adapter - and therefore a brand new mariadb connection
// pool - from scratch, discarding any already-established connections and
// re-doing the TCP/TLS handshake with Aiven on every request. Within a
// warm (reused) function container, caching lets later invocations reuse
// the pool that's already connected instead of rebuilding it every time.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
globalForPrisma.prisma = prisma;
