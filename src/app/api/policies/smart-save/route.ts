import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SmartSaveService } from "@/services/smartSaveService";
import { serializeCustomer } from "../../customers/_serialize";
import { serializeVehicle } from "../../vehicles/_serialize";
import { serializePolicy } from "../_serialize";

const smartSaveService = new SmartSaveService();

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
    const { customer: custData, vehicle: vehData, policy: polData } = body;

    if (!custData || !custData.phone || !custData.name) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: ["Customer name and phone number are required."] },
        { status: 400 }
      );
    }

    if (!vehData || !vehData.vehicleNumber || !vehData.chassisNumber || !vehData.engineNumber) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: ["Vehicle number, engine number, and chassis number are required."] },
        { status: 400 }
      );
    }

    if (!polData || !polData.policyNumber || !polData.insuranceCompany || !polData.policyType) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: ["Policy number, insurance company, and policy type are required."] },
        { status: 400 }
      );
    }

    const result = await smartSaveService.process(
      custData,
      vehData,
      polData,
      session.user.id,
      session.user.name || undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, errors: result.errors },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Insurance processed and Policy created successfully.",
        data: {
          policy: serializePolicy(result.policy),
          customer: serializeCustomer(result.customer),
          vehicle: serializeVehicle(result.vehicle),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/policies/smart-save error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error.", errors: [error.message || "Something went wrong."] },
      { status: 500 }
    );
  }
}
