import mongoose from "mongoose";

export interface ISystemState {
  key: string;
  value: string;
  updatedAt: Date;
}

const systemStateSchema = new mongoose.Schema<ISystemState>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export default mongoose.model<ISystemState>("SystemState", systemStateSchema);
