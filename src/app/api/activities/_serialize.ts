interface UserRef {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ActivityLogRecord {
  id: string;
  user?: UserRef | null;
  [key: string]: unknown;
}

/**
 * Maps Prisma's `id` to the `_id` key the frontend reads directly,
 * preserving the wire shape the Mongoose-backed API used to return
 * (including the populated `user` sub-object).
 */
export function serializeActivityLog<T extends ActivityLogRecord>(log: T) {
  return {
    ...log,
    _id: log.id,
    user: log.user ? { ...log.user, _id: log.user.id } : log.user,
  };
}
