import mongoose from "mongoose";

export interface IJobOrder {
  workspaceId: string;
  customerId: string;
  customerName: string;
  serviceCategoryId: string;
  serviceCategory: string;
  jobNumber: string;
  assignedTechnician: string;
  technicianName: string;
  area: string;
  customers: Array<{
    customerId: string;
    name: string;
    amountCollected: number;
  }>;
  status: "open" | "in_progress" | "completed" | "cancelled";
  paymentStatus: "Paid" | "Partially Paid" | "Unpaid";
  date: Date;
  description: string;
  laborCost: number;
  partsUsed: Array<{
    partId: string;
    partName?: string;
    partNumber?: string;
    qty: number;
    unitPrice: number;
    costPrice?: number;
    totalCost?: number;
    totalSelling?: number;
  }>;
  partsAmount: number;
  partsCostAmount: number;
  otherCharges: number;
  discountType: "percentage" | "amount";
  discountValue: number;
  discountAmount: number;
  subtotal: number;
  totalAmount: number;
  amountPaid: number;
  paymentMethodId: string;
  revenueId: string;
  expenseId: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobOrderSchema = new mongoose.Schema<IJobOrder>(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    customerId: { type: String, ref: "Customer" },
    customerName: { type: String, default: "" },
    serviceCategoryId: { type: String, ref: "Category" },
    serviceCategory: { type: String, default: "" },
    jobNumber: { type: String, required: true, unique: true },
    assignedTechnician: { type: String, default: "" },
    technicianName: { type: String, default: "" },
    area: { type: String, default: "" },
    customers: [
      {
        customerId: { type: String, default: "" },
        name: { type: String, default: "" },
        amountCollected: { type: Number, default: 0 },
      },
    ],
    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "cancelled"],
      default: "open",
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Partially Paid", "Unpaid"],
      default: "Unpaid",
    },
    date: { type: Date, default: Date.now },
    description: { type: String, default: "" },
    laborCost: { type: Number, default: 0 },
    partsUsed: [
      {
        partId: { type: String, ref: "InventoryItem" },
        partName: String,
        partNumber: String,
        qty: Number,
        unitPrice: Number,
        costPrice: Number,
        totalCost: Number,
        totalSelling: Number,
      },
    ],
    partsAmount: { type: Number, default: 0 },
    partsCostAmount: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    discountType: { type: String, enum: ["percentage", "amount"], default: "percentage" },
    discountValue: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    paymentMethodId: { type: String, default: "" },
    revenueId: { type: String, default: "" },
    expenseId: { type: String, default: "" },
    notes: { type: String, default: "" },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IJobOrder>("JobOrder", jobOrderSchema);
