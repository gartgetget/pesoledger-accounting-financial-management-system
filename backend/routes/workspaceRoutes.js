const express = require("express");
const Workspace = require("../models/Workspace");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

router.get("/", async (req, res) => {
  const workspaces = await Workspace.find({
    _id: { $in: req.user.workspaces }
  });

  res.json(workspaces);
});

router.post("/", async (req, res) => {
  const { name, businessName, currency, timezone } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Workspace name is required" });
  }

  const workspace = await Workspace.create({
    name,
    ownerId: req.user._id.toString(),
    settings: {
      currency: currency || "PHP",
      businessName: businessName || name,
      timezone: timezone || "Asia/Manila"
    }
  });

  req.user.workspaces = req.user.workspaces || [];
  req.user.workspaces.push(workspace._id.toString());
  await req.user.save();

  res.status(201).json(workspace);
});

router.get("/:workspaceId", async (req, res) => {
  const { workspaceId } = req.params;

  if (!req.user.workspaces.includes(workspaceId)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return res.status(404).json({ message: "Workspace not found" });
  }

  res.json(workspace);
});

router.put("/:workspaceId", async (req, res) => {
  const { workspaceId } = req.params;
  const { name, businessName, currency, timezone } = req.body;

  if (!req.user.workspaces.includes(workspaceId)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const workspace = await Workspace.findOne({ _id: workspaceId });
  if (!workspace) {
    return res.status(404).json({ message: "Workspace not found" });
  }

  workspace.name = name || workspace.name;
  workspace.settings.businessName = businessName || workspace.settings.businessName;
  workspace.settings.currency = currency || workspace.settings.currency;
  workspace.settings.timezone = timezone || workspace.settings.timezone;
  workspace.updatedAt = new Date();
  await workspace.save();

  res.json(workspace);
});

module.exports = router;
