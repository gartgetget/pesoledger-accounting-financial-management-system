const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: String, required: true, ref: "User" },
    settings: {
      currency: { type: String, default: "PHP" },
      businessName: { type: String, default: "" },
      timezone: { type: String, default: "Asia/Manila" }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model("Workspace", workspaceSchema);
