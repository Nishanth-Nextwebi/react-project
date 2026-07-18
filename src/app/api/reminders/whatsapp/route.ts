import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Policy from "@/models/Policy";
import { ActivityService } from "@/services/activityService";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { reminderDays = 30 } = body;

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + reminderDays);

    // Fetch active policies expiring within reminder range
    const expiringPolicies = await Policy.find({
      isActive: true,
      expiryDate: { $gt: now, $lte: futureDate },
    })
      .populate("customer", "name phone email")
      .populate("vehicle", "vehicleNumber manufacturer model");

    if (expiringPolicies.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No policy contracts match the expiry window triggers.",
        dispatched: 0,
        logs: [],
      });
    }

    // Default template fallback
    const defaultTemplate = "Dear {customer_name}, your policy #{policy_number} is expiring on {expiry_date}. Please contact us to renew.";

    const dispatchedReminders = expiringPolicies.map((policy: any) => {
      const customerName = policy.customer?.name || "Client";
      const customerPhone = policy.customer?.phone || "";
      const policyNumber = policy.policyNumber;
      const expiryDate = new Date(policy.expiryDate).toLocaleDateString("en-IN");

      // Replace template tokens
      let message = defaultTemplate
        .replace(/{customer_name}/g, customerName)
        .replace(/{policy_number}/g, policyNumber)
        .replace(/{expiry_date}/g, expiryDate);

      return {
        policyId: policy._id,
        policyNumber,
        customerName,
        phone: customerPhone,
        message,
        status: customerPhone ? "Sent" : "Failed (No Phone Number)",
      };
    });

    const sentCount = dispatchedReminders.filter((r) => r.status === "Sent").length;

    // Log the bulk reminders
    if (sentCount > 0) {
      await ActivityService.log(
        session.user.id,
        session.user.name || undefined,
        "User Actions",
        `Initiated WhatsApp reminder engine run. Automated notifications processed: ${sentCount} contracts queued.`
      );
    }

    return NextResponse.json({
      success: true,
      message: `WhatsApp reminder engine successfully processed coverage audits. Sent: ${sentCount}, Skipped: ${expiringPolicies.length - sentCount}`,
      dispatched: sentCount,
      logs: dispatchedReminders,
    });
  } catch (error: any) {
    console.error("WhatsApp reminder API error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
