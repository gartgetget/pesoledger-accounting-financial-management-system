import mongoose from "mongoose";

export interface IInventoryItem {
  workspaceId: string;
  partName: string;
  sku: string;
  category: string;
  stock: number;
  unitPrice: number;
  reorderLevel: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryItemSchema = new mongoose.Schema<IInventoryItem>(
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
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IInventoryItem>("InventoryItem", inventoryItemSchema);
