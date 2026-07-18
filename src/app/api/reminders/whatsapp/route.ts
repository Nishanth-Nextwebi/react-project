import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ReminderService } from "@/services/reminderService";

const reminderService = new ReminderService();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reminderDays = 30 } = body;

    const result = await reminderService.processReminders(
      reminderDays,
      session.user.id,
      session.user.name || undefined
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      dispatched: result.dispatched,
      logs: result.logs,
    });
  } catch (error: any) {
    console.error("WhatsApp reminder API error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
