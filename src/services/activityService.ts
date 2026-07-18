import { ActivityRepository } from "@/repositories/ActivityRepository";

export class ActivityService {
  private static repository = new ActivityRepository();

  /**
   * Log an administrative or system action. Swallows its own errors so a
   * logging failure never fails the parent request - matches the original
   * Mongoose implementation exactly.
   */
  static async log(userId: string | undefined, userName: string | undefined, action: string, details: string) {
    try {
      await this.repository.create({
        action,
        details,
        userId: userId || undefined,
        userName: userName || undefined,
      });
    } catch (error) {
      console.error("Failed to persist activity log:", error);
    }
  }

  /**
   * Fetch recent activity logs, with the user relation populated (name,
   * email, role) - matches the original `.populate("user", "name email role")`.
   */
  static async getRecentLogs(limit = 10) {
    try {
      return await this.repository.findRecentWithUser(limit);
    } catch (error) {
      console.error("Failed to retrieve activity logs:", error);
      return [];
    }
  }
}
