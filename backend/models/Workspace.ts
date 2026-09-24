import mongoose from "mongoose";

export interface IWorkspace {
  name: string;
  ownerId: string;
  settings: {
    currency: string;
    businessName: string;
    timezone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new mongoose.Schema<IWorkspace>(
  {
    name: { type: String, required: true },
    ownerId: { type: String, required: true, ref: "User" },
    settings: {
      currency: { type: String, default: "PHP" },
      businessName: { type: String, default: "" },
      timezone: { type: String, default: "Asia/Manila" },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IWorkspace>("Workspace", workspaceSchema);
