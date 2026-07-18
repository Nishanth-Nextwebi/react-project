import { VehicleRepository } from "@/repositories/VehicleRepository";
import { CustomerRepository } from "@/repositories/CustomerRepository";
import { PolicyRepository } from "@/repositories/PolicyRepository";
import type { VehicleInput } from "@/lib/validations";
import type { Prisma } from "@/generated/prisma/client";

export interface VehiclePaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  includeInactive?: boolean;
  customerId?: string;
}

export class VehicleService {
  private readonly repository: VehicleRepository;
  private readonly customerRepository: CustomerRepository;
  private readonly policyRepository: PolicyRepository;

  constructor(
    repository: VehicleRepository = new VehicleRepository(),
    customerRepository: CustomerRepository = new CustomerRepository(),
    policyRepository: PolicyRepository = new PolicyRepository()
  ) {
    this.repository = repository;
    this.customerRepository = customerRepository;
    this.policyRepository = policyRepository;
  }

  /**
   * Fetch paginated, sorted, and filtered vehicles
   */
  async listVehicles(params: VehiclePaginationParams) {
    const { page, limit, search, sortBy, sortOrder, includeInactive = false, customerId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      // Case-insensitive search on Vehicle Number, Engine Number, Chassis Number, Manufacturer, and Model
      where.OR = [
        { vehicleNumber: { contains: search } },
        { engineNumber: { contains: search } },
        { chassisNumber: { contains: search } },
        { manufacturer: { contains: search } },
        { model: { contains: search } },
      ];
    }

    const orderBy: Prisma.VehicleOrderByWithRelationInput = { [sortBy]: sortOrder };

    const { vehicles, total } = await this.repository.findMany({ skip, take: limit, where, orderBy });

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
  async getVehicleById(id: string) {
    return this.repository.findById(id);
  }

  /**
   * Create a new Vehicle record
   */
  async createVehicle(data: VehicleInput, userId: string) {
    // 1. Verify that the associated Customer exists and is active
    const customer = await this.customerRepository.findById(data.customer);
    if (!customer || !customer.isActive) {
      throw new Error("Associated customer not found or is currently inactive.");
    }

    // 2. Enforce uniqueness checks on Vehicle Number, Engine Number, and Chassis Number
    if (await this.repository.findActiveByField("vehicleNumber", data.vehicleNumber)) {
      throw new Error("An active vehicle with this vehicle registration number already exists.");
    }

    if (await this.repository.findActiveByField("engineNumber", data.engineNumber)) {
      throw new Error("An active vehicle with this engine number already exists.");
    }

    if (await this.repository.findActiveByField("chassisNumber", data.chassisNumber)) {
      throw new Error("An active vehicle with this chassis number already exists.");
    }

    return this.repository.create({
      customerId: data.customer,
      vehicleNumber: data.vehicleNumber,
      vehicleType: data.vehicleType,
      manufacturer: data.manufacturer,
      model: data.model,
      year: data.year,
      engineNumber: data.engineNumber,
      chassisNumber: data.chassisNumber,
      color: data.color,
      isActive: data.isActive,
      createdById: userId,
      updatedById: userId,
    });
  }

  /**
   * Update an existing Vehicle record
   */
  async updateVehicle(id: string, data: VehicleInput, userId: string) {
    // Check customer reference if modified
    if (data.customer) {
      const customer = await this.customerRepository.findById(data.customer);
      if (!customer || !customer.isActive) {
        throw new Error("Associated customer not found or is currently inactive.");
      }
    }

    // Uniqueness audits for modified unique identifiers
    if (data.vehicleNumber) {
      const duplicateVehicleNumber = await this.repository.findActiveByField("vehicleNumber", data.vehicleNumber);
      if (duplicateVehicleNumber && duplicateVehicleNumber.id !== id) {
        throw new Error("Another active vehicle is already using this vehicle registration number.");
      }
    }

    if (data.engineNumber) {
      const duplicateEngineNumber = await this.repository.findActiveByField("engineNumber", data.engineNumber);
      if (duplicateEngineNumber && duplicateEngineNumber.id !== id) {
        throw new Error("Another active vehicle is already using this engine number.");
      }
    }

    if (data.chassisNumber) {
      const duplicateChassisNumber = await this.repository.findActiveByField("chassisNumber", data.chassisNumber);
      if (duplicateChassisNumber && duplicateChassisNumber.id !== id) {
        throw new Error("Another active vehicle is already using this chassis number.");
      }
    }

    try {
      return await this.repository.update(id, {
        customerId: data.customer,
        vehicleNumber: data.vehicleNumber,
        vehicleType: data.vehicleType,
        manufacturer: data.manufacturer,
        model: data.model,
        year: data.year,
        engineNumber: data.engineNumber,
        chassisNumber: data.chassisNumber,
        color: data.color,
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
   * Soft delete (deactivate) a Vehicle
   * Strictly enforces business logic: Cannot deactivate if any policies exist for the vehicle.
   */
  async softDeleteVehicle(id: string, userId: string) {
    const activePoliciesCount = await this.policyRepository.countActiveByVehicle(id);

    if (activePoliciesCount > 0) {
      return {
        success: false as const,
        status: 400,
        message: `Cannot deactivate vehicle. There are ${activePoliciesCount} active policy/policies linked to this vehicle.`,
      };
    }

    try {
      const updatedVehicle = await this.repository.update(id, { isActive: false, updatedById: userId });
      return { success: true as const, vehicle: updatedVehicle };
    } catch (error: any) {
      if (error?.code === "P2025") {
        return { success: false as const, status: 404, message: "Vehicle not found." };
      }
      throw error;
    }
  }
}
