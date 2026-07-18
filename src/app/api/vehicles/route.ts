import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { VehicleService } from "@/services/vehicleService";
import { vehicleSchema } from "@/lib/validations";
import { serializeVehicle } from "./_serialize";

const vehicleService = new VehicleService();

/**
 * GET /api/vehicles
 * Returns a list of paginated, sorted, and filtered vehicles
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

    const data = await vehicleService.listVehicles({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      includeInactive,
      customerId,
    });

    return NextResponse.json({
      success: true,
      message: "Vehicles retrieved successfully.",
      data: {
        vehicles: data.vehicles.map(serializeVehicle),
        pagination: data.pagination,
      },
    });
  } catch (error: any) {
    console.error("GET /api/vehicles error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error.", errors: [error.message || "Something went wrong."] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vehicles
 * Creates a new vehicle record with strict validation checks
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

    const validationResult = vehicleSchema.safeParse(body);
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

    const createdVehicle = await vehicleService.createVehicle(validationResult.data, session.user.id);

    return NextResponse.json(
      {
        success: true,
        message: "Vehicle registered successfully.",
        data: serializeVehicle(createdVehicle),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/vehicles error:", error);

    const errorMessage = error.message || "";
    const isConflict = errorMessage.includes("already exists");
    const isNotFound = errorMessage.includes("customer not found");

    let status = 500;
    if (isConflict) status = 409;
    else if (isNotFound) status = 404;

    return NextResponse.json(
      {
        success: false,
        message: isConflict ? "Conflict detected." : isNotFound ? "Not Found." : "Internal server error.",
        errors: [error.message || "Something went wrong."],
      },
      { status }
    );
  }
}
