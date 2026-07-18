import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    return NextResponse.json({ exists: false });
  }

  const parsed = new URL(url);

  return NextResponse.json({
    exists: true,
    host: parsed.hostname,
    port: parsed.port,
    database: parsed.pathname,
    ssl: parsed.searchParams.get("ssl-mode"),
  });
}