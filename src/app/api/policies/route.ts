import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PolicyService } from "@/services/policyService";
import { policySchema } from "@/lib/validations";

/**
 * GET /api/policies
 * Returns a list of paginated, sorted, and filtered policies
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access.", errors: ["You must be logged in to access this resource."] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));
    const search = searchParams.get("search") || undefined;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") === "asc" ? "asc" : "desc";
    const includeInactive = searchParams.get("includeInactive") === "true";
    const customerId = searchParams.get("customerId") || undefined;
    const vehicleId = searchParams.get("vehicleId") || undefined;

    const data = await PolicyService.listPolicies({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      includeInactive,
      customerId,
      vehicleId,
    });

    return NextResponse.json({
      success: true,
      message: "Policies retrieved successfully.",
      data,
    });
  } catch (error: any) {
    console.error("GET /api/policies error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error.", errors: [error.message || "Something went wrong."] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/policies
 * Creates a new policy record with strict Zod validation
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access.", errors: ["You must be logged in to perform this action."] },
        { status: 401 }
      );
    }

    const body = await req.json();
    
    // Validate request body against Zod validation rules
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

    const createdPolicy = await PolicyService.createPolicy(
      validationResult.data,
      session.user.id
    );

    return NextResponse.json(
      {
        success: true,
        message: "Policy created successfully.",
        data: createdPolicy,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/policies error:", error);
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
