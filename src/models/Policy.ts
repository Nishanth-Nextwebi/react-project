import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPolicy extends Document {
  customer: mongoose.Types.ObjectId;
  vehicle: mongoose.Types.ObjectId;
  policyNumber: string;
  insuranceCompany: string;
  policyType: string;
  premiumAmount: number;
  startDate: Date;
  expiryDate: Date;
  extraField1?: string;
  extraField2?: string;
  extraField3?: string;
  comments?: string;
  attachmentUrl?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PolicySchema: Schema<IPolicy> = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
    policyNumber: { type: String, required: true, unique: true, index: true },
    insuranceCompany: { type: String, required: true, trim: true },
    policyType: { type: String, required: true, trim: true },
    premiumAmount: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    extraField1: { type: String, default: "" },
    extraField2: { type: String, default: "" },
    extraField3: { type: String, default: "" },
    comments: { type: String, default: "" },
    attachmentUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

const Policy: Model<IPolicy> =
  mongoose.models.Policy || mongoose.model<IPolicy>("Policy", PolicySchema);

export default Policy;
