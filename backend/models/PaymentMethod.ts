import mongoose from "mongoose";

export interface IPaymentMethod {
  workspaceId: string;
  name: string;
  accountNumber: string;
  accountHolder: string;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSchema = new mongoose.Schema<IPaymentMethod>(
  {
    workspaceId: { type: String, required: true, ref: "Workspace" },
    name: { type: String, required: true },
    accountNumber: { type: String, default: "" },
    accountHolder: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: String, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IPaymentMethod>("PaymentMethod", paymentMethodSchema);
