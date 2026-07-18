import { PolicyRepository } from "@/repositories/PolicyRepository";
import { ActivityRepository } from "@/repositories/ActivityRepository";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export class DashboardService {
  private readonly policyRepository: PolicyRepository;
  private readonly activityRepository: ActivityRepository;

  constructor(
    policyRepository: PolicyRepository = new PolicyRepository(),
    activityRepository: ActivityRepository = new ActivityRepository()
  ) {
    this.policyRepository = policyRepository;
    this.activityRepository = activityRepository;
  }

  /**
   * Computes every stat/chart/table shown on the main dashboard. Extracted
   * from the original inline GET /api/dashboard route - no computation,
   * date range, or response shape changed.
   */
  async getDashboardData() {
    const now = new Date();

    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Compute Card aggregates
    const [totalPolicies, activePolicies, expiredPolicies, expiringSoon, todaysRenewals, newThisMonth] =
      await Promise.all([
        this.policyRepository.countActive(),
        this.policyRepository.countActiveExpiring({ gt: now }),
        this.policyRepository.countActiveExpiring({ lte: now }),
        this.policyRepository.countActiveExpiring({ gt: now, lte: thirtyDaysLater }),
        this.policyRepository.countActiveExpiring({ gte: todayStart, lte: todayEnd }),
        this.policyRepository.countActiveCreatedSince(monthStart),
      ]);

    // 2. Compute Charts - Monthly Policies (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyAggregation = await this.policyRepository.groupActiveByMonth(sixMonthsAgo);

    const monthlyPoliciesChart = monthlyAggregation.map((item) => ({
      month: `${MONTH_NAMES[item.month - 1]} ${item.year}`,
      policies: item.count,
      revenue: item.premium,
    }));

    // 3. Compute Charts - Insurance Company Distribution
    const companyDistributionAgg = await this.policyRepository.groupActiveByCompany(6);

    const companyDistribution = companyDistributionAgg.map((item) => ({
      name: item.name,
      value: item.count,
      premium: item.premium,
    }));

    // 4. Tables - Upcoming Expiries (top 5 expiring soon)
    const upcomingExpiriesRaw = await this.policyRepository.findUpcomingExpiring(now, 5);
    const upcomingExpiries = upcomingExpiriesRaw.map((policy) => ({ ...policy, _id: policy.id }));

    // 5. Tables - Recent Policies
    const recentPoliciesRaw = await this.policyRepository.findRecent(5);
    const recentPolicies = recentPoliciesRaw.map((policy) => ({ ...policy, _id: policy.id }));

    // 6. Tables - Recent Activities (NOT populated with user, matching the
    // original inline route exactly - unlike ActivityService.getRecentLogs)
    const recentActivitiesRaw = await this.activityRepository.findRecent(5);
    const recentActivities = recentActivitiesRaw.map((log) => ({ ...log, _id: log.id }));

    return {
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
    };
  }
}
