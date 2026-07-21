import { db } from "@/lib/database";
import type { Database } from "@/lib/database";
import type { Prisma } from "@/generated/prisma/client";
import { generateObjectId } from "@/lib/objectId";

const AUDIT_SELECT = { id: true, name: true, email: true } as const;

export interface CustomerListParams {
  skip: number;
  take: number;
  where: Prisma.CustomerWhereInput;
  orderBy: Prisma.CustomerOrderByWithRelationInput;
}

export interface CreateCustomerData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  isActive?: boolean;
  createdById: string;
  updatedById: string;
}

export interface UpdateCustomerData {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  isActive?: boolean;
  updatedById: string;
}

/**
 * Database access only - no validation, no business rules. Contains exactly
 * the methods needed by CustomerService for listing, lookup, creation, and
 * updates (including the soft-delete state change, which is just an update).
 */
export class CustomerRepository {
  private readonly db: Database;

  constructor(database: Database = db) {
    this.db = database;
  }

  async findMany(params: CustomerListParams) {
    const [customers, total] = await Promise.all([
      this.db.customer.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        include: {
          createdBy: { select: AUDIT_SELECT },
          updatedBy: { select: AUDIT_SELECT },
        },
      }),
      this.db.customer.count({ where: params.where }),
    ]);

    return { customers, total };
  }

  findById(id: string) {
    return this.db.customer.findUnique({
      where: { id },
      include: {
        createdBy: { select: AUDIT_SELECT },
        updatedBy: { select: AUDIT_SELECT },
      },
    });
  }

  findActiveByPhone(phone: string) {
    return this.db.customer.findFirst({ where: { phone, isActive: true } });
  }

  create(data: CreateCustomerData) {
    return this.db.customer.create({
      data: { id: generateObjectId(), ...data },
      include: {
        createdBy: { select: AUDIT_SELECT },
        updatedBy: { select: AUDIT_SELECT },
      },
    });
  }

  update(id: string, data: UpdateCustomerData) {
    return this.db.customer.update({
      where: { id },
      data,
      include: {
        createdBy: { select: AUDIT_SELECT },
        updatedBy: { select: AUDIT_SELECT },
      },
    });
  }
}
