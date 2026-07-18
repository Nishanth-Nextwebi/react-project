import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import Policy, { IPolicy } from "@/models/Policy";
import Customer from "@/models/Customer";
import Vehicle from "@/models/Vehicle";

export interface PolicyPaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  includeInactive?: boolean;
  customerId?: string;
  vehicleId?: string;
}

export class PolicyService {
  /**
   * Fetch paginated, sorted, and filtered policies
   */
  static async listPolicies(params: PolicyPaginationParams) {
    await dbConnect();

    const { page, limit, search, sortBy, sortOrder, includeInactive = false, customerId, vehicleId } = params;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
    }

    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      query.customer = new mongoose.Types.ObjectId(customerId);
    }

    if (vehicleId && mongoose.Types.ObjectId.isValid(vehicleId)) {
      query.vehicle = new mongoose.Types.ObjectId(vehicleId);
    }

    if (search) {
      // Case-insensitive search on Policy Number or Insurance Company
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { policyNumber: searchRegex },
        { insuranceCompany: searchRegex },
        { policyType: searchRegex },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const [policies, total] = await Promise.all([
      Policy.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate("customer", "name phone email address")
        .populate("vehicle", "vehicleNumber vehicleType manufacturer model year chassisNumber engineNumber")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email"),
      Policy.countDocuments(query),
    ]);

    return {
      policies,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a single policy by ID
   */
  static async getPolicyById(id: string) {
    await dbConnect();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return await Policy.findById(id)
      .populate("customer", "name phone email address")
      .populate("vehicle", "vehicleNumber vehicleType manufacturer model year chassisNumber engineNumber")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
  }

  /**
   * Create a new Policy record
   */
  static async createPolicy(data: any, userId: string) {
    await dbConnect();

    // Verify customer exists
    const customerExists = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(data.customer),
    });
    if (!customerExists) {
      throw new Error("Associated customer not found.");
    }

    // Verify vehicle exists
    const vehicleExists = await Vehicle.findOne({
      _id: new mongoose.Types.ObjectId(data.vehicle),
    });
    if (!vehicleExists) {
      throw new Error("Associated vehicle not found.");
    }

    // Check if policy number is already in use
    const existingPolicy = await Policy.findOne({
      policyNumber: data.policyNumber.trim().toUpperCase(),
    });
    if (existingPolicy) {
      throw new Error(`A policy with the number '${data.policyNumber.trim().toUpperCase()}' already exists.`);
    }

    const newPolicy = new Policy({
      ...data,
      policyNumber: data.policyNumber.trim().toUpperCase(),
      createdBy: new mongoose.Types.ObjectId(userId),
      updatedBy: new mongoose.Types.ObjectId(userId),
    });

    return await newPolicy.save();
  }

  /**
   * Update an existing Policy record
   */
  static async updatePolicy(id: string, data: any, userId: string) {
    await dbConnect();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const queryId = new mongoose.Types.ObjectId(id);

    if (data.policyNumber) {
      const duplicatePolicy = await Policy.findOne({
        policyNumber: data.policyNumber.trim().toUpperCase(),
        _id: { $ne: queryId },
      });
      if (duplicatePolicy) {
        throw new Error(`Another policy with number '${data.policyNumber.trim().toUpperCase()}' already exists.`);
      }
    }

    const updatePayload = {
      ...data,
      updatedBy: new mongoose.Types.ObjectId(userId),
    };
    if (data.policyNumber) {
      updatePayload.policyNumber = data.policyNumber.trim().toUpperCase();
    }

    return await Policy.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, runValidators: true }
    );
  }

  /**
   * Delete or deactivate a Policy (Soft delete by default)
   */
  static async softDeletePolicy(id: string, userId: string) {
    await dbConnect();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, status: 404, message: "Policy not found." };
    }

    const updatedPolicy = await Policy.findByIdAndUpdate(
      id,
      {
        isActive: false,
        updatedBy: new mongoose.Types.ObjectId(userId),
      },
      { new: true }
    );

    if (!updatedPolicy) {
      return { success: false, status: 404, message: "Policy not found." };
    }

    return { success: true, policy: updatedPolicy };
  }
}
