import { Router } from "express";
import RevenueEntry from "../models/RevenueEntry";
import auth from "../middleware/auth";

const router = Router();

router.use(auth);

const ensureWorkspaceAccess = (req: any, res: any, next: any) => {
  const { workspaceId } = req.params;
  if (!req.user.workspaces.includes(workspaceId)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

router.get("/:workspaceId/revenue", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const entries = await RevenueEntry.find({ workspaceId }).sort({ date: -1 });
  res.json(entries);
});

router.post("/:workspaceId/revenue", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { date, customerId, categoryId, description, amount, paymentMethod, referenceNo } = req.body;

  if (!date || !amount) {
    return res.status(400).json({ message: "Date and amount are required" });
  }

  const entry = await RevenueEntry.create({
    workspaceId,
    date: new Date(date),
    customerId,
    categoryId,
    description: description || "",
    amount: Number(amount),
    paymentMethod: paymentMethod || "Cash",
    referenceNo: referenceNo || "",
    createdBy: req.user._id.toString(),
  });

  res.status(201).json(entry);
});

router.get("/:workspaceId/revenue/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const entry = await RevenueEntry.findOne({ _id: id, workspaceId });
  if (!entry) return res.status(404).json({ message: "Revenue entry not found" });
  res.json(entry);
});

router.put("/:workspaceId/revenue/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const entry = await RevenueEntry.findOne({ _id: id, workspaceId });
  if (!entry) return res.status(404).json({ message: "Revenue entry not found" });

  Object.assign(entry, req.body);
  entry.updatedAt = new Date();
  await entry.save();

  res.json(entry);
});

router.delete("/:workspaceId/revenue/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const entry = await RevenueEntry.findOne({ _id: id, workspaceId });
  if (!entry) return res.status(404).json({ message: "Revenue entry not found" });

  await entry.deleteOne();
  res.json({ message: "Revenue entry deleted" });
});

export default router;
