const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
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
      default: "Active"
    },
    dateStarted: { type: String, default: "" },
    phone: { type: String, default: "" },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model("Employee", employeeSchema);
