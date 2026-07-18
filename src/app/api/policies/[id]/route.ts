import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PolicyService } from "@/services/policyService";
import { policySchema } from "@/lib/validations";

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/policies/[id]
 * Retrieves a single policy's detailed record
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access.", errors: ["You must be logged in to view this policy."] },
        { status: 401 }
      );
    }

    const { id } = await params;
    const policy = await PolicyService.getPolicyById(id);

    if (!policy) {
      return NextResponse.json(
        { success: false, message: "Policy not found.", errors: ["The requested policy ID does not exist in the database."] },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Policy retrieved successfully.",
      data: policy,
    });
  } catch (error: any) {
    console.error("GET /api/policies/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error.", errors: [error.message || "Something went wrong."] },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/policies/[id]
 * Updates an existing policy's fields with full Zod validation
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access.", errors: ["You must be logged in to update this policy."] },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const validationResult = policySchema.safeParse(body);
    if (!validationResult.success) {
      const errorDetails = validationResult.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: errorDetails,
        },
        { status: 400 }
      );
    }

    const updatedPolicy = await PolicyService.updatePolicy(
      id,
      validationResult.data,
      session.user.id
    );

    if (!updatedPolicy) {
      return NextResponse.json(
        { success: false, message: "Policy not found.", errors: ["The requested policy ID to update was not found."] },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Policy updated successfully.",
      data: updatedPolicy,
    });
  } catch (error: any) {
    console.error("PUT /api/policies/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error.",
        errors: [error.message || "Something went wrong."],
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/policies/[id]
 * Soft-deletes a policy by marking isActive = false
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access.", errors: ["You must be logged in to delete this policy."] },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await PolicyService.softDeletePolicy(id, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, errors: [result.message!] },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Policy deactivated successfully.",
      data: result.policy,
    });
  } catch (error: any) {
    console.error("DELETE /api/policies/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error.", errors: [error.message || "Something went wrong."] },
      { status: 500 }
    );
  }
}
