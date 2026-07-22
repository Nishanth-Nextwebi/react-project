import { CustomerRepository } from "@/repositories/CustomerRepository";
import { PolicyRepository } from "@/repositories/PolicyRepository";
import { VehicleRepository } from "@/repositories/VehicleRepository";
import { transaction } from "@/lib/database";
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

/** Raised inside the deleteCustomer transaction to abort before anything is
 * written - an active policy blocks the whole operation. */
class CustomerDeletionBlockedError extends Error {}

export class CustomerService {
  private readonly repository: CustomerRepository;

  constructor(repository: CustomerRepository = new CustomerRepository()) {
    this.repository = repository;
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
   * Permanently deletes a Customer (hard delete, not soft delete) together
   * with every Policy and Vehicle that belongs to them - atomically.
   *
   * Blocked entirely, with nothing written, if the customer has an active
   * Policy. Once that check passes, child records are deleted explicitly in
   * dependency order (Policies, then Vehicles, then the Customer) inside a
   * single transaction, so a foreign-key conflict can never occur here - do
   * not reintroduce a P2003 catch for this flow, it would mean the explicit
   * delete order above was broken.
   */
  async deleteCustomer(id: string) {
    try {
      const customer = await transaction(async (tx) => {
        const customerRepository = new CustomerRepository(tx);
        const policyRepository = new PolicyRepository(tx);
        const vehicleRepository = new VehicleRepository(tx);

        const activePoliciesCount = await policyRepository.countActiveByCustomer(id);
        if (activePoliciesCount > 0) {
          throw new CustomerDeletionBlockedError(
            "This customer has an active policy. Please cancel or complete the policy before deleting the customer."
          );
        }

        // Only inactive/expired/cancelled policies can remain at this point.
        await policyRepository.deleteManyByCustomer(id);
        await vehicleRepository.deleteManyByCustomer(id);
        return customerRepository.delete(id);
      });

      return { success: true as const, customer };
    } catch (error: any) {
      if (error instanceof CustomerDeletionBlockedError) {
        return { success: false as const, status: 400, message: error.message };
      }
      if (error?.code === "P2025") {
        return { success: false as const, status: 404, message: "Customer not found." };
      }
      throw error;
    }
  }
}
