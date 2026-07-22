import { PolicyRepository } from "@/repositories/PolicyRepository";

export type ReminderWindow = "15" | "10" | "5" | "expired";

const RECENT_EXPIRY_LOOKBACK_DAYS = 15;

/** Start/end of the calendar day that is `offsetDays` from now, in server-local time. */
function dayBounds(offsetDays: number) {
  const start = new Date();
  start.setDate(start.getDate() + offsetDays);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + offsetDays);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export class ReminderService {
  private readonly policyRepository: PolicyRepository;

  constructor(policyRepository: PolicyRepository = new PolicyRepository()) {
    this.policyRepository = policyRepository;
  }

  /**
   * Lists active policies falling into one of the Track FollowUp page's tabs.
   * "15"/"10"/"5" are exact day-offset checkpoints (expiryDate falls on that
   * calendar day), matching a fixed reminder cadence rather than a growing
   * "expiring within N days" range - so a policy is only ever flagged once
   * per checkpoint, not on every tab leading up to expiry. "expired" covers
   * policies that lapsed within the last 15 days (recent lapses worth a
   * win-back follow-up). All boundaries are computed from `new Date()` at
   * call time - nothing here is a fixed/hardcoded date.
   */
  async listByWindow(window: ReminderWindow) {
    if (window === "expired") {
      const now = new Date();
      const lookback = new Date();
      lookback.setDate(lookback.getDate() - RECENT_EXPIRY_LOOKBACK_DAYS);
      lookback.setHours(0, 0, 0, 0);
      return this.policyRepository.findActiveByExpiryFilter({ gte: lookback, lt: now });
    }

    const offsetDays = Number(window);
    const { start, end } = dayBounds(offsetDays);
    return this.policyRepository.findActiveByExpiryFilter({ gte: start, lte: end });
  }
}
