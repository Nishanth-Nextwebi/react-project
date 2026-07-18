interface AuditUser {
  id: string;
  name: string;
  email: string;
}

interface CustomerRef {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
}

interface VehicleRef {
  id: string;
  vehicleNumber: string;
  model: string;
  [key: string]: unknown;
}

interface PolicyRecord {
  id: string;
  customer?: CustomerRef | null;
  vehicle?: VehicleRef | null;
  createdBy?: AuditUser | null;
  updatedBy?: AuditUser | null;
  [key: string]: unknown;
}

function serializeRef<T extends { id: string }>(ref: T | null | undefined) {
  if (!ref) {
    return ref;
  }
  return { ...ref, _id: ref.id };
}

/**
 * Maps Prisma's `id` to the `_id` key the frontend reads directly,
 * preserving the wire shape the Mongoose-backed API used to return
 * (including populated customer/vehicle/createdBy/updatedBy sub-objects).
 */
export function serializePolicy<T extends PolicyRecord>(policy: T) {
  return {
    ...policy,
    _id: policy.id,
    customer: serializeRef(policy.customer),
    vehicle: serializeRef(policy.vehicle),
    createdBy: serializeRef(policy.createdBy),
    updatedBy: serializeRef(policy.updatedBy),
  };
}
