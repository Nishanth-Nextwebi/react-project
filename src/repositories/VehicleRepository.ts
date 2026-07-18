import { db } from "@/lib/database";
import type { Database } from "@/lib/database";
import type { Prisma } from "@/generated/prisma/client";
import { VehicleType } from "@/generated/prisma/enums";
import { generateObjectId } from "@/lib/objectId";

const AUDIT_SELECT = { id: true, name: true, email: true } as const;
const CUSTOMER_SELECT = { id: true, name: true, phone: true, email: true } as const;

export type WireVehicleType = "Two-Wheeler" | "Four-Wheeler" | "Commercial" | "Other";

// Prisma enum identifiers can't contain hyphens, so the schema maps
// TwoWheeler -> "Two-Wheeler" etc via @map. The client only ever hands back
// the Prisma-side identifier, so this table translates it back to the exact
// wire value the frontend/Zod schema expect - matching the original
// Mongoose string-enum values exactly.
const WIRE_TO_PRISMA_VEHICLE_TYPE: Record<WireVehicleType, VehicleType> = {
  "Two-Wheeler": VehicleType.TwoWheeler,
  "Four-Wheeler": VehicleType.FourWheeler,
  Commercial: VehicleType.Commercial,
  Other: VehicleType.Other,
};

const PRISMA_TO_WIRE_VEHICLE_TYPE: Record<VehicleType, WireVehicleType> = {
  [VehicleType.TwoWheeler]: "Two-Wheeler",
  [VehicleType.FourWheeler]: "Four-Wheeler",
  [VehicleType.Commercial]: "Commercial",
  [VehicleType.Other]: "Other",
};

export function toWireVehicleType(value: VehicleType): WireVehicleType {
  return PRISMA_TO_WIRE_VEHICLE_TYPE[value];
}

/** Translates a full Vehicle record's own vehicleType field back to the wire
 * value before it's returned from this repository - every query method
 * below must pass its result(s) through this, or the API will leak the
 * internal Prisma enum identifier (e.g. "FourWheeler") instead of the
 * hyphenated value ("Four-Wheeler") the frontend/Zod schema expect. */
function toWireVehicle<T extends { vehicleType: VehicleType }>(vehicle: T) {
  return { ...vehicle, vehicleType: toWireVehicleType(vehicle.vehicleType) };
}

export interface VehicleListParams {
  skip: number;
  take: number;
  where: Prisma.VehicleWhereInput;
  orderBy: Prisma.VehicleOrderByWithRelationInput;
}

export interface CreateVehicleData {
  customerId: string;
  vehicleNumber: string;
  vehicleType: WireVehicleType;
  manufacturer: string;
  model: string;
  year: number;
  engineNumber: string;
  chassisNumber: string;
  color?: string;
  isActive?: boolean;
  createdById: string;
  updatedById: string;
}

export interface UpdateVehicleData {
  customerId?: string;
  vehicleNumber?: string;
  vehicleType?: WireVehicleType;
  manufacturer?: string;
  model?: string;
  year?: number;
  engineNumber?: string;
  chassisNumber?: string;
  color?: string;
  isActive?: boolean;
  updatedById: string;
}

const INCLUDE = {
  customer: { select: CUSTOMER_SELECT },
  createdBy: { select: AUDIT_SELECT },
  updatedBy: { select: AUDIT_SELECT },
} as const;

/**
 * Database access only - no validation, no business rules.
 */
export class VehicleRepository {
  private readonly db: Database;

  constructor(database: Database = db) {
    this.db = database;
  }

  async findMany(params: VehicleListParams) {
    const [vehicles, total] = await Promise.all([
      this.db.vehicle.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        include: INCLUDE,
      }),
      this.db.vehicle.count({ where: params.where }),
    ]);

    return { vehicles: vehicles.map(toWireVehicle), total };
  }

  async findById(id: string) {
    const vehicle = await this.db.vehicle.findUnique({ where: { id }, include: INCLUDE });
    return vehicle ? toWireVehicle(vehicle) : null;
  }

  async findActiveByField(field: "vehicleNumber" | "engineNumber" | "chassisNumber", value: string) {
    const vehicle = await this.db.vehicle.findFirst({ where: { [field]: value, isActive: true } });
    return vehicle ? toWireVehicle(vehicle) : null;
  }

  async findActiveByVehicleNumberOrChassisNumber(vehicleNumber: string, chassisNumber: string) {
    const vehicle = await this.db.vehicle.findFirst({
      where: { isActive: true, OR: [{ vehicleNumber }, { chassisNumber }] },
    });
    return vehicle ? toWireVehicle(vehicle) : null;
  }

  countActiveByCustomer(customerId: string) {
    return this.db.vehicle.count({ where: { customerId, isActive: true } });
  }

  async create(data: CreateVehicleData) {
    const vehicle = await this.db.vehicle.create({
      data: {
        id: generateObjectId(),
        ...data,
        vehicleType: WIRE_TO_PRISMA_VEHICLE_TYPE[data.vehicleType],
      },
      include: INCLUDE,
    });
    return toWireVehicle(vehicle);
  }

  async update(id: string, data: UpdateVehicleData) {
    const vehicle = await this.db.vehicle.update({
      where: { id },
      data: {
        ...data,
        vehicleType: data.vehicleType ? WIRE_TO_PRISMA_VEHICLE_TYPE[data.vehicleType] : undefined,
      },
      include: INCLUDE,
    });
    return toWireVehicle(vehicle);
  }
}
