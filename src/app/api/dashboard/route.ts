import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Policy from "@/models/Policy";
import ActivityLog from "@/models/ActivityLog";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const now = new Date();
    
    // Setting dates
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Compute Card aggregates
    const [
      totalPolicies,
      activePolicies,
      expiredPolicies,
      expiringSoon,
      todaysRenewals,
      newThisMonth,
    ] = await Promise.all([
      Policy.countDocuments({ isActive: true }),
      Policy.countDocuments({ isActive: true, expiryDate: { $gt: now } }),
      Policy.countDocuments({ isActive: true, expiryDate: { $lte: now } }),
      Policy.countDocuments({ isActive: true, expiryDate: { $gt: now, $lte: thirtyDaysLater } }),
      Policy.countDocuments({ isActive: true, expiryDate: { $gte: todayStart, $lte: todayEnd } }),
      Policy.countDocuments({ isActive: true, createdAt: { $gte: monthStart } }),
    ]);

    // 2. Compute Charts - Monthly Policies (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0,0,0,0);

    const monthlyAggregation = await Policy.aggregate([
      {
        $match: {
          isActive: true,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 },
          premium: { $sum: "$premiumAmount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const monthsName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyPoliciesChart = monthlyAggregation.map((item) => {
      const mIdx = item._id.month - 1;
      return {
        month: `${monthsName[mIdx]} ${item._id.year}`,
        policies: item.count,
        revenue: item.premium,
      };
    });

    // 3. Compute Charts - Insurance Company Distribution
    const companyDistributionAgg = await Policy.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$insuranceCompany",
          count: { $sum: 1 },
          premium: { $sum: "$premiumAmount" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    const companyDistribution = companyDistributionAgg.map((item) => ({
      name: item._id,
      value: item.count,
      premium: item.premium,
    }));

    // 4. Tables - Upcoming Expiries (top 5 expiring soon)
    const upcomingExpiries = await Policy.find({
      isActive: true,
      expiryDate: { $gt: now }
    })
      .sort({ expiryDate: 1 })
      .limit(5)
      .populate("customer", "name phone")
      .populate("vehicle", "vehicleNumber model");

    // 5. Tables - Recent Policies
    const recentPolicies = await Policy.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("customer", "name phone")
      .populate("vehicle", "vehicleNumber model");

    // 6. Tables - Recent Activities
    const recentActivities = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalPolicies,
          activePolicies,
          expiredPolicies,
          expiringSoon,
          todaysRenewals,
          newThisMonth,
        },
        charts: {
          monthlyPoliciesChart,
          companyDistribution,
        },
        upcomingExpiries,
        recentPolicies,
        recentActivities,
      }
    });
  } catch (error: any) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
