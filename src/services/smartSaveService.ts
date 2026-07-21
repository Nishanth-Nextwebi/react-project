import { transaction } from "@/lib/database";
import { CustomerRepository } from "@/repositories/CustomerRepository";
import { VehicleRepository } from "@/repositories/VehicleRepository";
import type { WireVehicleType } from "@/repositories/VehicleRepository";
import { PolicyRepository } from "@/repositories/PolicyRepository";
import { ActivityService } from "@/services/activityService";

export interface SmartSaveCustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
}

export interface SmartSaveVehicleInput {
  vehicleNumber: string;
  chassisNumber: string;
  engineNumber: string;
  vehicleType?: WireVehicleType;
  manufacturer?: string;
  model?: string;
  year?: number | string;
  color?: string;
}

export interface SmartSavePolicyInput {
  policyNumber: string;
  insuranceCompany: string;
  policyType: string;
  premiumAmount: number | string;
  startDate: string;
  expiryDate: string;
  extraField1?: string;
  extraField2?: string;
  extraField3?: string;
  comments?: string;
  attachmentUrl?: string;
}

interface PendingActivity {
  action: string;
  details: string;
}

/** Raised for expected business-rule failures inside the transaction, so
 * $transaction rolls everything back before the route ever sees a response. */
class SmartSaveError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors: string[]
  ) {
    super(message);
    this.name = "SmartSaveError";
  }
}

