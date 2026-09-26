import mongoose from "mongoose";

export interface IRevenueEntry {
  workspaceId: string;
  date: Date;
  customerId: string;
  categoryId: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  referenceNo: string;
  relatedId: string;
  area: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const revenueEntrySchema = new mongoose.Schema<IRevenueEntry>(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    date: { type: Date, required: true },
    customerId: { type: String, ref: "Customer" },
    categoryId: { type: String, ref: "Category" },
    category: { type: String, default: "" },
    description: { type: String, default: "" },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, default: "Cash" },
    referenceNo: { type: String, default: "" },
    relatedId: { type: String, default: "" },
    area: { type: String, default: "" },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IRevenueEntry>("RevenueEntry", revenueEntrySchema);
