import { PolicyRepository } from "@/repositories/PolicyRepository";
import { CustomerRepository } from "@/repositories/CustomerRepository";
import { VehicleRepository } from "@/repositories/VehicleRepository";
import type { PolicyInput } from "@/lib/validations";
import type { Prisma } from "@/generated/prisma/client";

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
  private readonly repository: PolicyRepository;
  private readonly customerRepository: CustomerRepository;
  private readonly vehicleRepository: VehicleRepository;

  constructor(
    repository: PolicyRepository = new PolicyRepository(),
    customerRepository: CustomerRepository = new CustomerRepository(),
    vehicleRepository: VehicleRepository = new VehicleRepository()
  ) {
    this.repository = repository;
    this.customerRepository = customerRepository;
    this.vehicleRepository = vehicleRepository;
  }

  /**
   * Fetch paginated, sorted, and filtered policies
   */
  async listPolicies(params: PolicyPaginationParams) {
    const { page, limit, search, sortBy, sortOrder, includeInactive = false, customerId, vehicleId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PolicyWhereInput = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    if (search) {
      // Case-insensitive search on Policy Number, Insurance Company, or Policy Type
      where.OR = [
        { policyNumber: { contains: search } },
        { insuranceCompany: { contains: search } },
        { policyType: { contains: search } },
      ];
    }

    const orderBy: Prisma.PolicyOrderByWithRelationInput = { [sortBy]: sortOrder };

    const { policies, total } = await this.repository.findMany({ skip, take: limit, where, orderBy });

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
  async getPolicyById(id: string) {
    return this.repository.findById(id);
  }

  /**
   * Create a new Policy record. Unlike vehicle creation, customer/vehicle
   * existence checks here do NOT filter on isActive - matches the original
   * PolicyService.createPolicy exactly.
   */
  async createPolicy(data: PolicyInput, userId: string) {
    const customerExists = await this.customerRepository.findById(data.customer as string);
    if (!customerExists) {
      throw new Error("Associated customer not found.");
    }

    const vehicleExists = await this.vehicleRepository.findById(data.vehicle as string);
    if (!vehicleExists) {
      throw new Error("Associated vehicle not found.");
    }

    const policyNumberClean = data.policyNumber.trim().toUpperCase();
    const existingPolicy = await this.repository.findByPolicyNumber(policyNumberClean);
    if (existingPolicy) {
      throw new Error(`A policy with the number '${policyNumberClean}' already exists.`);
    }

    return this.repository.create({
      customerId: data.customer as string,
      vehicleId: data.vehicle as string,
      policyNumber: policyNumberClean,
      insuranceCompany: data.insuranceCompany,
      policyType: data.policyType,
      premiumAmount: data.premiumAmount,
      startDate: data.startDate,
      expiryDate: data.expiryDate,
      extraField1: data.extraField1,
      extraField2: data.extraField2,
      extraField3: data.extraField3,
      comments: data.comments,
      attachmentUrl: data.attachmentUrl,
      isActive: data.isActive,
      createdById: userId,
      updatedById: userId,
    });
  }

  /**
   * Update an existing Policy record
   */
  async updatePolicy(id: string, data: PolicyInput, userId: string) {
    let policyNumberClean: string | undefined;
    if (data.policyNumber) {
      policyNumberClean = data.policyNumber.trim().toUpperCase();
      const duplicatePolicy = await this.repository.findByPolicyNumber(policyNumberClean);
      if (duplicatePolicy && duplicatePolicy.id !== id) {
        throw new Error(`Another policy with number '${policyNumberClean}' already exists.`);
      }
    }

    try {
      return await this.repository.update(id, {
        customerId: data.customer as string | undefined,
        vehicleId: data.vehicle as string | undefined,
        policyNumber: policyNumberClean,
        insuranceCompany: data.insuranceCompany,
        policyType: data.policyType,
        premiumAmount: data.premiumAmount,
        startDate: data.startDate,
        expiryDate: data.expiryDate,
        extraField1: data.extraField1,
        extraField2: data.extraField2,
        extraField3: data.extraField3,
        comments: data.comments,
        attachmentUrl: data.attachmentUrl,
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
   * Delete or deactivate a Policy (Soft delete by default)
   */
  async softDeletePolicy(id: string, userId: string) {
    try {
      const updatedPolicy = await this.repository.update(id, { isActive: false, updatedById: userId });
      return { success: true as const, policy: updatedPolicy };
    } catch (error: any) {
      if (error?.code === "P2025") {
        return { success: false as const, status: 404, message: "Policy not found." };
      }
      throw error;
    }
  }
}
