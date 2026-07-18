import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { ActivityService } from "@/services/activityService";
import mongoose from "mongoose";

/**
 * PATCH /api/users/[id]
 * Updates user credentials, roles, or active state (Admin only)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden privilege required." }, { status: 403 });
    }

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid user ID." }, { status: 400 });
    }

    const body = await req.json();
    const { name, email, role, isActive, password } = body;

    await dbConnect();
    const userToUpdate = await User.findById(id);

    if (!userToUpdate) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Guard against disabling or changing oneself if there is only one admin (optional, let's keep it simple but safe)
    if (session.user.id === id && isActive === false) {
      return NextResponse.json({ success: false, message: "Self-deactivation is prohibited." }, { status: 400 });
    }

    if (name) userToUpdate.name = name.trim();
    if (email) {
      const emailClean = email.trim().toLowerCase();
      // Check for duplicate emails
      const duplicate = await User.findOne({ email: emailClean, _id: { $ne: id } });
      if (duplicate) {
        return NextResponse.json({ success: false, message: "Email already in use by another profile." }, { status: 400 });
      }
      userToUpdate.email = emailClean;
    }
    if (role) userToUpdate.role = role;
    if (isActive !== undefined) userToUpdate.isActive = isActive;

    // Secure password reset if provided
    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      userToUpdate.password = await bcrypt.hash(password, salt);
    }

    await userToUpdate.save();

    // Log the update action
    await ActivityService.log(
      session.user.id,
      session.user.name || undefined,
      "User Actions",
      `Modified settings/privileges for user "${userToUpdate.name}" (Role: ${userToUpdate.role}, Active: ${userToUpdate.isActive})`
    );

    return NextResponse.json({
      success: true,
      message: "User updated successfully.",
      user: {
        id: userToUpdate._id,
        name: userToUpdate.name,
        email: userToUpdate.email,
        role: userToUpdate.role,
        isActive: userToUpdate.isActive,
      },
    });
  } catch (error: any) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id]
 * Deactivates or removes a user from database (Admin only)
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden privilege required." }, { status: 403 });
    }

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid user ID." }, { status: 400 });
    }

    if (session.user.id === id) {
      return NextResponse.json({ success: false, message: "Self-deletion of accounts is prohibited." }, { status: 400 });
    }

    await dbConnect();
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json({ success: false, message: "User not found in registry." }, { status: 404 });
    }

    // Log user deactivation/removal
    await ActivityService.log(
      session.user.id,
      session.user.name || undefined,
      "User Actions",
      `Removed user account for "${deletedUser.name}" (${deletedUser.email})`
    );

    return NextResponse.json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error: any) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
