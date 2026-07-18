import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    dbExists: !!process.env.DATABASE_URL,
    nextAuth: !!process.env.NEXTAUTH_SECRET,
    url: process.env.NEXTAUTH_URL,
    node: process.version,
  });
}