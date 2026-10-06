import { createRouter } from "../middleware/createRouter.js";
import ExpenseEntry from "../models/ExpenseEntry.js";
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

router.get("/:workspaceId/expenses", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const entries = await ExpenseEntry.find({ workspaceId }).sort({ date: -1 });
  res.json(entries);
});

router.post("/:workspaceId/expenses/batch", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { entries } = req.body || {};
  if (!Array.isArray(entries) || entries.length !== 2) {
    return res.status(400).json({ message: "Exactly two expense entries are required" });
  }

  const validEntries = entries.map((entry: any) => {
    const amount = Number(entry?.amount);
    const date = entry?.date ? new Date(entry.date) : null;
    const category = typeof entry?.category === "string" ? entry.category.trim().toUpperCase() : "";
    const paymentMethod = typeof entry?.paymentMethodId === "string"
      ? entry.paymentMethodId.trim()
      : typeof entry?.paymentMethod === "string"
        ? entry.paymentMethod.trim()
        : "";
    if (!date || Number.isNaN(date.getTime()) || !category || !Number.isFinite(amount) || amount <= 0 || !paymentMethod) {
      return null;
    }
    return {
      workspaceId,
      date,
      categoryId: typeof entry.categoryId === "string" ? entry.categoryId : "",
      category,
      description: typeof entry.description === "string" ? entry.description.trim() : "",
      amount,
      paymentMethod,
      area: typeof entry.area === "string" ? entry.area : "",
      relatedModule: "general",
      relatedId: "",
      createdBy: req.user._id.toString(),
    };
  });

  if (validEntries.some((entry) => entry === null)) {
    return res.status(400).json({
      message: "Each expense requires a valid date, category, positive amount, and payment method",
    });
  }

  const created = await ExpenseEntry.insertMany(validEntries);
  res.status(201).json(created);
});

router.post("/:workspaceId/expenses", ensureWorkspaceAccess, async (req, res) => {
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

  const entry = await ExpenseEntry.create({
    workspaceId,
    date: new Date(date),
    categoryId,
    category,
    description: b.description || "",
    amount: Number(amount),
    paymentMethod,
    area: b.area || "",
    relatedModule: b.relatedModule || "",
    relatedId: b.relatedId || "",
    createdBy: req.user._id.toString(),
  });

  res.status(201).json(entry);
});

router.get("/:workspaceId/expenses/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const entry = await ExpenseEntry.findOne({ _id: id, workspaceId });
  if (!entry) return res.status(404).json({ message: "Expense entry not found" });
  res.json(entry);
});

router.put("/:workspaceId/expenses/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const entry = await ExpenseEntry.findOne({ _id: id, workspaceId });
  if (!entry) return res.status(404).json({ message: "Expense entry not found" });

  const b = req.body || {};
  const allowed: Record<string, unknown> = {};
  const keys = ["date", "categoryId", "category", "description", "amount", "paymentMethod", "area", "relatedModule", "relatedId"];
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

router.delete("/:workspaceId/expenses/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const entry = await ExpenseEntry.findOne({ _id: id, workspaceId });
  if (!entry) return res.status(404).json({ message: "Expense entry not found" });

  if (entry.relatedModule === "vehicle" || entry.relatedModule === "salary" || entry.relatedModule === "job") {
    return res.status(400).json({
      message:
        entry.relatedModule === "vehicle"
          ? "Auto-posted from Vehicles — delete the vehicle expense instead."
          : entry.relatedModule === "salary"
            ? "Auto-posted from Payroll — delete the payroll entry instead."
            : "Auto-posted from Job Orders — edit or delete the job order instead.",
    });
  }

  await entry.deleteOne();
  res.json({ message: "Expense entry deleted" });
});

export default router;
