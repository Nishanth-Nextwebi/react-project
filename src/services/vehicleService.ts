import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import Vehicle from "@/models/Vehicle";
import Customer from "@/models/Customer";
import Policy from "@/models/Policy";

export interface VehiclePaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  includeInactive?: boolean;
  customerId?: string; // Optional filtering by customer
}

export class VehicleService {
  /**
   * Fetch paginated, sorted, and filtered vehicles
   */
  static async listVehicles(params: VehiclePaginationParams) {
    await dbConnect();

    const { page, limit, search, sortBy, sortOrder, includeInactive = false, customerId } = params;
    const skip = (page - 1) * limit;

    // Build query conditions
    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
    }

    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      query.customer = new mongoose.Types.ObjectId(customerId);
    }

    if (search) {
      // Case-insensitive search on Vehicle Number, Engine Number, Chassis Number, Manufacturer, and Model
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { vehicleNumber: searchRegex },
        { engineNumber: searchRegex },
        { chassisNumber: searchRegex },
        { manufacturer: searchRegex },
        { model: searchRegex },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const [vehicles, total] = await Promise.all([
      Vehicle.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate("customer", "name phone email")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email"),
      Vehicle.countDocuments(query),
    ]);

    return {
      vehicles,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a single vehicle by ID
   */
  static async getVehicleById(id: string) {
    await dbConnect();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return await Vehicle.findById(id)
      .populate("customer", "name phone email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
  }

  /**
   * Create a new Vehicle record
   */
  static async createVehicle(data: any, userId: string) {
    await dbConnect();

    // 1. Verify that the associated Customer exists and is active
    const customerExists = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(data.customer),
      isActive: true,
    });
    if (!customerExists) {
      throw new Error("Associated customer not found or is currently inactive.");
    }

    // 2. Enforce uniqueness checks on Vehicle Number, Engine Number, and Chassis Number
    const existingVehicleNumber = await Vehicle.findOne({
      vehicleNumber: data.vehicleNumber.trim().toUpperCase(),
      isActive: true,
    });
    if (existingVehicleNumber) {
      throw new Error("An active vehicle with this vehicle registration number already exists.");
    }

    const existingEngineNumber = await Vehicle.findOne({
      engineNumber: data.engineNumber.trim().toUpperCase(),
      isActive: true,
    });
    if (existingEngineNumber) {
      throw new Error("An active vehicle with this engine number already exists.");
    }

    const existingChassisNumber = await Vehicle.findOne({
      chassisNumber: data.chassisNumber.trim().toUpperCase(),
      isActive: true,
    });
    if (existingChassisNumber) {
      throw new Error("An active vehicle with this chassis number already exists.");
    }

    const newVehicle = new Vehicle({
      ...data,
      vehicleNumber: data.vehicleNumber.trim().toUpperCase(),
      engineNumber: data.engineNumber.trim().toUpperCase(),
      chassisNumber: data.chassisNumber.trim().toUpperCase(),
      createdBy: new mongoose.Types.ObjectId(userId),
      updatedBy: new mongoose.Types.ObjectId(userId),
    });

    return await newVehicle.save();
  }

  /**
   * Update an existing Vehicle record
   */
  static async updateVehicle(id: string, data: any, userId: string) {
    await dbConnect();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    // Check customer reference if modified
    if (data.customer) {
      const customerExists = await Customer.findOne({
        _id: new mongoose.Types.ObjectId(data.customer),
        isActive: true,
      });
      if (!customerExists) {
        throw new Error("Associated customer not found or is currently inactive.");
      }
    }

    // Uniqueness audits for modified unique identifiers
    const queryId = new mongoose.Types.ObjectId(id);

    if (data.vehicleNumber) {
      const duplicateVehicleNumber = await Vehicle.findOne({
        vehicleNumber: data.vehicleNumber.trim().toUpperCase(),
        _id: { $ne: queryId },
        isActive: true,
      });
      if (duplicateVehicleNumber) {
        throw new Error("Another active vehicle is already using this vehicle registration number.");
      }
    }

    if (data.engineNumber) {
      const duplicateEngineNumber = await Vehicle.findOne({
        engineNumber: data.engineNumber.trim().toUpperCase(),
        _id: { $ne: queryId },
        isActive: true,
      });
      if (duplicateEngineNumber) {
        throw new Error("Another active vehicle is already using this engine number.");
      }
    }

    if (data.chassisNumber) {
      const duplicateChassisNumber = await Vehicle.findOne({
        chassisNumber: data.chassisNumber.trim().toUpperCase(),
        _id: { $ne: queryId },
        isActive: true,
      });
      if (duplicateChassisNumber) {
        throw new Error("Another active vehicle is already using this chassis number.");
      }
    }

    const updatePayload: any = { ...data };
    if (data.vehicleNumber) updatePayload.vehicleNumber = data.vehicleNumber.trim().toUpperCase();
    if (data.engineNumber) updatePayload.engineNumber = data.engineNumber.trim().toUpperCase();
    if (data.chassisNumber) updatePayload.chassisNumber = data.chassisNumber.trim().toUpperCase();

    updatePayload.updatedBy = new mongoose.Types.ObjectId(userId);

    return await Vehicle.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, runValidators: true }
    );
  }

  /**
   * Soft delete (deactivate) a Vehicle
   * Strictly enforces business logic: Cannot deactivate if any policies exist for the vehicle.
   */
  static async softDeleteVehicle(id: string, userId: string) {
    await dbConnect();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, status: 404, message: "Vehicle not found." };
    }

    // Check if there are any active policies linked to this vehicle
    const activePoliciesCount = await Policy.countDocuments({
      vehicle: new mongoose.Types.ObjectId(id),
      isActive: true,
    });

    if (activePoliciesCount > 0) {
      return {
        success: false,
        status: 400,
        message: `Cannot deactivate vehicle. There are ${activePoliciesCount} active policy/policies linked to this vehicle.`,
      };
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      id,
      {
        isActive: false,
        updatedBy: new mongoose.Types.ObjectId(userId),
      },
      { new: true }
    );

    if (!updatedVehicle) {
      return { success: false, status: 404, message: "Vehicle not found." };
    }

    return { success: true, vehicle: updatedVehicle };
  }
}
