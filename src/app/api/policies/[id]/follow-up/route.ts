import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PolicyService } from "@/services/policyService";
import { serializePolicy } from "../../_serialize";

const policyService = new PolicyService();

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/policies/[id]/follow-up
 * Records "now" (server-side, as a formatted string) as the policy's
 * lastFollowUpAt - called by the Track FollowUp page when staff clicks
 * Call or WhatsApp on a customer.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access.", errors: ["You must be logged in to record a follow-up."] },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await policyService.recordFollowUp(id, session.user.id);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message, errors: [result.message] }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: "Follow-up recorded.",
      data: serializePolicy(result.policy),
    });
  } catch (error: any) {
    console.error("PATCH /api/policies/[id]/follow-up error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error.", errors: [error.message || "Something went wrong."] },
      { status: 500 }
    );
  }
}
