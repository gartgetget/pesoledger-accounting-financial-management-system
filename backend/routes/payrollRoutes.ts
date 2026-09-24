import { createRouter } from "../middleware/createRouter.js";
import PayrollEntry from "../models/PayrollEntry.js";
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

router.get("/:workspaceId/payroll", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const payroll = await PayrollEntry.find({ workspaceId }).sort({ createdAt: -1 });
  res.json(payroll);
});

router.post("/:workspaceId/payroll", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { employeeName, period, grossPay, deductions, netPay } = req.body;

  if (!employeeName || !period) {
    return res.status(400).json({ message: "Employee name and period are required" });
  }

  const entry = await PayrollEntry.create({
    workspaceId, employeeName, period,
    grossPay: Number(grossPay || 0),
    deductions: Number(deductions || 0),
    netPay: Number(netPay || 0),
    createdBy: req.user._id.toString(),
  });

  res.status(201).json(entry);
});

router.get("/:workspaceId/payroll/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const entry = await PayrollEntry.findOne({ _id: id, workspaceId });
  if (!entry) return res.status(404).json({ message: "Payroll entry not found" });
  res.json(entry);
});

router.put("/:workspaceId/payroll/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const entry = await PayrollEntry.findOne({ _id: id, workspaceId });
  if (!entry) return res.status(404).json({ message: "Payroll entry not found" });

  Object.assign(entry, req.body);
  entry.updatedAt = new Date();
  await entry.save();

  res.json(entry);
});

router.delete("/:workspaceId/payroll/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const entry = await PayrollEntry.findOne({ _id: id, workspaceId });
  if (!entry) return res.status(404).json({ message: "Payroll entry not found" });

  await entry.deleteOne();
  res.json({ message: "Payroll entry deleted" });
});

export default router;
