import { NextResponse } from "next/server";
import dns from "node:dns";
import net from "node:net";
import mariadb, { type Connection } from "mariadb";

/**
 * TEMPORARY diagnostic route - bypasses Prisma and the connection pool
 * entirely to isolate exactly which network/protocol stage fails on
 * Vercel: DNS, raw TCP, TLS+auth (mariadb.createConnection does both as
 * part of establishing a single connection), then a query. Uses a single
 * direct connection, never a pool, so "pool timeout" is not reachable here
 * - a hang or error will point at the real underlying stage instead.
 *
 * Delete this route once the Vercel connectivity issue is resolved - it is
 * unauthenticated and returns internal connection details (host/port,
 * driver error internals) that should not stay exposed in production.
 */
export async function GET() {
  const result: {
    dns: string | null;
    tcpConnected: boolean;
    tlsConnected: boolean;
    authenticated: boolean;
    querySucceeded: boolean;
    queryResult: unknown;
    errorStage: string | null;
    fullError: string | null;
    errorCode: string | null;
    errno: number | string | null;
    sqlState: string | null;
    stack: string | null;
  } = {
    dns: null,
    tcpConnected: false,
    tlsConnected: false,
    authenticated: false,
    querySucceeded: false,
    queryResult: null,
    errorStage: null,
    fullError: null,
    errorCode: null,
    errno: null,
    sqlState: null,
    stack: null,
  };

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    result.errorStage = "config";
    result.fullError = "DATABASE_URL is not set in this environment.";
    return NextResponse.json(result, { status: 500 });
  }

  let host: string, port: number, user: string, password: string, database: string, sslMode: string;
  try {
    const parsed = new URL(databaseUrl);
    host = parsed.hostname;
    port = parsed.port ? Number(parsed.port) : 3306;
    user = decodeURIComponent(parsed.username);
    password = decodeURIComponent(parsed.password);
    database = parsed.pathname.replace(/^\//, "");
    sslMode = (parsed.searchParams.get("ssl-mode") || parsed.searchParams.get("sslmode") || "").toUpperCase();
  } catch (err: any) {
    result.errorStage = "config";
    result.fullError = `DATABASE_URL failed to parse: ${String(err)}`;
    result.stack = err?.stack ?? null;
    return NextResponse.json(result, { status: 500 });
  }

  // --- Stage 1: DNS resolution ---
  try {
    const dnsResult = await dns.promises.lookup(host);
    result.dns = `${host} -> ${dnsResult.address} (IPv${dnsResult.family})`;
  } catch (err: any) {
    result.errorStage = "dns";
    result.fullError = String(err);
    result.errorCode = err?.code ?? null;
    result.errno = err?.errno ?? null;
    result.stack = err?.stack ?? null;
    return NextResponse.json(result, { status: 500 });
  }

  // --- Stage 2: raw TCP connection, independent of TLS/MySQL protocol ---
  try {
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      socket.setTimeout(8000);
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("timeout", () => {
        socket.destroy();
        reject(Object.assign(new Error(`TCP connection to ${host}:${port} timed out after 8000ms`), { code: "ETIMEDOUT_MANUAL" }));
      });
      socket.once("error", (err) => {
        reject(err);
      });
    });
    result.tcpConnected = true;
  } catch (err: any) {
    result.errorStage = "tcp";
    result.fullError = String(err);
    result.errorCode = err?.code ?? null;
    result.errno = err?.errno ?? null;
    result.stack = err?.stack ?? null;
    return NextResponse.json(result, { status: 500 });
  }

  // --- Stage 3 + 4: TLS handshake and authentication ---
  // mariadb.createConnection performs both as part of establishing a single
  // direct connection (no pool), matching the same TLS logic src/lib/prisma.ts
  // uses so this is a faithful reproduction, not a different code path.
  let ssl: boolean | { rejectUnauthorized: boolean } | undefined;
  if (sslMode === "VERIFY_CA" || sslMode === "VERIFY_IDENTITY") {
    ssl = { rejectUnauthorized: true };
  } else if (sslMode && sslMode !== "DISABLED") {
    ssl = { rejectUnauthorized: false };
  }

  let conn: Connection | undefined;
  try {
    conn = await mariadb.createConnection({
      host,
      port,
      user,
      password,
      database,
      ssl,
      allowPublicKeyRetrieval: !ssl,
      connectTimeout: 8000,
    });
    // A successful direct connection means TLS negotiation (if any) and
    // credential authentication both completed - the driver does not hand
    // back a connection object otherwise.
    result.tlsConnected = true;
    result.authenticated = true;
  } catch (err: any) {
    // If the server sent back a MySQL-protocol-level error (it has a
    // sqlState or an ER_* code), TCP and TLS already succeeded - the
    // failure is at authentication. Anything else (a raw socket code, a
    // generic handshake failure) happened before any MySQL response was
    // ever received, so it's classified as the TLS stage.
    const looksLikeMysqlProtocolError = Boolean(err?.sqlState) || String(err?.code ?? "").startsWith("ER_");
    result.errorStage = looksLikeMysqlProtocolError ? "authentication" : "tls";
    if (looksLikeMysqlProtocolError) {
      result.tlsConnected = true;
    }
    result.fullError = String(err);
    result.errorCode = err?.code ?? null;
    result.errno = err?.errno ?? null;
    result.sqlState = err?.sqlState ?? null;
    result.stack = err?.stack ?? null;
    return NextResponse.json(result, { status: 500 });
  }

  // --- Stage 5: SELECT 1 ---
  try {
    const rows = await conn.query("SELECT 1 as ok");
    result.querySucceeded = true;
    result.queryResult = JSON.parse(
      JSON.stringify(rows, (_key, value) => (typeof value === "bigint" ? value.toString() : value))
    );
  } catch (err: any) {
    result.errorStage = "query";
    result.fullError = String(err);
    result.errorCode = err?.code ?? null;
    result.errno = err?.errno ?? null;
    result.sqlState = err?.sqlState ?? null;
    result.stack = err?.stack ?? null;
    return NextResponse.json(result, { status: 500 });
  } finally {
    await conn.end().catch(() => {});
  }

  return NextResponse.json(result, { status: 200 });
}
