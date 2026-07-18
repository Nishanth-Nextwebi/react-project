import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserService } from "@/services/userService";

const userService = new UserService();

/**
 * GET /api/users
 * Lists all registered users in the system (Admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Forbidden access. Administrative privilege required." },
        { status: 403 }
      );
    }

    const users = await userService.listUsers();

    return NextResponse.json({
      success: true,
      users: users.map((user) => ({ ...user, _id: user.id })),
    });
  } catch (error: any) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Onboards a new user (Admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Forbidden access. Administrative privilege required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = await userService.createUser(body, session.user.id, session.user.name || undefined);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, errors: result.errors },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "User onboarded successfully.",
        user: result.user,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
