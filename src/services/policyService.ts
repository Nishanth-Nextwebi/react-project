import { PolicyRepository } from "@/repositories/PolicyRepository";
import { CustomerRepository } from "@/repositories/CustomerRepository";
import { VehicleRepository } from "@/repositories/VehicleRepository";
import type { PolicyInput } from "@/lib/validations";
import type { Prisma } from "@/generated/prisma/client";

export type PolicyStatusFilter = "active" | "expired" | "expiringSoon" | "today" | "newThisMonth";

export interface PolicyPaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  includeInactive?: boolean;
  customerId?: string;
  vehicleId?: string;
  /** Distinct listing-page filters (all AND-combined) - separate from `search`, which
   * remains a single-box OR search used only by the Reports page autocomplete. */
  customerName?: string;
  policyNumber?: string;
  phone?: string;
  city?: string;
  vehicleNumber?: string;
  insuranceCompany?: string;
  expiryFrom?: string;
  expiryTo?: string;
  /** Mirrors the dashboard stat-card definitions exactly (DashboardService.getDashboardData),
   * so clicking a card and filtering by the equivalent status here return the same count. */
  status?: PolicyStatusFilter;
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
    const {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      includeInactive = false,
      customerId,
      vehicleId,
      customerName,
      policyNumber,
      phone,
      city,
      vehicleNumber,
      insuranceCompany,
      expiryFrom,
      expiryTo,
      status,
    } = params;
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
      // Only used by the Reports page's single-box autocomplete lookup.
      where.OR = [
        { policyNumber: { contains: search } },
        { insuranceCompany: { contains: search } },
        { policyType: { contains: search } },
      ];
    }

    if (policyNumber) {
      where.policyNumber = { contains: policyNumber };
    }

    if (insuranceCompany) {
      where.insuranceCompany = { contains: insuranceCompany };
    }

    if (customerName || phone || city) {
      where.customer = {
        ...(customerName ? { name: { contains: customerName } } : {}),
        ...(phone ? { phone: { contains: phone } } : {}),
        ...(city ? { city: { contains: city } } : {}),
      };
    }

    if (vehicleNumber) {
      where.vehicle = { vehicleNumber: { contains: vehicleNumber } };
    }

    // `status` mirrors a dashboard stat card exactly and takes precedence over a
    // manually-entered expiry date range, since the two are meant as alternatives
    // (deep-linking from the dashboard vs. filtering by hand).
    if (status) {
      where.isActive = true;
      const now = new Date();
      if (status === "active") {
        where.expiryDate = { gt: now };
      } else if (status === "expired") {
        where.expiryDate = { lte: now };
      } else if (status === "expiringSoon") {
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        where.expiryDate = { gt: now, lte: thirtyDaysLater };
      } else if (status === "today") {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        where.expiryDate = { gte: todayStart, lte: todayEnd };
      } else if (status === "newThisMonth") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        where.createdAt = { gte: monthStart };
      }
    } else if (expiryFrom || expiryTo) {
      where.expiryDate = {
        ...(expiryFrom ? { gte: new Date(expiryFrom) } : {}),
        ...(expiryTo ? { lte: new Date(`${expiryTo}T23:59:59.999`) } : {}),
      };
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
      loanProvider: data.loanProvider,
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
        loanProvider: data.loanProvider,
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
   * Records a follow-up contact (Call/WhatsApp click from the Track FollowUp
   * page) as a formatted date-time string, computed server-side so it can't
   * be spoofed by a stale client clock.
   */
  async recordFollowUp(id: string, userId: string) {
    const timestamp = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      const policy = await this.repository.update(id, { lastFollowUpAt: timestamp, updatedById: userId });
      return { success: true as const, policy };
    } catch (error: any) {
      if (error?.code === "P2025") {
        return { success: false as const, status: 404, message: "Policy not found." };
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
