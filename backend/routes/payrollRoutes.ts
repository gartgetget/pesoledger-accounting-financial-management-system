import { createRouter } from "../middleware/createRouter.js";
import PayrollEntry from "../models/PayrollEntry.js";
import ExpenseEntry from "../models/ExpenseEntry.js";
import Category from "../models/Category.js";
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

const findCategoryIdByName = async (workspaceId: string, name: string, type: string) => {
  const exact = await Category.findOne({ workspaceId, name, type });
  if (exact) return exact._id.toString();
  const ci = await Category.findOne({ workspaceId, name: new RegExp(`^${name}$`, "i"), type });
  return ci ? ci._id.toString() : "";
};

const syncPayrollExpense = async (workspaceId: string, entry: PayrollEntryDoc, createdBy: string) => {
  const categoryId = await findCategoryIdByName(workspaceId, "SALARY", "expense");
  const amount = entry.grossSalary || entry.grossPay || 0;
  const payload = {
    date: entry.date,
    categoryId,
    category: "SALARY",
    description: `Payroll — ${entry.employeeName} (${entry.period})`,
    amount,
    paymentMethod: entry.paymentMethodId || "Cash",
    relatedModule: "salary",
    relatedId: entry._id.toString(),
  };

  if (entry.expenseId) {
    const exp = await ExpenseEntry.findOne({ _id: entry.expenseId, workspaceId });
    if (exp) {
      Object.assign(exp, payload);
      exp.updatedAt = new Date();
      await exp.save();
      return exp._id.toString();
    }
  }

  const exp = await ExpenseEntry.create({ workspaceId, ...payload, createdBy });
  return exp._id.toString();
};

type PayrollEntryDoc = InstanceType<typeof PayrollEntry>;

router.get("/:workspaceId/payroll", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const payroll = await PayrollEntry.find({ workspaceId }).sort({ createdAt: -1 });
  res.json(payroll);
});

router.post("/:workspaceId/payroll", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const b = req.body || {};
  const employeeName = b.employeeName;
  const period = b.period;

  if (!employeeName || !period) {
    return res.status(400).json({ message: "Employee name and period are required" });
  }

  const gross = Number(b.grossSalary ?? b.grossPay ?? 0);
  const net = Number(b.netSalary ?? b.netPay ?? 0);
  const deductions = Number(b.deductions || 0);

  try {
    const entry = await PayrollEntry.create({
      workspaceId,
      employeeId: b.employeeId || "",
      employeeName,
      date: b.date ? new Date(b.date) : new Date(),
      period,
      daysWorked: Number(b.daysWorked || 0),
      dailyRate: Number(b.dailyRate || 0),
      foodRate: Number(b.foodRate || 0),
      basicSalary: Number(b.basicSalary || 0),
      overtimePay: Number(b.overtimePay || 0),
      incentives: Number(b.incentives || 0),
      coop: Number(b.coop || 0),
      foodAllowance: Number(b.foodAllowance || 0),
      grossPay: gross,
      grossSalary: gross,
      deductions,
      netPay: net,
      netSalary: net,
      paymentMethodId: b.paymentMethodId || "",
      notes: b.notes || "",
      createdBy: req.user._id.toString(),
    });

    try {
      entry.expenseId = await syncPayrollExpense(workspaceId, entry, req.user._id.toString());
      entry.updatedAt = new Date();
      await entry.save();
    } catch (e) {
      console.error("Failed to post payroll expense to ledger", e);
    }

    res.status(201).json(entry);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to process payroll" });
  }
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

  const b = req.body || {};
  const allowed: Record<string, unknown> = {};
  const keys = [
    "employeeId", "employeeName", "date", "period", "daysWorked", "dailyRate", "foodRate",
    "basicSalary", "overtimePay", "incentives", "coop", "foodAllowance", "deductions", "paymentMethodId", "notes",
  ];
  for (const k of keys) {
    if (b[k] !== undefined) allowed[k] = b[k];
  }
  for (const n of ["daysWorked", "dailyRate", "foodRate", "coop"]) {
    if (allowed[n] !== undefined) allowed[n] = Number(allowed[n]) || 0;
  }
  if (b.grossSalary !== undefined) allowed.grossSalary = Number(b.grossSalary);
  if (b.grossPay !== undefined) allowed.grossPay = Number(b.grossPay);
  if (b.netSalary !== undefined) allowed.netSalary = Number(b.netSalary);
  if (b.netPay !== undefined) allowed.netPay = Number(b.netPay);
  if (b.date) allowed.date = new Date(b.date);

  Object.assign(entry, allowed);
  if (b.grossSalary !== undefined || b.grossPay !== undefined) entry.grossPay = entry.grossSalary || entry.grossPay;
  if (b.netSalary !== undefined || b.netPay !== undefined) entry.netPay = entry.netSalary || entry.netPay;
  entry.updatedAt = new Date();
  await entry.save();

  try {
    entry.expenseId = await syncPayrollExpense(workspaceId, entry, entry.createdBy || req.user._id.toString());
    entry.updatedAt = new Date();
    await entry.save();
  } catch (e) {
    console.error("Failed to sync payroll expense", e);
  }

  res.json(entry);
});

router.delete("/:workspaceId/payroll/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const entry = await PayrollEntry.findOne({ _id: id, workspaceId });
  if (!entry) return res.status(404).json({ message: "Payroll entry not found" });

  if (entry.expenseId) {
    await ExpenseEntry.deleteOne({ _id: entry.expenseId, workspaceId }).catch(() => null);
  }
  await entry.deleteOne();
  res.json({ message: "Payroll entry deleted" });
});

export default router;
