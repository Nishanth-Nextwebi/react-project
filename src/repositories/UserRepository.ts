import { db } from "@/lib/database";
import type { Database } from "@/lib/database";
import { generateObjectId } from "@/lib/objectId";
import type { Role } from "@/generated/prisma/enums";

export interface CreateUserData {
  name: string;
  email: string;
  password?: string;
  role?: Role;
  isActive?: boolean;
  googleId?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  isActive?: boolean;
  googleId?: string;
}

/**
 * Database access only - no validation, no business rules.
 */
export class UserRepository {
  private readonly db: Database;

  constructor(database: Database = db) {
    this.db = database;
  }

  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }

  findAll() {
    return this.db.user.findMany({
      orderBy: { createdAt: "desc" },
      omit: { password: true },
    });
  }

  findFirstByRole(role: Role) {
    return this.db.user.findFirst({ where: { role } });
  }

  create(data: CreateUserData) {
    return this.db.user.create({
      data: { id: generateObjectId(), isActive: true, ...data },
    });
  }

  update(id: string, data: UpdateUserData) {
    return this.db.user.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.db.user.delete({ where: { id } });
  }
}
