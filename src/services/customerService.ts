import { CustomerRepository } from "@/repositories/CustomerRepository";
import { VehicleRepository } from "@/repositories/VehicleRepository";
import type { CustomerInput } from "@/lib/validations";
import type { Prisma } from "@/generated/prisma/client";

export interface CustomerPaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  includeInactive?: boolean;
}

export class CustomerService {
  private readonly repository: CustomerRepository;
  private readonly vehicleRepository: VehicleRepository;

  constructor(
    repository: CustomerRepository = new CustomerRepository(),
    vehicleRepository: VehicleRepository = new VehicleRepository()
  ) {
    this.repository = repository;
    this.vehicleRepository = vehicleRepository;
  }

  /**
   * Fetch paginated, sorted, and filtered customers
   */
  async listCustomers(params: CustomerPaginationParams) {
    const { page, limit, search, sortBy, sortOrder, includeInactive = false } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    if (search) {
      // Case-insensitive search on Name, Phone, and Address
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { address: { contains: search } },
      ];
    }

    const orderBy: Prisma.CustomerOrderByWithRelationInput = { [sortBy]: sortOrder };

    const { customers, total } = await this.repository.findMany({ skip, take: limit, where, orderBy });

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
  async getCustomerById(id: string) {
    return this.repository.findById(id);
  }

  /**
   * Create a new Customer record
   */
  async createCustomer(data: CustomerInput, userId: string) {
    // Check if customer with the same phone number already exists and is active
    const existingActiveCustomer = await this.repository.findActiveByPhone(data.phone.trim());

    if (existingActiveCustomer) {
      throw new Error("A customer with this phone number is already active.");
    }

    return this.repository.create({
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      isActive: data.isActive,
      createdById: userId,
      updatedById: userId,
    });
  }

  /**
   * Update an existing Customer record
   */
  async updateCustomer(id: string, data: CustomerInput, userId: string) {
    // Check phone uniqueness constraints if updated
    if (data.phone) {
      const duplicatePhoneCustomer = await this.repository.findActiveByPhone(data.phone.trim());

      if (duplicatePhoneCustomer && duplicatePhoneCustomer.id !== id) {
        throw new Error("Another customer is already using this phone number.");
      }
    }

    try {
      return await this.repository.update(id, {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        isActive: data.isActive,
        updatedById: userId,
      });
    } catch (error: any) {
      if (error?.code === "P2025") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Soft delete (deactivate) a Customer
   * Strictly enforces business logic: Cannot deactivate if they have active vehicles linked.
   */
  async softDeleteCustomer(id: string, userId: string) {
    const activeVehiclesCount = await this.vehicleRepository.countActiveByCustomer(id);

    if (activeVehiclesCount > 0) {
      return {
        success: false as const,
        status: 400,
        message: `Cannot deactivate customer. There are ${activeVehiclesCount} active vehicle(s) linked to this account.`,
      };
    }

    try {
      const updatedCustomer = await this.repository.update(id, { isActive: false, updatedById: userId });
      return { success: true as const, customer: updatedCustomer };
    } catch (error: any) {
      if (error?.code === "P2025") {
        return { success: false as const, status: 404, message: "Customer not found." };
      }
      throw error;
    }
  }
}
