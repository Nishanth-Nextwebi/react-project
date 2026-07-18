import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { CustomerService } from "@/services/customerService";
import { customerSchema } from "@/lib/validations";
import { serializeCustomer } from "./_serialize";

const customerService = new CustomerService();

/**
 * GET /api/customers
 * Returns a list of paginated, sorted, and filtered customers
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

    const data = await customerService.listCustomers({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      includeInactive,
    });

    return NextResponse.json({
      success: true,
      message: "Customers retrieved successfully.",
      data: {
        customers: data.customers.map(serializeCustomer),
        pagination: data.pagination,
      },
    });
  } catch (error: any) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error.", errors: [error.message || "Something went wrong."] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers
 * Creates a new customer record with strict Zod validation
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

    const validationResult = customerSchema.safeParse(body);
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

    const createdCustomer = await customerService.createCustomer(validationResult.data, session.user.id);

    return NextResponse.json(
      {
        success: true,
        message: "Customer created successfully.",
        data: serializeCustomer(createdCustomer),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/customers error:", error);

    const isConflict = error.message && error.message.includes("already active");
    return NextResponse.json(
      {
        success: false,
        message: isConflict ? "Conflict detected." : "Internal server error.",
        errors: [error.message || "Something went wrong."],
      },
      { status: isConflict ? 409 : 500 }
    );
  }
}
