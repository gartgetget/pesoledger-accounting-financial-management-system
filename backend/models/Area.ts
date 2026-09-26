import mongoose from "mongoose";

export interface IArea {
  workspaceId: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const areaSchema = new mongoose.Schema<IArea>(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    name: { type: String, required: true },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IArea>("Area", areaSchema);
