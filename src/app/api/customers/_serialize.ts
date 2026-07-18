interface AuditUser {
  id: string;
  name: string;
  email: string;
}

interface CustomerRecord {
  id: string;
  createdBy?: AuditUser | null;
  updatedBy?: AuditUser | null;
  [key: string]: unknown;
}

function serializeAuditUser(user: AuditUser | null | undefined) {
  if (!user) {
    return user;
  }
  return { ...user, _id: user.id };
}

/**
 * Maps Prisma's `id` to the `_id` key the frontend reads directly,
 * preserving the wire shape the Mongoose-backed API used to return
 * (including populated createdBy/updatedBy sub-objects, which Mongoose's
 * default JSON serialization also exposes under `_id`).
 */
export function serializeCustomer<T extends CustomerRecord>(customer: T) {
  return {
    ...customer,
    _id: customer.id,
    createdBy: serializeAuditUser(customer.createdBy),
    updatedBy: serializeAuditUser(customer.updatedBy),
  };
}
