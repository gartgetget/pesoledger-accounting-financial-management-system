import mongoose from "mongoose";

export interface IPayrollEntry {
  workspaceId: string;
  employeeName: string;
  period: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const payrollEntrySchema = new mongoose.Schema<IPayrollEntry>(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    employeeName: { type: String, required: true },
    period: { type: String, required: true },
    grossPay: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IPayrollEntry>("PayrollEntry", payrollEntrySchema);
