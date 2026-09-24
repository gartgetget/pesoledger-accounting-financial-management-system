const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    partName: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String, default: "" },
    stock: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
