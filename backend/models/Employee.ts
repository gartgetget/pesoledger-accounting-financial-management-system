import mongoose from "mongoose";

export interface IEmployee {
  workspaceId: string;
  name: string;
  position: string;
  dailyRate: number;
  monthlySalary: number;
  basicSalary: number;
  status: "Active" | "Inactive";
  dateStarted: string;
  phone: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new mongoose.Schema<IEmployee>(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    name: { type: String, required: true },
    position: { type: String, default: "" },
    dailyRate: { type: Number, default: 0 },
    monthlySalary: { type: Number, default: 0 },
    basicSalary: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    dateStarted: { type: String, default: "" },
    phone: { type: String, default: "" },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IEmployee>("Employee", employeeSchema);
