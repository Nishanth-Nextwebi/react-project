import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ReminderService, type ReminderWindow } from "@/services/reminderService";
import { serializePolicy } from "../../policies/_serialize";

const reminderService = new ReminderService();
const VALID_WINDOWS: ReminderWindow[] = ["15", "10", "5", "expired"];

/**
 * GET /api/reminders/whatsapp?window=15|10|5|expired
 * Lists active policies for one Send Message page tab.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const window = searchParams.get("window") as ReminderWindow | null;
    if (!window || !VALID_WINDOWS.includes(window)) {
      return NextResponse.json(
        { success: false, message: "Invalid or missing 'window' - expected one of 15, 10, 5, expired." },
        { status: 400 }
      );
    }

    const policies = await reminderService.listByWindow(window);

    return NextResponse.json({
      success: true,
      message: "Policies retrieved successfully.",
      data: { policies: policies.map(serializePolicy) },
    });
  } catch (error: any) {
    console.error("GET /api/reminders/whatsapp error:", error);
    return NextResponse.json({ success: false, message: error.message || "Something went wrong." }, { status: 500 });
  }
}

/**
 * POST /api/reminders/whatsapp
 * Body: { recipients: [{ policyId, phone, message }] }
 * Actually sends each message via the WhatsApp Cloud API (src/lib/whatsapp.ts).
 * Message text is pre-resolved by the caller (Send Message page), so this
 * route is only responsible for dispatch + per-recipient result reporting.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const recipients = Array.isArray(body?.recipients) ? body.recipients : [];

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, message: "No recipients selected.", errors: ["Select at least one policy to message."] },
        { status: 400 }
      );
    }

    const result = await reminderService.sendMessages(recipients, session.user.id, session.user.name || undefined);

    return NextResponse.json({
      success: true,
      message: `Sent ${result.sentCount} of ${recipients.length} message(s)${result.failedCount > 0 ? `, ${result.failedCount} failed` : ""}.`,
      data: result,
    });
  } catch (error: any) {
    console.error("POST /api/reminders/whatsapp error:", error);
    return NextResponse.json({ success: false, message: error.message || "Something went wrong." }, { status: 500 });
  }
}
