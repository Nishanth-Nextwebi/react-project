import { db } from "@/lib/database";
import type { Database } from "@/lib/database";
import { generateObjectId } from "@/lib/objectId";

export interface CreateActivityLogData {
  action: string;
  details: string;
  userId?: string;
  userName?: string;
}

const USER_SELECT = { id: true, name: true, email: true, role: true } as const;

/**
 * Database access only - no validation, no business rules.
 */
export class ActivityRepository {
  private readonly db: Database;

  constructor(database: Database = db) {
    this.db = database;
  }

  create(data: CreateActivityLogData) {
    return this.db.activityLog.create({ data: { id: generateObjectId(), ...data } });
  }

  /**
   * Raw recent logs, no relations populated - matches the original inline
   * dashboard route's `ActivityLog.find().sort().limit(5)` exactly (it does
   * NOT populate `user`, unlike ActivityService.getRecentLogs below).
   */
  findRecent(limit: number) {
    return this.db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  }

  /**
   * Recent logs with the user relation populated - matches the original
   * ActivityService.getRecentLogs' `.populate("user", "name email role")`.
   */
  findRecentWithUser(limit: number) {
    return this.db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: USER_SELECT } },
    });
  }
}
