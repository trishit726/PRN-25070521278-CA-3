import mongoose from "mongoose";

const { Schema, model } = mongoose;
const timestamps = { timestamps: true };
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["student", "technician", "admin"],
      default: "student",
    },
    department: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  timestamps,
);
const labSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    department: String,
    location: String,
    description: String,
    technicianIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isActive: { type: Boolean, default: true },
  },
  timestamps,
);
const assetSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    serialNumber: { type: String, required: true, unique: true },
    assetCode: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    laboratoryId: {
      type: Schema.Types.ObjectId,
      ref: "Laboratory",
      required: true,
    },
    manufacturer: String,
    purchaseDate: Date,
    condition: {
      type: String,
      enum: ["good", "fair", "damaged"],
      default: "good",
    },
    status: {
      type: String,
      enum: ["available", "under_maintenance", "retired"],
      default: "available",
    },
    qrCodeId: { type: String, unique: true, required: true },
    imageUrl: String,
  },
  timestamps,
);
const reservationSchema = new Schema(
  {
    assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    purpose: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "completed"],
      default: "pending",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  timestamps,
);
reservationSchema.index({ assetId: 1, startTime: 1, endTime: 1, status: 1 });
const maintenanceSchema = new Schema(
  {
    assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "resolved", "rejected"],
      default: "pending",
    },
    resolutionNotes: String,
    resolvedAt: Date,
  },
  timestamps,
);
const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: String,
    message: String,
    type: String,
    isRead: { type: Boolean, default: false },
    relatedEntityId: Schema.Types.ObjectId,
  },
  timestamps,
);
const activitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    action: String,
    entityType: String,
    entityId: Schema.Types.ObjectId,
    description: String,
  },
  timestamps,
);
export const User = model("User", userSchema);
export const Laboratory = model("Laboratory", labSchema);
export const Asset = model("Asset", assetSchema);
export const Reservation = model("Reservation", reservationSchema);
export const Maintenance = model("Maintenance", maintenanceSchema);
export const Notification = model("Notification", notificationSchema);
export const ActivityLog = model("ActivityLog", activitySchema);
