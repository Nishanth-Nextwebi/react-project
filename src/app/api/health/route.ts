import { NextResponse } from "next/server";
import { db } from "@/lib/database";

/**
 * Unauthenticated liveness/readiness check for load balancers and
 * orchestrators. Verifies the database is actually reachable rather than
 * just returning a static "ok" - a process that's up but can't reach MySQL
 * should not receive traffic.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("GET /api/health error:", error);
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
