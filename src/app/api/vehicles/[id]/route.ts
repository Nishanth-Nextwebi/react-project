import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { VehicleService } from "@/services/vehicleService";
import { vehicleSchema } from "@/lib/validations";
import { serializeVehicle } from "../_serialize";

const vehicleService = new VehicleService();

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/vehicles/[id]
 * Retrieves a single vehicle's detailed record
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access.", errors: ["You must be logged in to view this vehicle."] },
        { status: 401 }
      );
    }

    const { id } = await params;
    const vehicle = await vehicleService.getVehicleById(id);

    if (!vehicle) {
      return NextResponse.json(
        { success: false, message: "Vehicle not found.", errors: ["The requested vehicle ID does not exist in the database."] },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Vehicle retrieved successfully.",
      data: serializeVehicle(vehicle),
    });
  } catch (error: any) {
    console.error("GET /api/vehicles/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error.", errors: [error.message || "Something went wrong."] },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/vehicles/[id]
 * Updates an existing vehicle's fields with full Zod validation
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access.", errors: ["You must be logged in to update this vehicle."] },
        { status: 401 }
      );
    }

    const { id } = await params;
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

    const updatedVehicle = await vehicleService.updateVehicle(id, validationResult.data, session.user.id);

    if (!updatedVehicle) {
      return NextResponse.json(
        { success: false, message: "Vehicle not found.", errors: ["The requested vehicle ID to update was not found."] },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Vehicle updated successfully.",
      data: serializeVehicle(updatedVehicle),
    });
  } catch (error: any) {
    console.error("PUT /api/vehicles/[id] error:", error);

    const errorMessage = error.message || "";
    const isConflict = errorMessage.includes("already using");
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

/**
 * DELETE /api/vehicles/[id]
 * Soft-deletes a vehicle by marking isActive = false
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access.", errors: ["You must be logged in to delete this vehicle."] },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await vehicleService.softDeleteVehicle(id, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, errors: [result.message!] },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Vehicle deactivated successfully.",
      data: serializeVehicle(result.vehicle),
    });
  } catch (error: any) {
    console.error("DELETE /api/vehicles/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error.", errors: [error.message || "Something went wrong."] },
      { status: 500 }
    );
  }
}
