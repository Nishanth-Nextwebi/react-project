import mongoose, { Schema, Document, Model } from "mongoose";

export interface IActivityLog extends Document {
  user?: mongoose.Types.ObjectId;
  userName?: string;
  action: string;
  details: string;
  ipAddress?: string;
  createdAt: Date;
}

const ActivityLogSchema: Schema<IActivityLog> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    userName: { type: String, default: "System" },
    action: { type: String, required: true, index: true },
    details: { type: String, required: true },
    ipAddress: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

export default ActivityLog;
