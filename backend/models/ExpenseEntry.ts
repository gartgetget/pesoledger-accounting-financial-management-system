import mongoose from "mongoose";

export interface IExpenseEntry {
  workspaceId: string;
  date: Date;
  categoryId: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  area: string;
  relatedModule: string;
  relatedId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseEntrySchema = new mongoose.Schema<IExpenseEntry>(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    date: { type: Date, required: true },
    categoryId: { type: String, ref: "Category" },
    category: { type: String, default: "" },
    description: { type: String, default: "" },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, default: "Cash" },
    area: { type: String, default: "" },
    relatedModule: { type: String, default: "" },
    relatedId: { type: String, default: "" },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IExpenseEntry>("ExpenseEntry", expenseEntrySchema);
