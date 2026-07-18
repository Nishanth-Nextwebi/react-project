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
}

interface VehicleRecord {
  id: string;
  customer?: CustomerRef | null;
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
 * (including populated customer/createdBy/updatedBy sub-objects).
 */
export function serializeVehicle<T extends VehicleRecord>(vehicle: T) {
  return {
    ...vehicle,
    _id: vehicle.id,
    customer: serializeRef(vehicle.customer),
    createdBy: serializeRef(vehicle.createdBy),
    updatedBy: serializeRef(vehicle.updatedBy),
  };
}
