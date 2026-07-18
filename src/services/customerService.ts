import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import Customer, { ICustomer } from "@/models/Customer";
import Vehicle from "@/models/Vehicle";

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  includeInactive?: boolean;
}

export class CustomerService {
  /**
   * Fetch paginated, sorted, and filtered customers
   */
  static async listCustomers(params: PaginationParams) {
    await dbConnect();

    const { page, limit, search, sortBy, sortOrder, includeInactive = false } = params;
    const skip = (page - 1) * limit;

    // Build query conditions
    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
    }

    if (search) {
      // Build a case-insensitive search regex for Name, Phone, and Address
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { address: searchRegex },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email"),
      Customer.countDocuments(query),
    ]);

    return {
      customers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a single customer by ID
   */
  static async getCustomerById(id: string) {
    await dbConnect();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return await Customer.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
  }

  /**
   * Create a new Customer record
   */
  static async createCustomer(data: any, userId: string) {
    await dbConnect();
    
    // Check if customer with the same phone number already exists and is active
    const existingActiveCustomer = await Customer.findOne({
      phone: data.phone.trim(),
      isActive: true,
    });

    if (existingActiveCustomer) {
      throw new Error("A customer with this phone number is already active.");
    }

    const newCustomer = new Customer({
      ...data,
      createdBy: new mongoose.Types.ObjectId(userId),
      updatedBy: new mongoose.Types.ObjectId(userId),
    });

    return await newCustomer.save();
  }

  /**
   * Update an existing Customer record
   */
  static async updateCustomer(id: string, data: any, userId: string) {
    await dbConnect();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    // Check phone uniqueness constraints if updated
    if (data.phone) {
      const duplicatePhoneCustomer = await Customer.findOne({
        phone: data.phone.trim(),
        _id: { $ne: new mongoose.Types.ObjectId(id) },
        isActive: true,
      });

      if (duplicatePhoneCustomer) {
        throw new Error("Another customer is already using this phone number.");
      }
    }

    return await Customer.findByIdAndUpdate(
      id,
      {
        ...data,
        updatedBy: new mongoose.Types.ObjectId(userId),
      },
      { new: true, runValidators: true }
    );
  }

  /**
   * Soft delete (deactivate) a Customer
   * Strictly enforces business logic: Cannot deactivate if they have active vehicles linked.
   */
  static async softDeleteCustomer(id: string, userId: string) {
    await dbConnect();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, status: 404, message: "Customer not found." };
    }

    // Check if there are any active vehicles linked to this customer
    const activeVehiclesCount = await Vehicle.countDocuments({
      customer: new mongoose.Types.ObjectId(id),
      isActive: true,
    });

    if (activeVehiclesCount > 0) {
      return {
        success: false,
        status: 400,
        message: `Cannot deactivate customer. There are ${activeVehiclesCount} active vehicle(s) linked to this account.`,
      };
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      {
        isActive: false,
        updatedBy: new mongoose.Types.ObjectId(userId),
      },
      { new: true }
    );

    if (!updatedCustomer) {
      return { success: false, status: 404, message: "Customer not found." };
    }

    return { success: true, customer: updatedCustomer };
  }
}
