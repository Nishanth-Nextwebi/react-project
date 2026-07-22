import { db } from "@/lib/database";
import type { Database } from "@/lib/database";
import type { Prisma } from "@/generated/prisma/client";
import { generateObjectId } from "@/lib/objectId";
import { toWireVehicleType } from "@/repositories/VehicleRepository";

const AUDIT_SELECT = { id: true, name: true, email: true } as const;
const CUSTOMER_SELECT = { id: true, name: true, phone: true, email: true, address: true } as const;
const VEHICLE_SELECT = {
  id: true,
  vehicleNumber: true,
  vehicleType: true,
  manufacturer: true,
  model: true,
  year: true,
  chassisNumber: true,
  engineNumber: true,
} as const;

const INCLUDE = {
  customer: { select: CUSTOMER_SELECT },
  vehicle: { select: VEHICLE_SELECT },
  createdBy: { select: AUDIT_SELECT },
  updatedBy: { select: AUDIT_SELECT },
} as const;

/** PolicyRepository does its own separate include on the Vehicle relation
 * (rather than reusing VehicleRepository), so vehicleType needs the same
 * Prisma-enum -> wire-value translation applied here after every fetch. */
function toWirePolicy<T extends { vehicle: { vehicleType: any } | null }>(policy: T) {
  if (!policy.vehicle) return policy;
  return { ...policy, vehicle: { ...policy.vehicle, vehicleType: toWireVehicleType(policy.vehicle.vehicleType) } };
}

export interface PolicyListParams {
  skip: number;
  take: number;
  where: Prisma.PolicyWhereInput;
  orderBy: Prisma.PolicyOrderByWithRelationInput;
}

export interface CreatePolicyData {
  customerId: string;
  vehicleId: string;
  policyNumber: string;
  insuranceCompany: string;
  policyType: string;
  premiumAmount: number;
  startDate: Date;
  expiryDate: Date;
  extraField1?: string;
  extraField2?: string;
  extraField3?: string;
  loanProvider?: string;
  comments?: string;
  attachmentUrl?: string;
  isActive?: boolean;
  createdById: string;
  updatedById: string;
}

export interface UpdatePolicyData {
  customerId?: string;
  vehicleId?: string;
  policyNumber?: string;
  insuranceCompany?: string;
  policyType?: string;
  premiumAmount?: number;
  startDate?: Date;
  expiryDate?: Date;
  extraField1?: string;
  extraField2?: string;
  extraField3?: string;
  loanProvider?: string;
  comments?: string;
  attachmentUrl?: string;
  isActive?: boolean;
  lastFollowUpAt?: string | null;
  updatedById: string;
}

/**
 * Database access only - no validation, no business rules.
 */
export class PolicyRepository {
  private readonly db: Database;

  constructor(database: Database = db) {
    this.db = database;
  }

  async findMany(params: PolicyListParams) {
    const [policies, total] = await Promise.all([
      this.db.policy.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        include: INCLUDE,
      }),
      this.db.policy.count({ where: params.where }),
    ]);

    return { policies: policies.map(toWirePolicy), total };
  }

  async findById(id: string) {
    const policy = await this.db.policy.findUnique({ where: { id }, include: INCLUDE });
    return policy ? toWirePolicy(policy) : null;
  }

  findByPolicyNumber(policyNumber: string) {
    return this.db.policy.findUnique({ where: { policyNumber } });
  }

  async create(data: CreatePolicyData) {
    const policy = await this.db.policy.create({
      data: { id: generateObjectId(), ...data },
      include: INCLUDE,
    });
    return toWirePolicy(policy);
  }

  async update(id: string, data: UpdatePolicyData) {
    const policy = await this.db.policy.update({ where: { id }, data, include: INCLUDE });
    return toWirePolicy(policy);
  }

  async delete(id: string) {
    const policy = await this.db.policy.delete({ where: { id }, include: INCLUDE });
    return toWirePolicy(policy);
  }

  countActiveByVehicle(vehicleId: string) {
    return this.db.policy.count({ where: { vehicleId, isActive: true } });
  }

  countActiveByCustomer(customerId: string) {
    return this.db.policy.count({ where: { customerId, isActive: true } });
  }

  deleteManyByCustomer(customerId: string) {
    return this.db.policy.deleteMany({ where: { customerId } });
  }

  countActive() {
    return this.db.policy.count({ where: { isActive: true } });
  }

  countActiveExpiring(expiryDate: Prisma.DateTimeFilter) {
    return this.db.policy.count({ where: { isActive: true, expiryDate } });
  }

  countActiveCreatedSince(since: Date) {
    return this.db.policy.count({ where: { isActive: true, createdAt: { gte: since } } });
  }

  async groupActiveByMonth(since: Date) {
    const rows = await this.db.$queryRaw<{ year: number; month: number; count: bigint; premium: number | null }[]>`
      SELECT YEAR(createdAt) as year, MONTH(createdAt) as month, COUNT(*) as count, SUM(premiumAmount) as premium
      FROM Policy
      WHERE isActive = true AND createdAt >= ${since}
      GROUP BY YEAR(createdAt), MONTH(createdAt)
      ORDER BY year ASC, month ASC
    `;
    return rows.map((r) => ({ year: Number(r.year), month: Number(r.month), count: Number(r.count), premium: r.premium || 0 }));
  }

  async groupActiveByCompany(limit: number) {
    const rows = await this.db.policy.groupBy({
      by: ["insuranceCompany"],
      where: { isActive: true },
      _count: { _all: true },
      _sum: { premiumAmount: true },
      orderBy: { _count: { insuranceCompany: "desc" } },
      take: limit,
    });
    return rows.map((r) => ({ name: r.insuranceCompany, count: r._count._all, premium: r._sum.premiumAmount || 0 }));
  }

  async findUpcomingExpiring(now: Date, limit: number) {
    const policies = await this.db.policy.findMany({
      where: { isActive: true, expiryDate: { gt: now } },
      orderBy: { expiryDate: "asc" },
      take: limit,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, vehicleNumber: true, model: true } },
      },
    });
    return policies;
  }

  async findRecent(limit: number) {
    const policies = await this.db.policy.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, vehicleNumber: true, model: true } },
      },
    });
    return policies;
  }

  async findActiveExpiringBetween(now: Date, future: Date) {
    const policies = await this.db.policy.findMany({
      where: { isActive: true, expiryDate: { gt: now, lte: future } },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        vehicle: { select: { id: true, vehicleNumber: true, manufacturer: true, model: true } },
      },
    });
    return policies;
  }

  /** Powers the Send Message page's expiry-window tabs - `filter` is built
   * dynamically per window (exact day offsets or a recent-expiry range),
   * never a fixed calendar date. */
  async findActiveByExpiryFilter(filter: Prisma.DateTimeFilter) {
    const policies = await this.db.policy.findMany({
      where: { isActive: true, expiryDate: filter },
      orderBy: { expiryDate: "asc" },
      include: INCLUDE,
    });
    return policies.map(toWirePolicy);
  }
}
