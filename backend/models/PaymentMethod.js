const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    name: { type: String, required: true },
    accountNumber: { type: String, default: "" },
    accountHolder: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model("PaymentMethod", paymentMethodSchema);
