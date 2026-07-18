import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVehicle extends Omit<Document, "model"> {
  customer: mongoose.Types.ObjectId;
  vehicleNumber: string;
  vehicleType: "Two-Wheeler" | "Four-Wheeler" | "Commercial" | "Other";
  manufacturer: string;
  model: string;
  year: number;
  engineNumber: string;
  chassisNumber: string;
  color?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema: Schema<IVehicle> = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    vehicleType: {
      type: String,
      enum: ["Two-Wheeler", "Four-Wheeler", "Commercial", "Other"],
      required: true,
    },
    manufacturer: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true, index: true },
    year: { type: Number, required: true },
    engineNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    chassisNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    color: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

// Compound text index for visual search operations
VehicleSchema.index({ vehicleNumber: "text", engineNumber: "text", chassisNumber: "text", model: "text" });

const Vehicle: Model<IVehicle> =
  mongoose.models.Vehicle || mongoose.model<IVehicle>("Vehicle", VehicleSchema);

export default Vehicle;
