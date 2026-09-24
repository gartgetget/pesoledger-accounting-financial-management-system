import { createRouter } from "../middleware/createRouter";
import JobOrder from "../models/JobOrder";
import auth from "../middleware/auth";

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
  const {
    customerId, serviceCategoryId, jobNumber, assignedTechnician,
    description, laborCost, partsUsed, totalAmount, status,
  } = req.body;

  if (!jobNumber) {
    return res.status(400).json({ message: "Job number is required" });
  }

  const job = await JobOrder.create({
    workspaceId, customerId, serviceCategoryId, jobNumber,
    assignedTechnician: assignedTechnician || "",
    description: description || "",
    laborCost: Number(laborCost || 0),
    partsUsed: partsUsed || [],
    totalAmount: Number(totalAmount || 0),
    status: status || "open",
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

  Object.assign(job, req.body);
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
