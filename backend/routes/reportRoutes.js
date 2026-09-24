const express = require("express");
const RevenueEntry = require("../models/RevenueEntry");
const ExpenseEntry = require("../models/ExpenseEntry");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

const ensureWorkspaceAccess = (req, res, next) => {
  const { workspaceId } = req.params;
  if (!req.user.workspaces.includes(workspaceId)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

const getRange = (dateStr) => {
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

  const { start, end } = getRange(date);

  const [revenue, expenses] = await Promise.all([
    RevenueEntry.aggregate([
      { $match: { workspaceId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    ExpenseEntry.aggregate([
      { $match: { workspaceId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ])
  ]);

  const revenueTotal = revenue[0]?.total || 0;
  const expenseTotal = expenses[0]?.total || 0;

  res.json({
    date,
    revenue: revenueTotal,
    expenses: expenseTotal,
    net: revenueTotal - expenseTotal
  });
});

router.get("/:workspaceId/reports/monthly", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ message: "Month query is required" });
  }

  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 0, 23, 59, 59, 999);

  const [revenue, expenses] = await Promise.all([
    RevenueEntry.aggregate([
      { $match: { workspaceId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    ExpenseEntry.aggregate([
      { $match: { workspaceId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ])
  ]);

  const revenueTotal = revenue[0]?.total || 0;
  const expenseTotal = expenses[0]?.total || 0;

  res.json({
    month,
    revenue: revenueTotal,
    expenses: expenseTotal,
    net: revenueTotal - expenseTotal
  });
});

module.exports = router;
