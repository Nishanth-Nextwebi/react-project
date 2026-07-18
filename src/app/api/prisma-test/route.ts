import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/**
 * TEMPORARY diagnostic route - constructs a brand new PrismaClient +
 * PrismaMariaDb adapter (independent of the cached singleton in
 * src/lib/prisma.ts) and drives it through connect/query/count/disconnect
 * one stage at a time, timing each stage and returning the raw,
 * un-wrapped error (including any nested `.cause` chain - the mariadb
 * driver adapter's error mapping is known to swallow the real underlying
 * cause behind a generic "pool timeout" message; see
 * https://github.com/prisma/prisma/pull/28909) instead of a generic
 * message.
 *
 * Delete this route once the Vercel connectivity issue is resolved - it is
 * unauthenticated and returns internal error/stack details that should not
 * stay exposed in production.
 */

/**
 * Recursively serializes an error and its full `.cause` chain. Every level
 * gets every enumerable AND non-enumerable own property (via
 * Object.getOwnPropertyNames, not just JSON.stringify's default
 * enumerable-only behavior) plus the specific fields Prisma/mariadb errors
 * are known to carry (code/errno/sqlState/sqlMessage/fatal), so nothing is
 * summarized or dropped at any depth.
 */
function serializeError(err: any, depth = 0): any {
  if (err === null || err === undefined) return null;
  if (depth > 8) return { note: "max cause-chain depth reached", message: String(err) };

  let fullOwnProperties: unknown;
  try {
    fullOwnProperties = JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err)));
  } catch {
    try {
      fullOwnProperties = String(err);
    } catch {
      fullOwnProperties = "<unserializable>";
    }
  }

  return {
    constructorName: err?.constructor?.name ?? null,
    name: err?.name ?? null,
    message: err?.message ?? String(err),
    code: err?.code ?? null,
    errno: err?.errno ?? null,
    sqlState: err?.sqlState ?? null,
    sqlMessage: err?.sqlMessage ?? null,
    fatal: err?.fatal ?? null,
    clientVersion: err?.clientVersion ?? null,
    meta: err?.meta ?? null,
    stack: err?.stack ?? null,
    cause: err?.cause !== undefined ? serializeError(err.cause, depth + 1) : null,
    fullOwnProperties,
  };
}

export async function GET() {
  const stages: Record<string, { ok: boolean; ms: number }> = {};
  const result: {
    stage: string | null;
    stages: typeof stages;
    userCount: number | null;
    queryRawResult: unknown;
    error: ReturnType<typeof serializeError> | null;
  } = {
    stage: null,
    stages,
    userCount: null,
    queryRawResult: null,
    error: null,
  };

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    result.stage = "config";
    result.error = serializeError(new Error("DATABASE_URL is not set in this environment."));
    return NextResponse.json(result, { status: 500 });
  }

  let prisma: PrismaClient | undefined;
  let status = 200;
  const time = async <T>(stage: string, fn: () => Promise<T>): Promise<T> => {
    result.stage = stage;
    const start = Date.now();
    try {
      const value = await fn();
      stages[stage] = { ok: true, ms: Date.now() - start };
      return value;
    } catch (err) {
      stages[stage] = { ok: false, ms: Date.now() - start };
      throw err;
    }
  };

  try {
    try {
      // Stage 1: construct adapter + client (no I/O yet)
      await time("construct", async () => {
        const parsed = new URL(databaseUrl);
        const sslMode = (parsed.searchParams.get("ssl-mode") || parsed.searchParams.get("sslmode") || "").toUpperCase();
        let ssl: boolean | { rejectUnauthorized: boolean } | undefined;
        if (sslMode === "VERIFY_CA" || sslMode === "VERIFY_IDENTITY") {
          ssl = { rejectUnauthorized: true };
        } else if (sslMode && sslMode !== "DISABLED") {
          ssl = { rejectUnauthorized: false };
        }

        const adapter = new PrismaMariaDb({
          host: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : 3306,
          user: decodeURIComponent(parsed.username),
          password: decodeURIComponent(parsed.password),
          database: parsed.pathname.replace(/^\//, ""),
          connectionLimit: 1,
          ssl,
          allowPublicKeyRetrieval: !ssl,
        });
        prisma = new PrismaClient({ adapter });
      });

      // Stage 2: $connect() - this is also where PrismaMariaDb.connect()
      // internally runs a hidden `SELECT VERSION()` capability-detection
      // query through the pool before returning, per the installed
      // adapter's own source (node_modules/@prisma/adapter-mariadb/dist/index.js).
      await time("connect", () => prisma!.$connect());

      // Stage 3: raw query
      const raw = await time("queryRaw", () => prisma!.$queryRaw`SELECT 1 as ok`);
      result.queryRawResult = JSON.parse(JSON.stringify(raw, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));

      // Stage 4: repository-equivalent query
      result.userCount = await time("userCount", () => prisma!.user.count());

      result.stage = "complete";
    } catch (err: any) {
      status = 500;
      result.error = serializeError(err);
    }
  } finally {
    // Stage 5: disconnect - always attempted, whether prior stages
    // succeeded or failed, and its own timing/failure is captured rather
    // than silently swallowed. Runs after `stage` may already be
    // "complete"; restore that marker afterward so a fully successful run
    // still reports "complete" rather than "disconnect" as its final stage.
    const stageBeforeDisconnect = result.stage;
    if (prisma) {
      try {
        await time("disconnect", () => prisma!.$disconnect());
        if (stageBeforeDisconnect === "complete") {
          result.stage = "complete";
        }
      } catch (err: any) {
        if (!result.error) {
          status = 500;
          result.error = serializeError(err);
        }
      }
    }
  }

  return NextResponse.json(result, { status });
}
