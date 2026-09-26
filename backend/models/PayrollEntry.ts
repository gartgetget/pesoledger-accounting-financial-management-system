import mongoose from "mongoose";

export interface IPayrollEntry {
  workspaceId: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  period: string;
  daysWorked: number;
  dailyRate: number;
  foodRate: number;
  basicSalary: number;
  overtimePay: number;
  incentives: number;
  coop: number;
  foodAllowance: number;
  grossPay: number;
  grossSalary: number;
  deductions: number;
  netPay: number;
  netSalary: number;
  paymentMethodId: string;
  notes: string;
  expenseId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const payrollEntrySchema = new mongoose.Schema<IPayrollEntry>(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    employeeId: { type: String, default: "" },
    employeeName: { type: String, required: true },
    date: { type: Date, default: Date.now },
    period: { type: String, required: true },
    daysWorked: { type: Number, default: 0 },
    dailyRate: { type: Number, default: 0 },
    foodRate: { type: Number, default: 0 },
    basicSalary: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    incentives: { type: Number, default: 0 },
    coop: { type: Number, default: 0 },
    foodAllowance: { type: Number, default: 0 },
    grossPay: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    paymentMethodId: { type: String, default: "" },
    notes: { type: String, default: "" },
    expenseId: { type: String, default: "" },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IPayrollEntry>("PayrollEntry", payrollEntrySchema);
