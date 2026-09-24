const mongoose = require("mongoose");

const expenseEntrySchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    date: { type: Date, required: true },
    categoryId: { type: String, ref: "Category" },
    description: { type: String, default: "" },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, default: "Cash" },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model("ExpenseEntry", expenseEntrySchema);
