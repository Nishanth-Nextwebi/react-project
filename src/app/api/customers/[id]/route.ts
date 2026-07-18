import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { CustomerService } from "@/services/customerService";
import { customerSchema } from "@/lib/validations";

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/customers/[id]
 * Retrieves a single customer's detailed record
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access.", errors: ["You must be logged in to view this customer."] },
        { status: 401 }
      );
    }

    const { id } = await params;
    const customer = await CustomerService.getCustomerById(id);

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found.", errors: ["The requested customer ID does not exist in the database."] },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Customer retrieved successfully.",
      data: customer,
    });
  } catch (error: any) {
    console.error("GET /api/customers/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error.", errors: [error.message || "Something went wrong."] },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/customers/[id]
 * Updates an existing customer's fields with full Zod validation
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access.", errors: ["You must be logged in to update this customer."] },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // Run partial validation or full validation depending on update strategies
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

    const updatedCustomer = await CustomerService.updateCustomer(
      id,
      validationResult.data,
      session.user.id
    );

    if (!updatedCustomer) {
      return NextResponse.json(
        { success: false, message: "Customer not found.", errors: ["The requested customer ID to update was not found."] },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully.",
      data: updatedCustomer,
    });
  } catch (error: any) {
    console.error("PUT /api/customers/[id] error:", error);

    const isConflict = error.message && error.message.includes("already using this phone");
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

/**
 * DELETE /api/customers/[id]
 * Soft-deletes a customer by marking isActive = false
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access.", errors: ["You must be logged in to delete this customer."] },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await CustomerService.softDeleteCustomer(id, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, errors: [result.message!] },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Customer deactivated successfully.",
      data: result.customer,
    });
  } catch (error: any) {
    console.error("DELETE /api/customers/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error.", errors: [error.message || "Something went wrong."] },
      { status: 500 }
    );
  }
}
