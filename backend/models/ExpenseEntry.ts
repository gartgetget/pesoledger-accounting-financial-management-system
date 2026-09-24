import mongoose from "mongoose";

export interface IExpenseEntry {
  workspaceId: string;
  date: Date;
  categoryId: string;
  description: string;
  amount: number;
  paymentMethod: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseEntrySchema = new mongoose.Schema<IExpenseEntry>(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    date: { type: Date, required: true },
    categoryId: { type: String, ref: "Category" },
    description: { type: String, default: "" },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, default: "Cash" },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IExpenseEntry>("ExpenseEntry", expenseEntrySchema);
