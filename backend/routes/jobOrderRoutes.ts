import { createRouter } from "../middleware/createRouter.js";
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

  const job = await JobOrder.create({
    workspaceId,
    customerId: b.customerId,
    customerName: b.customerName || "",
    serviceCategoryId: b.serviceCategoryId || b.serviceCategory,
    serviceCategory: b.serviceCategory || "",
    jobNumber: b.jobNumber,
    assignedTechnician: b.assignedTechnician || b.technicianId || "",
    technicianName: b.technicianName || "",
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
    amountPaid: Number(b.amountPaid ?? 0),
    paymentMethodId: b.paymentMethodId || "",
    notes: b.notes || "",
    createdBy: req.user._id.toString(),
  });

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
    "jobNumber", "assignedTechnician", "technicianName", "status", "paymentStatus",
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

  Object.assign(job, allowed);
  job.updatedAt = new Date();
  await job.save();

  res.json(job);
});

router.delete("/:workspaceId/job-orders/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const job = await JobOrder.findOne({ _id: id, workspaceId });
  if (!job) return res.status(404).json({ message: "Job order not found" });

  await job.deleteOne();
  res.json({ message: "Job order deleted" });
});

export default router;
