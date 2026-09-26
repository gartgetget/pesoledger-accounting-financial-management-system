import mongoose from "mongoose";

export interface IVehicleExpense {
  workspaceId: string;
  vehicleId: string;
  vehicleName: string;
  date: Date;
  expenseType: string;
  amount: number;
  paymentMethodId: string;
  area: string;
  driverResponsible: string;
  odometer: number;
  description: string;
  notes: string;
  expenseId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleExpenseSchema = new mongoose.Schema<IVehicleExpense>(
  {
    workspaceId: { type: String, required: true, index: true },
    vehicleId: { type: String, required: true, index: true },
    vehicleName: { type: String, default: "" },
    date: { type: Date, required: true },
    expenseType: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethodId: { type: String, default: "Cash" },
    area: { type: String, default: "" },
    driverResponsible: { type: String, default: "" },
    odometer: { type: Number, default: 0 },
    description: { type: String, default: "" },
    notes: { type: String, default: "" },
    expenseId: { type: String, default: "" },
    createdBy: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IVehicleExpense>(
  "VehicleExpense",
  vehicleExpenseSchema
);
