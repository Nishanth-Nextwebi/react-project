import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { ActivityService } from "@/services/activityService";

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

    await dbConnect();
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      users,
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

    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Missing required fields.", errors: ["Name, email, password, and role are required."] },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check email uniqueness
    const emailClean = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: emailClean });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "User registration failed.", errors: ["A user with this email address is already registered."] },
        { status: 400 }
      );
    }

    // Securely hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: name.trim(),
      email: emailClean,
      password: hashedPassword,
      role,
      isActive: true,
    });

    await newUser.save();

    // Log user creation
    await ActivityService.log(
      session.user.id,
      session.user.name || undefined,
      "User Actions",
      `Onboarded new system user "${newUser.name}" with role "${newUser.role}"`
    );

    return NextResponse.json(
      {
        success: true,
        message: "User onboarded successfully.",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          isActive: newUser.isActive,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
