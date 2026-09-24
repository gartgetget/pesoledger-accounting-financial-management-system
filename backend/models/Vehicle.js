const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    vehicleName: { type: String, required: true },
    plateNumber: { type: String, required: true },
    model: { type: String, default: "" },
    assignedDriver: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Active", "Under Maintenance", "Inactive"],
      default: "Active"
    },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
