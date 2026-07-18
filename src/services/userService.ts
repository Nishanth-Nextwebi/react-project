import bcrypt from "bcryptjs";
import { UserRepository } from "@/repositories/UserRepository";
import { ActivityService } from "@/services/activityService";
import type { Role } from "@/generated/prisma/enums";

export interface CreateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  password?: string;
}

export class UserService {
  private readonly repository: UserRepository;

  constructor(repository: UserRepository = new UserRepository()) {
    this.repository = repository;
  }

  /**
   * List all users (password omitted), newest first - matches the
   * original GET /api/users query exactly.
   */
  async listUsers() {
    return this.repository.findAll();
  }

  /**
   * Onboard a new user (Admin only). Mirrors the original inline logic in
   * POST /api/users: required-field check, email-uniqueness check, bcrypt
   * hashing, activity log entry.
   */
  async createUser(input: CreateUserInput, actorId: string, actorName?: string) {
    const { name, email, password, role } = input;

    if (!name || !email || !password || !role) {
      return {
        success: false as const,
        status: 400,
        message: "Missing required fields.",
        errors: ["Name, email, password, and role are required."],
      };
    }

    const emailClean = email.trim().toLowerCase();
    const existingUser = await this.repository.findByEmail(emailClean);
    if (existingUser) {
      return {
        success: false as const,
        status: 400,
        message: "User registration failed.",
        errors: ["A user with this email address is already registered."],
      };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await this.repository.create({
      name: name.trim(),
      email: emailClean,
      password: hashedPassword,
      role: role as Role,
      isActive: true,
    });

    await ActivityService.log(
      actorId,
      actorName,
      "User Actions",
      `Onboarded new system user "${newUser.name}" with role "${newUser.role}"`
    );

    return {
      success: true as const,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
      },
    };
  }

  /**
   * Update an existing user's credentials/role/active state (Admin only).
   * Mirrors the original inline logic in PATCH /api/users/[id]: self-
   * deactivation guard, conditional field application, email-uniqueness
   * (excluding self) check, optional password reset, activity log entry.
   */
  async updateUser(id: string, input: UpdateUserInput, actorId: string, actorName?: string) {
    const userToUpdate = await this.repository.findById(id);
    if (!userToUpdate) {
      return { success: false as const, status: 404, message: "User not found." };
    }

    if (actorId === id && input.isActive === false) {
      return { success: false as const, status: 400, message: "Self-deactivation is prohibited." };
    }

    const updateData: { name?: string; email?: string; role?: Role; isActive?: boolean; password?: string } = {};

    if (input.name) {
      updateData.name = input.name.trim();
    }

    if (input.email) {
      const emailClean = input.email.trim().toLowerCase();
      const duplicate = await this.repository.findByEmail(emailClean);
      if (duplicate && duplicate.id !== id) {
        return { success: false as const, status: 400, message: "Email already in use by another profile." };
      }
      updateData.email = emailClean;
    }

    if (input.role) {
      updateData.role = input.role as Role;
    }

    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    if (input.password && input.password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(input.password, salt);
    }

    const updatedUser = await this.repository.update(id, updateData);

    await ActivityService.log(
      actorId,
      actorName,
      "User Actions",
      `Modified settings/privileges for user "${updatedUser.name}" (Role: ${updatedUser.role}, Active: ${updatedUser.isActive})`
    );

    return {
      success: true as const,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      },
    };
  }

  /**
   * Dev-only bootstrap: create the default administrator if no admin exists
   * yet. Mirrors the original inline logic in GET /api/setup exactly
   * (fixed credentials, no-op if an admin is already present).
   */
  async ensureDefaultAdmin() {
    const adminExists = await this.repository.findFirstByRole("admin" as Role);
    if (adminExists) {
      return { alreadyInitialized: true as const };
    }

    const hashedPassword = await bcrypt.hash("Admin123!", 10);
    const admin = await this.repository.create({
      name: "System Administrator",
      email: "admin@insurance.com",
      password: hashedPassword,
      role: "admin" as Role,
      isActive: true,
    });

    return { alreadyInitialized: false as const, admin };
  }

  /**
   * Deactivate/remove a user (Admin only). Mirrors the original inline
   * logic in DELETE /api/users/[id]: self-deletion guard, hard delete,
   * activity log entry. Additionally translates MySQL's foreign-key
   * constraint violation (P2003) into a clean message - the original
   * Mongoose/MongoDB implementation had no equivalent failure mode since
   * Mongo does not enforce referential integrity the way MySQL does, so a
   * user who had created other records could be silently deleted there.
   * MySQL rejects that delete outright; surfacing a clear message here
   * instead of a raw constraint error is the correct adaptation, not a
   * business-logic change.
   */
  async deleteUser(id: string, actorId: string, actorName?: string) {
    if (actorId === id) {
      return { success: false as const, status: 400, message: "Self-deletion of accounts is prohibited." };
    }

    let deletedUser;
    try {
      deletedUser = await this.repository.delete(id);
    } catch (error: any) {
      if (error?.code === "P2025") {
        return { success: false as const, status: 404, message: "User not found in registry." };
      }
      if (error?.code === "P2003") {
        return {
          success: false as const,
          status: 400,
          message: "Cannot delete this user because they have created or modified other records. Deactivate the account instead.",
        };
      }
      throw error;
    }

    await ActivityService.log(
      actorId,
      actorName,
      "User Actions",
      `Removed user account for "${deletedUser.name}" (${deletedUser.email})`
    );

    return { success: true as const };
  }
}
