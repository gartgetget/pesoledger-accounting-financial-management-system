import { createRouter } from "../middleware/createRouter.js";
import JobOrder from "../models/JobOrder.js";
import RevenueEntry from "../models/RevenueEntry.js";
import auth from "../middleware/auth.js";

const router = createRouter();

router.use(auth);

type JobOrderDoc = InstanceType<typeof JobOrder>;

const ensureWorkspaceAccess = (req: any, res: any, next: any) => {
  const { workspaceId } = req.params;
  if (!req.user.workspaces.includes(workspaceId)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

const sanitizeCustomers = (raw: unknown): Array<{ customerId: string; name: string; amountCollected: number }> | null => {
  if (!Array.isArray(raw)) return null;
  return raw
    .map((c: any) => ({
      customerId: String(c?.customerId || ""),
      name: String(c?.name || "").trim(),
      amountCollected: Number(c?.amountCollected || 0),
    }))
    .filter((c) => c.name || c.amountCollected > 0);
};

const sumCollected = (rows: Array<{ amountCollected: number }>) =>
  rows.reduce((s, c) => s + (Number(c.amountCollected) || 0), 0);

const syncJobRevenue = async (workspaceId: string, job: JobOrderDoc, createdBy: string) => {
  const amountPaid = Number(job.amountPaid || 0);
  const shouldPost = job.status === "completed" && amountPaid > 0;

  if (!shouldPost) {
    if (job.revenueId) {
      await RevenueEntry.deleteOne({ _id: job.revenueId, workspaceId }).catch(() => null);
      job.revenueId = "";
    }
    return;
  }

  const payload = {
    date: job.date,
    category: job.serviceCategory || "JOB ORDER",
    description: `Job ${job.jobNumber}${job.customerName ? ` — ${job.customerName}` : ""}`,
    paymentMethod: job.paymentMethodId || "Cash",
    referenceNo: job.jobNumber,
    relatedId: job._id.toString(),
    area: job.area || "",
  };

  if (job.revenueId) {
    const rev = await RevenueEntry.findOne({ _id: job.revenueId, workspaceId });
    if (rev) {
      Object.assign(rev, payload, { amount: amountPaid });
      rev.updatedAt = new Date();
      await rev.save();
      return;
    }
  }

  const rev = await RevenueEntry.create({ workspaceId, ...payload, amount: amountPaid, createdBy });
  job.revenueId = rev._id.toString();
};

router.get("/:workspaceId/job-orders", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const jobs = await JobOrder.find({ workspaceId }).sort({ createdAt: -1 });
  res.json(jobs);
});

router.post("/:workspaceId/job-orders", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const b = req.body || {};

  if (!b.jobNumber) {
    return res.status(400).json({ message: "Job number is required" });
  }

  const duplicate = await JobOrder.exists({ jobNumber: String(b.jobNumber) });
  if (duplicate) {
    return res.status(400).json({ message: "Job number already exists — choose a different Job Order #" });
  }

  const custRows = sanitizeCustomers(b.customers) || [];
  const primary = custRows.find((c) => c.name);

  const job = await JobOrder.create({
    workspaceId,
    customerId: primary ? primary.customerId || b.customerId : b.customerId,
    customerName: primary ? primary.name : b.customerName || "",
    serviceCategoryId: b.serviceCategoryId || b.serviceCategory,
    serviceCategory: b.serviceCategory || "",
    jobNumber: b.jobNumber,
    assignedTechnician: b.assignedTechnician || b.technicianId || "",
    technicianName: b.technicianName || "",
    area: b.area || "",
    customers: custRows,
    status: b.status || "open",
    paymentStatus: b.paymentStatus || "Unpaid",
    date: b.date ? new Date(b.date) : new Date(),
    description: b.description || "",
    laborCost: Number(b.laborCost ?? b.laborAmount ?? 0),
    partsUsed: b.partsUsed || [],
    partsAmount: Number(b.partsAmount ?? 0),
    partsCostAmount: Number(b.partsCostAmount ?? 0),
    otherCharges: Number(b.otherCharges ?? 0),
    discountType: b.discountType || "percentage",
    discountValue: Number(b.discountValue ?? 0),
    discountAmount: Number(b.discountAmount ?? 0),
    subtotal: Number(b.subtotal ?? 0),
    totalAmount: Number(b.totalAmount ?? b.total ?? 0),
    amountPaid: sumCollected(custRows) > 0 ? sumCollected(custRows) : Number(b.amountPaid ?? 0),
    paymentMethodId: b.paymentMethodId || "",
    notes: b.notes || "",
    createdBy: req.user._id.toString(),
  });

  try {
    await syncJobRevenue(workspaceId, job, req.user._id.toString());
    job.updatedAt = new Date();
    await job.save();
  } catch (e) {
    console.error("Failed to post job order collection to ledger", e);
  }

  res.status(201).json(job);
});

router.get("/:workspaceId/job-orders/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const job = await JobOrder.findOne({ _id: id, workspaceId });
  if (!job) return res.status(404).json({ message: "Job order not found" });
  res.json(job);
});

router.put("/:workspaceId/job-orders/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const job = await JobOrder.findOne({ _id: id, workspaceId });
  if (!job) return res.status(404).json({ message: "Job order not found" });

  const b = req.body || {};
  const allowed: Record<string, unknown> = {};
  const keys = [
    "customerId", "customerName", "serviceCategoryId", "serviceCategory",
    "jobNumber", "assignedTechnician", "technicianName", "area", "customers", "status", "paymentStatus",
    "date", "description", "laborCost", "partsUsed", "partsAmount", "partsCostAmount",
    "otherCharges", "discountType", "discountValue", "discountAmount", "subtotal",
    "totalAmount", "amountPaid", "paymentMethodId", "notes",
  ];
  for (const k of keys) {
    if (b[k] !== undefined) allowed[k] = b[k];
  }
  if (b.date) allowed.date = new Date(b.date);
  if (b.laborAmount !== undefined && b.laborCost === undefined) allowed.laborCost = b.laborAmount;
  if (b.total !== undefined && b.totalAmount === undefined) allowed.totalAmount = b.total;
  if (b.technicianId !== undefined && b.assignedTechnician === undefined) allowed.assignedTechnician = b.technicianId;
  if (b.customers !== undefined) {
    allowed.customers = sanitizeCustomers(b.customers) || [];
  }

  Object.assign(job, allowed);

  const rows = job.customers || [];
  if (b.customers !== undefined && rows.length > 0) {
    const summed = sumCollected(rows);
    if (summed > 0) job.amountPaid = summed;
    const p = rows.find((c) => c.name);
    if (p) {
      job.customerName = p.name;
      if (p.customerId) job.customerId = p.customerId;
    }
  }

  job.updatedAt = new Date();
  await job.save();

  try {
    await syncJobRevenue(workspaceId, job, job.createdBy || req.user._id.toString());
    job.updatedAt = new Date();
    await job.save();
  } catch (e) {
    console.error("Failed to sync job order collection", e);
  }

  res.json(job);
});

router.delete("/:workspaceId/job-orders/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const job = await JobOrder.findOne({ _id: id, workspaceId });
  if (!job) return res.status(404).json({ message: "Job order not found" });

  if (job.revenueId) {
    await RevenueEntry.deleteOne({ _id: job.revenueId, workspaceId }).catch(() => null);
  }
  await job.deleteOne();
  res.json({ message: "Job order deleted" });
});

export default router;
