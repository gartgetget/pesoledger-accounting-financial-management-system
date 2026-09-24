import mongoose from "mongoose";

export interface IUser {
  fullName: string;
  email: string;
  passwordHash: string;
  role: "admin" | "accountant" | "staff";
  workspaces: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "accountant", "staff"],
      default: "admin",
    },
    workspaces: [{ type: String, ref: "Workspace" }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model<IUser>("User", userSchema);
