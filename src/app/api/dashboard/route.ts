import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DashboardService } from "@/services/dashboardService";

const dashboardService = new DashboardService();

function withNestedIds<T extends { customer?: any; vehicle?: any; [key: string]: unknown }>(record: T) {
  return {
    ...record,
    customer: record.customer ? { ...record.customer, _id: record.customer.id } : record.customer,
    vehicle: record.vehicle ? { ...record.vehicle, _id: record.vehicle.id } : record.vehicle,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const data = await dashboardService.getDashboardData();

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        upcomingExpiries: data.upcomingExpiries.map(withNestedIds),
        recentPolicies: data.recentPolicies.map(withNestedIds),
      },
    });
  } catch (error: any) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
