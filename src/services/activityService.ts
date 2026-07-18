import { dbConnect } from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";
import mongoose from "mongoose";

export class ActivityService {
  /**
   * Log an administrative or system action
   */
  static async log(userId: string | undefined, userName: string | undefined, action: string, details: string) {
    try {
      await dbConnect();
      const payload: any = {
        action,
        details,
      };

      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        payload.user = new mongoose.Types.ObjectId(userId);
      }
      if (userName) {
        payload.userName = userName;
      }

      await ActivityLog.create(payload);
    } catch (error) {
      console.error("Failed to persist activity log:", error);
    }
  }

  /**
   * Fetch recent activity logs
   */
  static async getRecentLogs(limit = 10) {
    try {
      await dbConnect();
      return await ActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("user", "name email role");
    } catch (error) {
      console.error("Failed to retrieve activity logs:", error);
      return [];
    }
  }
}
