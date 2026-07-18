import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import Vehicle from "@/models/Vehicle";
import Policy from "@/models/Policy";
import mongoose from "mongoose";
import { ActivityService } from "@/services/activityService";

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

    await dbConnect();
    const userId = session.user.id;

    // --- STEP 1: Process Customer ---
    const phoneClean = custData.phone.trim();
    let customerObj = await Customer.findOne({ phone: phoneClean, isActive: true });

    if (customerObj) {
      // Reuse existing customer. Optionally update fields to match latest details entered
      customerObj.name = custData.name.trim();
      if (custData.email !== undefined) customerObj.email = custData.email.trim();
      if (custData.address !== undefined) customerObj.address = custData.address.trim();
      customerObj.updatedBy = new mongoose.Types.ObjectId(userId);
      await customerObj.save();
      await ActivityService.log(userId, session.user.name || undefined, "User Actions", `Updated details for customer "${customerObj.name}"`);
    } else {
      // Create new customer
      customerObj = new Customer({
        name: custData.name.trim(),
        phone: phoneClean,
        email: custData.email ? custData.email.trim() : "",
        address: custData.address ? custData.address.trim() : "",
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(userId),
        updatedBy: new mongoose.Types.ObjectId(userId),
      });
      await customerObj.save();
      await ActivityService.log(userId, session.user.name || undefined, "Customer Created", `Created customer profile for "${customerObj.name}"`);
    }

    const customerId = customerObj._id;

    // --- STEP 2: Process Vehicle ---
    const vehicleNumClean = vehData.vehicleNumber.trim().toUpperCase();
    const chassisNumClean = vehData.chassisNumber.trim().toUpperCase();
    const engineNumClean = vehData.engineNumber.trim().toUpperCase();

    // Search Vehicle by Vehicle Number OR Chassis Number
    let vehicleObj = await Vehicle.findOne({
      $or: [
        { vehicleNumber: vehicleNumClean },
        { chassisNumber: chassisNumClean }
      ],
      isActive: true
    });

    if (vehicleObj) {
      // Reuse existing vehicle.
      // Make sure it belongs to the resolved customer
      vehicleObj.customer = customerId as any;
      vehicleObj.vehicleType = vehData.vehicleType || vehicleObj.vehicleType;
      vehicleObj.manufacturer = vehData.manufacturer || vehicleObj.manufacturer;
      vehicleObj.model = vehData.model || vehicleObj.model;
      vehicleObj.year = vehData.year || vehicleObj.year;
      vehicleObj.engineNumber = engineNumClean;
      vehicleObj.chassisNumber = chassisNumClean;
      vehicleObj.color = vehData.color || vehicleObj.color;
      vehicleObj.updatedBy = new mongoose.Types.ObjectId(userId);
      await vehicleObj.save();
      await ActivityService.log(userId, session.user.name || undefined, "User Actions", `Updated vehicle details for ${vehicleObj.vehicleNumber}`);
    } else {
      // Check engine number uniqueness separately to prevent duplicate active engine number crash
      const duplicateEngine = await Vehicle.findOne({ engineNumber: engineNumClean, isActive: true });
      if (duplicateEngine) {
        return NextResponse.json(
          { success: false, message: "Engine number already exists.", errors: ["An active vehicle with this engine number is already registered."] },
          { status: 400 }
        );
      }

      // Check registration plate uniqueness separately
      const duplicatePlate = await Vehicle.findOne({ vehicleNumber: vehicleNumClean, isActive: true });
      if (duplicatePlate) {
        return NextResponse.json(
          { success: false, message: "Vehicle registration number already exists.", errors: ["An active vehicle with this registration number is already registered."] },
          { status: 400 }
        );
      }

      // Check chassis uniqueness separately
      const duplicateChassis = await Vehicle.findOne({ chassisNumber: chassisNumClean, isActive: true });
      if (duplicateChassis) {
        return NextResponse.json(
          { success: false, message: "Chassis number already exists.", errors: ["An active vehicle with this chassis number is already registered."] },
          { status: 400 }
        );
      }

      // Create new vehicle
      vehicleObj = new Vehicle({
        customer: customerId,
        vehicleNumber: vehicleNumClean,
        vehicleType: vehData.vehicleType,
        manufacturer: vehData.manufacturer.trim(),
        model: vehData.model.trim(),
        year: parseInt(vehData.year, 10),
        engineNumber: engineNumClean,
        chassisNumber: chassisNumClean,
        color: vehData.color ? vehData.color.trim() : "",
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(userId),
        updatedBy: new mongoose.Types.ObjectId(userId),
      });
      await vehicleObj.save();
      await ActivityService.log(userId, session.user.name || undefined, "Vehicle Created", `Registered vehicle ${vehicleObj.manufacturer} ${vehicleObj.model} (${vehicleObj.vehicleNumber})`);
    }

    const vehicleId = vehicleObj._id;

    // --- STEP 3: Always Create a NEW Policy ---
    const polNumClean = polData.policyNumber.trim().toUpperCase();

    // Verify policy number is unique globally
    const duplicatePolicy = await Policy.findOne({ policyNumber: polNumClean });
    if (duplicatePolicy) {
      return NextResponse.json(
        { success: false, message: "Policy number already exists.", errors: [`A policy with number '${polNumClean}' already exists.`] },
        { status: 400 }
      );
    }

    const policyObj = new Policy({
      customer: customerId,
      vehicle: vehicleId,
      policyNumber: polNumClean,
      insuranceCompany: polData.insuranceCompany.trim(),
      policyType: polData.policyType.trim(),
      premiumAmount: parseFloat(polData.premiumAmount),
      startDate: new Date(polData.startDate),
      expiryDate: new Date(polData.expiryDate),
      extraField1: polData.extraField1 ? polData.extraField1.trim() : "",
      extraField2: polData.extraField2 ? polData.extraField2.trim() : "",
      extraField3: polData.extraField3 ? polData.extraField3.trim() : "",
      comments: polData.comments ? polData.comments.trim() : "",
      attachmentUrl: polData.attachmentUrl ? polData.attachmentUrl.trim() : "",
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(userId),
      updatedBy: new mongoose.Types.ObjectId(userId),
    });

    await policyObj.save();

    const isRenewal = polData.comments?.toLowerCase().includes("renewal") || false;
    await ActivityService.log(
      userId,
      session.user.name || undefined,
      isRenewal ? "Policy Renewed" : "Policy Created",
      `${isRenewal ? "Renewed" : "Created"} policy #${polNumClean} under ${polData.insuranceCompany}`
    );

    return NextResponse.json({
      success: true,
      message: "Insurance processed and Policy created successfully.",
      data: {
        policy: policyObj,
        customer: customerObj,
        vehicle: vehicleObj,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST /api/policies/smart-save error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error.", errors: [error.message || "Something went wrong."] },
      { status: 500 }
    );
  }
}
