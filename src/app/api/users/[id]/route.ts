import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserService } from "@/services/userService";

const userService = new UserService();
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

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
    if (!id || !OBJECT_ID_REGEX.test(id)) {
      return NextResponse.json({ success: false, message: "Invalid user ID." }, { status: 400 });
    }

    const body = await req.json();
    const result = await userService.updateUser(id, body, session.user.id, session.user.name || undefined);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully.",
      user: result.user,
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
    if (!id || !OBJECT_ID_REGEX.test(id)) {
      return NextResponse.json({ success: false, message: "Invalid user ID." }, { status: 400 });
    }

    const result = await userService.deleteUser(id, session.user.id, session.user.name || undefined);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error: any) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
