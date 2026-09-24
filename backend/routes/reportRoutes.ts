import { createRouter } from "../middleware/createRouter";
import RevenueEntry from "../models/RevenueEntry";
import ExpenseEntry from "../models/ExpenseEntry";
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

const getRange = (dateStr: string) => {
  const date = new Date(dateStr);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

router.get("/:workspaceId/reports/daily", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date query is required" });
  }

  const { start, end } = getRange(date as string);

  const [revenue, expenses] = await Promise.all([
    RevenueEntry.aggregate([
      { $match: { workspaceId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    ExpenseEntry.aggregate([
      { $match: { workspaceId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const revenueTotal = revenue[0]?.total || 0;
  const expenseTotal = expenses[0]?.total || 0;

  res.json({ date, revenue: revenueTotal, expenses: expenseTotal, net: revenueTotal - expenseTotal });
});

router.get("/:workspaceId/reports/monthly", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ message: "Month query is required" });
  }

  const [year, mon] = (month as string).split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 0, 23, 59, 59, 999);

  const [revenue, expenses] = await Promise.all([
    RevenueEntry.aggregate([
      { $match: { workspaceId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    ExpenseEntry.aggregate([
      { $match: { workspaceId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const revenueTotal = revenue[0]?.total || 0;
  const expenseTotal = expenses[0]?.total || 0;

  res.json({ month, revenue: revenueTotal, expenses: expenseTotal, net: revenueTotal - expenseTotal });
});

router.get("/:workspaceId/reports/yearly", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { year } = req.query;

  if (!year) {
    return res.status(400).json({ message: "Year query is required" });
  }

  const y = parseInt(year as string);
  const start = new Date(y, 0, 1);
  const end = new Date(y, 11, 31, 23, 59, 59, 999);

  const [revenue, expenses] = await Promise.all([
    RevenueEntry.aggregate([
      { $match: { workspaceId, date: { $gte: start, $lte: end } } },
      { $group: { _id: { $month: "$date" }, total: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
    ]),
    ExpenseEntry.aggregate([
      { $match: { workspaceId, date: { $gte: start, $lte: end } } },
      { $group: { _id: { $month: "$date" }, total: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const revenueByMonth: Record<number, number> = {};
  revenue.forEach((r: any) => { revenueByMonth[r._id] = r.total; });
  const expenseByMonth: Record<number, number> = {};
  expenses.forEach((e: any) => { expenseByMonth[e._id] = e.total; });

  const monthlyData = [];
  for (let m = 1; m <= 12; m++) {
    monthlyData.push({
      monthIndex: m - 1,
      monthName: new Date(y, m - 1).toLocaleString("en-US", { month: "short" }),
      revenue: revenueByMonth[m] || 0,
      expenses: expenseByMonth[m] || 0,
      net: (revenueByMonth[m] || 0) - (expenseByMonth[m] || 0),
    });
  }

  const totalRevenue = monthlyData.reduce((s: number, d: any) => s + d.revenue, 0);
  const totalExpenses = monthlyData.reduce((s: number, d: any) => s + d.expenses, 0);

  res.json({ year, monthlyData, totalRevenue, totalExpenses, net: totalRevenue - totalExpenses });
});

export default router;
