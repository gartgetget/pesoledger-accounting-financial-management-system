import mongoose from "mongoose";

export interface ICategory {
  workspaceId: string;
  type: "service" | "revenue" | "expense";
  name: string;
  description: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new mongoose.Schema<ICategory>(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    type: { type: String, enum: ["service", "revenue", "expense"], required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<ICategory>("Category", categorySchema);
