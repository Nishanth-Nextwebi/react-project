import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ReminderService, type ReminderWindow } from "@/services/reminderService";
import { serializePolicy } from "../_serialize";

const reminderService = new ReminderService();
const VALID_WINDOWS: ReminderWindow[] = ["15", "10", "5", "expired"];

/**
 * GET /api/policies/expiry-window?window=15|10|5|expired
 * Lists active policies for one Track FollowUp page tab.
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
    console.error("GET /api/policies/expiry-window error:", error);
    return NextResponse.json({ success: false, message: error.message || "Something went wrong." }, { status: 500 });
  }
}