export class SmartSaveService {
  /**
   * Finds-or-creates a Customer by phone, finds-or-creates a Vehicle by
   * vehicle/chassis number, then always creates a new Policy - mirrors the
   * original inline smart-save route exactly. Unlike the original, all
   * three writes now happen inside a single Prisma transaction: if any step
   * fails, nothing is left half-created (the original Mongoose version
   * could orphan a Customer/Vehicle with no Policy on a mid-flow failure,
   * since Mongo document saves in that route were not atomic with each other).
   */
  async process(
    custData: SmartSaveCustomerInput,
    vehData: SmartSaveVehicleInput,
    polData: SmartSavePolicyInput,
    userId: string,
    userName: string | undefined
  ) {
    try {
      const { customer, vehicle, policy, activities } = await transaction(async (tx) => {
        const customerRepository = new CustomerRepository(tx);
        const vehicleRepository = new VehicleRepository(tx);
        const policyRepository = new PolicyRepository(tx);
        const activities: PendingActivity[] = [];

        // --- STEP 1: Process Customer ---
        const phoneClean = custData.phone.trim();
        let customer = await customerRepository.findActiveByPhone(phoneClean);

        if (customer) {
          // Reuse existing customer. name is always overwritten; email/address/city
          // only if the caller actually sent that key (matches the original
          // `if (custData.email !== undefined) ...` guard exactly).
          customer = await customerRepository.update(customer.id, {
            name: custData.name.trim(),
            email: custData.email !== undefined ? custData.email.trim() : undefined,
            address: custData.address !== undefined ? custData.address.trim() : undefined,
            city: custData.city !== undefined ? custData.city.trim() : undefined,
            updatedById: userId,
          });
          activities.push({ action: "User Actions", details: `Updated details for customer "${customer.name}"` });
        } else {
          customer = await customerRepository.create({
            name: custData.name.trim(),
            phone: phoneClean,
            email: custData.email ? custData.email.trim() : "",
            address: custData.address ? custData.address.trim() : "",
            city: custData.city ? custData.city.trim() : "",
            isActive: true,
            createdById: userId,
            updatedById: userId,
          });
          activities.push({ action: "Customer Created", details: `Created customer profile for "${customer.name}"` });
        }

        // --- STEP 2: Process Vehicle ---
        const vehicleNumClean = vehData.vehicleNumber.trim().toUpperCase();
        const chassisNumClean = vehData.chassisNumber.trim().toUpperCase();
        const engineNumClean = vehData.engineNumber.trim().toUpperCase();

        let vehicle = await vehicleRepository.findActiveByVehicleNumberOrChassisNumber(vehicleNumClean, chassisNumClean);

        if (vehicle) {
          // Reuse existing vehicle: re-associate to the resolved customer,
          // engine/chassis numbers always overwritten with the cleaned
          // input, other fields fall back to their existing value when the
          // caller didn't send one (matches the original's `x || existing`).
          vehicle = await vehicleRepository.update(vehicle.id, {
            customerId: customer.id,
            vehicleType: vehData.vehicleType || undefined,
            manufacturer: vehData.manufacturer || undefined,
            model: vehData.model || undefined,
            year: vehData.year ? parseInt(String(vehData.year), 10) : undefined,
            engineNumber: engineNumClean,
            chassisNumber: chassisNumClean,
            color: vehData.color || undefined,
            updatedById: userId,
          });
          activities.push({ action: "User Actions", details: `Updated vehicle details for ${vehicle.vehicleNumber}` });
        } else {
          // Check engine number uniqueness separately to prevent duplicate active engine number crash
          if (await vehicleRepository.findActiveByField("engineNumber", engineNumClean)) {
            throw new SmartSaveError(400, "Engine number already exists.", [
              "An active vehicle with this engine number is already registered.",
            ]);
          }

          // Check registration plate uniqueness separately
          if (await vehicleRepository.findActiveByField("vehicleNumber", vehicleNumClean)) {
            throw new SmartSaveError(400, "Vehicle registration number already exists.", [
              "An active vehicle with this registration number is already registered.",
            ]);
          }

          // Check chassis uniqueness separately
          if (await vehicleRepository.findActiveByField("chassisNumber", chassisNumClean)) {
            throw new SmartSaveError(400, "Chassis number already exists.", [
              "An active vehicle with this chassis number is already registered.",
            ]);
          }

          vehicle = await vehicleRepository.create({
            customerId: customer.id,
            vehicleNumber: vehicleNumClean,
            vehicleType: vehData.vehicleType as WireVehicleType,
            manufacturer: (vehData.manufacturer || "").trim(),
            model: (vehData.model || "").trim(),
            year: parseInt(String(vehData.year), 10),
            engineNumber: engineNumClean,
            chassisNumber: chassisNumClean,
            color: vehData.color ? vehData.color.trim() : "",
            isActive: true,
            createdById: userId,
            updatedById: userId,
          });
          activities.push({
            action: "Vehicle Created",
            details: `Registered vehicle ${vehicle.manufacturer} ${vehicle.model} (${vehicle.vehicleNumber})`,
          });
        }

        // --- STEP 3: Always Create a NEW Policy ---
        const polNumClean = polData.policyNumber.trim().toUpperCase();

        if (await policyRepository.findByPolicyNumber(polNumClean)) {
          throw new SmartSaveError(400, "Policy number already exists.", [
            `A policy with number '${polNumClean}' already exists.`,
          ]);
        }

        const policy = await policyRepository.create({
          customerId: customer.id,
          vehicleId: vehicle.id,
          policyNumber: polNumClean,
          insuranceCompany: polData.insuranceCompany.trim(),
          policyType: polData.policyType.trim(),
          premiumAmount: parseFloat(String(polData.premiumAmount)),
          startDate: new Date(polData.startDate),
          expiryDate: new Date(polData.expiryDate),
          extraField1: polData.extraField1 ? polData.extraField1.trim() : "",
          extraField2: polData.extraField2 ? polData.extraField2.trim() : "",
          extraField3: polData.extraField3 ? polData.extraField3.trim() : "",
          comments: polData.comments ? polData.comments.trim() : "",
          attachmentUrl: polData.attachmentUrl ? polData.attachmentUrl.trim() : "",
          isActive: true,
          createdById: userId,
          updatedById: userId,
        });

        const isRenewal = polData.comments?.toLowerCase().includes("renewal") || false;
        activities.push({
          action: isRenewal ? "Policy Renewed" : "Policy Created",
          details: `${isRenewal ? "Renewed" : "Created"} policy #${polNumClean} under ${polData.insuranceCompany}`,
        });

        return { customer, vehicle, policy, activities };
      });

      // Activity logging happens only after the transaction commits - logging
      // an action that ends up rolled back would make the audit trail lie
      // about what actually happened.
      for (const activity of activities) {
        await ActivityService.log(userId, userName, activity.action, activity.details);
      }

      return { success: true as const, customer, vehicle, policy };
    } catch (error: any) {
      if (error instanceof SmartSaveError) {
        return { success: false as const, status: error.status, message: error.message, errors: error.errors };
      }
      throw error;
    }
  }
}
