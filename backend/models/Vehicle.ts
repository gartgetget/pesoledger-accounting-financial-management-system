import mongoose from "mongoose";

export interface IVehicle {
  workspaceId: string;
  vehicleName: string;
  plateNumber: string;
  model: string;
  assignedDriver: string;
  status: "Active" | "Under Maintenance" | "Inactive";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new mongoose.Schema<IVehicle>(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    vehicleName: { type: String, required: true },
    plateNumber: { type: String, required: true },
    model: { type: String, default: "" },
    assignedDriver: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Active", "Under Maintenance", "Inactive"],
      default: "Active",
    },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IVehicle>("Vehicle", vehicleSchema);
