import * as z from "zod";

/**
 * Zod validation schema for creating/updating a Customer record
 * Meets all strict business requirements:
 * - Email is optional (or can be an empty string)
 * - Phone is required and validated for correct format
 * - ID fields are omitted in Version 1
 */
export const customerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .max(15, "Phone number cannot exceed 15 characters")
    .trim()
    .regex(
      /^\+?[0-9\s\-()]{10,15}$/,
      "Please enter a valid phone number format"
    ),
  email: z
    .string()
    .email("Please enter a valid email address")
    .trim()
    .lowercase()
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(300, "Address cannot exceed 300 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .max(100, "City cannot exceed 100 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().default(true),
});

/**
 * Zod validation schema for creating/updating a Vehicle record
 * Meets all strict business requirements:
 * - Direct association to a valid Customer ID
 * - Strict vehicle registration formatting limits
 * - No insurance-specific attributes (stored strictly in policies)
 */
export const vehicleSchema = z.object({
  customer: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Customer reference ID format"),
  vehicleNumber: z
    .string()
    .min(3, "Vehicle registration number must be at least 3 characters")
    .max(15, "Vehicle registration number is too long")
    .trim()
    .toUpperCase(),
  vehicleType: z.enum(["Two-Wheeler", "Four-Wheeler", "Commercial", "Other"], {
    message: "Please select a valid vehicle classification",
  }),
  manufacturer: z
    .string()
    .min(1, "Manufacturer name is required")
    .max(50, "Manufacturer name is too long")
    .trim(),
  model: z
    .string()
    .min(1, "Vehicle model is required")
    .max(50, "Vehicle model is too long")
    .trim(),
  year: z.coerce
    .number()
    .int("Year must be a whole number")
    .min(1900, "Year must be 1900 or later")
    .max(new Date().getFullYear() + 1, "Year cannot exceed next model year"),
  engineNumber: z
    .string()
    .min(4, "Engine number must be at least 4 characters")
    .max(30, "Engine number cannot exceed 30 characters")
    .trim()
    .toUpperCase(),
  chassisNumber: z
    .string()
    .min(4, "Chassis number must be at least 4 characters")
    .max(30, "Chassis number cannot exceed 30 characters")
    .trim()
    .toUpperCase(),
  color: z
    .string()
    .max(30, "Color cannot exceed 30 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().default(true),
});

/**
 * Zod validation schema for creating/updating a Policy record
 */
export const policySchema = z.object({
  customer: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Customer reference ID format")
    .optional(),
  vehicle: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Vehicle reference ID format")
    .optional(),
  policyNumber: z
    .string()
    .min(3, "Policy number must be at least 3 characters")
    .max(50, "Policy number is too long")
    .trim(),
  insuranceCompany: z
    .string()
    .min(1, "Insurance company name is required")
    .max(100, "Insurance company name is too long")
    .trim(),
  policyType: z
    .string()
    .min(1, "Policy type is required")
    .max(50, "Policy type is too long")
    .trim(),
  premiumAmount: z.coerce
    .number()
    .min(0, "Premium amount must be 0 or greater"),
  startDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  extraField1: z.string().max(100).trim().optional().or(z.literal("")),
  extraField2: z.string().max(100).trim().optional().or(z.literal("")),
  extraField3: z.string().max(100).trim().optional().or(z.literal("")),
  comments: z.string().max(1000).trim().optional().or(z.literal("")),
  attachmentUrl: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type PolicyInput = z.infer<typeof policySchema>;

