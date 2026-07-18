import { NextResponse } from "next/server";
import { UserService } from "@/services/userService";

const userService = new UserService();

export async function GET() {
  // Prevent execution in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Forbidden", message: "Database initialization is disabled in production." },
      { status: 403 }
    );
  }

  try {
    const result = await userService.ensureDefaultAdmin();

    if (result.alreadyInitialized) {
      return NextResponse.json(
        { message: "System is already initialized. Admin user already exists." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: "Database and administrator provisioned successfully.",
        credentials: {
          admin: {
            email: result.admin.email,
            password: "Admin123!",
            role: result.admin.role,
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
