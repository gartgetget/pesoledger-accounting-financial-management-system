import { createRouter } from "../middleware/createRouter.js";
import RevenueEntry from "../models/RevenueEntry.js";
import JobOrder from "../models/JobOrder.js";
import auth from "../middleware/auth.js";

const router = createRouter();

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
  const b = req.body || {};
  const date = b.date;
  const amount = b.amount;
  const category = typeof b.category === "string" && b.category ? b.category : (b.categoryId || "");
  const categoryId = typeof b.categoryId === "string" ? b.categoryId : "";
  const paymentMethod = b.paymentMethod || b.paymentMethodId || "Cash";

  if (!date || !amount) {
    return res.status(400).json({ message: "Date and amount are required" });
  }

  const entry = await RevenueEntry.create({
    workspaceId,
    date: new Date(date),
    customerId: b.customerId,
    categoryId,
    category,
    description: b.description || "",
    amount: Number(amount),
    paymentMethod,
    referenceNo: b.referenceNo || "",
    relatedId: b.relatedId || "",
    area: b.area || "",
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

  const b = req.body || {};
  const allowed: Record<string, unknown> = {};
  const keys = ["date", "customerId", "categoryId", "category", "description", "amount", "paymentMethod", "referenceNo", "relatedId", "area"];
  for (const k of keys) {
    if (b[k] !== undefined) allowed[k] = b[k];
  }
  if (b.paymentMethod === undefined && b.paymentMethodId !== undefined) allowed.paymentMethod = b.paymentMethodId;
  if (b.date) allowed.date = new Date(b.date);
  if (b.amount !== undefined) allowed.amount = Number(b.amount);

  Object.assign(entry, allowed);
  entry.updatedAt = new Date();
  await entry.save();

  res.json(entry);
});

router.delete("/:workspaceId/revenue/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const entry = await RevenueEntry.findOne({ _id: id, workspaceId });
  if (!entry) return res.status(404).json({ message: "Revenue entry not found" });

  if (entry.relatedId) {
    const job = await JobOrder.findOne({ _id: entry.relatedId, workspaceId });
    if (job) {
      job.amountPaid = 0;
      job.paymentStatus = "Unpaid";
      job.revenueId = "";
      job.customers = (job.customers || []).map((c: any) => ({ ...c, amountCollected: 0 }));
      job.updatedAt = new Date();
      await job.save();
    }
    await entry.deleteOne();
    return res.json({ message: "Collection deleted; linked job order marked unpaid" });
  }

  await entry.deleteOne();
  res.json({ message: "Revenue entry deleted" });
});

export default router;
