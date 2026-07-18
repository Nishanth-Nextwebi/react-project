import { PolicyRepository } from "@/repositories/PolicyRepository";
import { ActivityService } from "@/services/activityService";

const DEFAULT_TEMPLATE =
  "Dear {customer_name}, your policy #{policy_number} is expiring on {expiry_date}. Please contact us to renew.";

export interface ReminderLogEntry {
  policyId: string;
  policyNumber: string;
  customerName: string;
  phone: string;
  message: string;
  status: "Sent" | "Failed (No Phone Number)";
}

export class ReminderService {
  private readonly policyRepository: PolicyRepository;

  constructor(policyRepository: PolicyRepository = new PolicyRepository()) {
    this.policyRepository = policyRepository;
  }

  /**
   * Simulates dispatching WhatsApp renewal reminders for active policies
   * expiring within `reminderDays` - does not call the WhatsApp Cloud API,
   * matching the original inline route's simulation-only behavior exactly.
   */
  async processReminders(reminderDays: number, userId: string, userName: string | undefined) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + reminderDays);

    const expiringPolicies = await this.policyRepository.findActiveExpiringBetween(now, futureDate);

    if (expiringPolicies.length === 0) {
      return {
        message: "No policy contracts match the expiry window triggers.",
        dispatched: 0,
        logs: [] as ReminderLogEntry[],
      };
    }

    const dispatchedReminders: ReminderLogEntry[] = expiringPolicies.map((policy) => {
      const customerName = policy.customer?.name || "Client";
      const customerPhone = policy.customer?.phone || "";
      const policyNumber = policy.policyNumber;
      const expiryDate = new Date(policy.expiryDate).toLocaleDateString("en-IN");

      const message = DEFAULT_TEMPLATE.replace(/{customer_name}/g, customerName)
        .replace(/{policy_number}/g, policyNumber)
        .replace(/{expiry_date}/g, expiryDate);

      return {
        policyId: policy.id,
        policyNumber,
        customerName,
        phone: customerPhone,
        message,
        status: customerPhone ? "Sent" : "Failed (No Phone Number)",
      };
    });

    const sentCount = dispatchedReminders.filter((r) => r.status === "Sent").length;

    if (sentCount > 0) {
      await ActivityService.log(
        userId,
        userName,
        "User Actions",
        `Initiated WhatsApp reminder engine run. Automated notifications processed: ${sentCount} contracts queued.`
      );
    }

    return {
      message: `WhatsApp reminder engine successfully processed coverage audits. Sent: ${sentCount}, Skipped: ${expiringPolicies.length - sentCount}`,
      dispatched: sentCount,
      logs: dispatchedReminders,
    };
  }
}
