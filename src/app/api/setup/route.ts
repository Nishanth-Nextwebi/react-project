import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET() {
  // Prevent execution in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Forbidden", message: "Database initialization is disabled in production." },
      { status: 403 }
    );
  }

  try {
    await dbConnect();

    // Check if admin user already exists
    const adminExists = await User.findOne({ role: "admin" });

    if (adminExists) {
      return NextResponse.json(
        { message: "System is already initialized. Admin user already exists." },
        { status: 200 }
      );
    }

    // Create a default administrator
    const hashedAdminPassword = await bcrypt.hash("Admin123!", 10);
    const defaultAdmin = await User.create({
      name: "System Administrator",
      email: "admin@insurance.com",
      password: hashedAdminPassword,
      role: "admin",
      isActive: true,
    });

    return NextResponse.json(
      {
        message: "Database and administrator provisioned successfully.",
        credentials: {
          admin: {
            email: defaultAdmin.email,
            password: "Admin123!",
            role: defaultAdmin.role,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Database setup failed", details: error.message },
      { status: 500 }
    );
  }
}
