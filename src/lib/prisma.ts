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

// Configurable pool size (mariadb driver default is 10) - production hosts
// with limited max_connections should tune this via DATABASE_CONNECTION_LIMIT
// rather than editing code.
const connectionLimit = process.env.DATABASE_CONNECTION_LIMIT
  ? Number(process.env.DATABASE_CONNECTION_LIMIT)
  : undefined;

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

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
