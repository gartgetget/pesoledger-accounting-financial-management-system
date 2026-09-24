import mongoose from "mongoose";

export interface IJobOrder {
  workspaceId: string;
  customerId: string;
  serviceCategoryId: string;
  jobNumber: string;
  assignedTechnician: string;
  status: "open" | "in_progress" | "completed" | "cancelled";
  description: string;
  laborCost: number;
  partsUsed: Array<{ partId: string; qty: number; unitPrice: number }>;
  totalAmount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobOrderSchema = new mongoose.Schema<IJobOrder>(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    customerId: { type: String, ref: "Customer" },
    serviceCategoryId: { type: String, ref: "Category" },
    jobNumber: { type: String, required: true, unique: true },
    assignedTechnician: { type: String, default: "" },
    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "cancelled"],
      default: "open",
    },
    description: { type: String, default: "" },
    laborCost: { type: Number, default: 0 },
    partsUsed: [
      {
        partId: { type: String, ref: "InventoryItem" },
        qty: Number,
        unitPrice: Number,
      },
    ],
    totalAmount: { type: Number, default: 0 },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IJobOrder>("JobOrder", jobOrderSchema);
