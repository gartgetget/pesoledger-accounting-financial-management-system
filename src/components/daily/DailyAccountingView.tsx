import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Receipt,
  Fuel,
  Wrench,
  Users,
  Wallet,
  CheckCircle2,
  CalendarDays,
  MapPin,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP, parseNumber } from '../../utils/currency';
import {
  getTodayDateString,
  formatDateDisplay,
  getDateRangeFromPreset,
} from '../../utils/date';
import { ExpenseModal } from '../expenses/ExpenseModal';

export const DailyAccountingView: React.FC<{
  onOpenRevenueModal: () => void;
  onOpenExpenseModal: () => void;
}> = ({ onOpenRevenueModal, onOpenExpenseModal }) => {
  const {
    revenueTransactions,
    expenses,
    paymentMethods,
    expenseCategories,
    areas,
    serviceJobs,
    addExpense,
    getSummaryForRange,
  } = useAccounting();

  // Selected Date (defaults to today 2026-09-22)
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  // Fast inline daily expense entry state
  const [quickCategory, setQuickCategory] = useState(expenseCategories[0]?.name || '');
  const [quickDesc, setQuickDesc] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickMethod, setQuickMethod] = useState(paymentMethods[0]?.id || 'pm-1');
  const [quickArea, setQuickArea] = useState('');

  useEffect(() => {
    if (expenseCategories.length > 0 && !expenseCategories.some((category) => category.name === quickCategory)) {
      setQuickCategory(expenseCategories[0].name);
    }
  }, [expenseCategories, quickCategory]);

  // Filter transactions for the selected single day
  const dailyRevenue = useMemo(() => {
    return revenueTransactions.filter(
      (r) => !r.isVoid && r.date === selectedDate
    );
  }, [revenueTransactions, selectedDate]);

  const dailyExpensesList = useMemo(() => {
    return expenses.filter(
      (e) => !e.isVoid && e.date === selectedDate
    );
  }, [expenses, selectedDate]);

  const dailySummary = useMemo(() => {
    return getSummaryForRange({ startDate: selectedDate, endDate: selectedDate });
  }, [selectedDate, revenueTransactions, expenses]);

  // Contextual Totals for Today, This Week, This Month, This Year
  const weeklySummary = useMemo(
    () => getSummaryForRange(getDateRangeFromPreset('this_week', selectedDate)),
    [selectedDate, revenueTransactions, expenses]
  );

  const monthlySummary = useMemo(
    () => getSummaryForRange(getDateRangeFromPreset('this_month', selectedDate)),
    [selectedDate, revenueTransactions, expenses]
  );

  const yearlySummary = useMemo(
    () => getSummaryForRange(getDateRangeFromPreset('this_year', selectedDate)),
    [selectedDate, revenueTransactions, expenses]
  );

  // Per-area breakdown for the selected day (same shared formula as dashboard / reports)
  const dailyAreaRows = useMemo(() => {
    const revByArea: Record<string, number> = {};
    dailyRevenue.forEach((r) => {
      const key = r.area || 'Unassigned';
      revByArea[key] = (revByArea[key] || 0) + (r.amount || 0);
    });

    const costByArea: Record<string, number> = {};
    serviceJobs
      .filter((j) => j.date === selectedDate)
      .forEach((j) => {
        const key = j.area || 'Unassigned';
        costByArea[key] = (costByArea[key] || 0) + (j.partsCostAmount || 0);
      });
    dailyExpensesList
      .filter((e) => e.relatedModule !== 'salary')
      .forEach((e) => {
        const key = e.area || 'Unassigned';
        costByArea[key] = (costByArea[key] || 0) + (e.amount || 0);
      });

    const names = Array.from(
      new Set([...areas.map((a) => a.name), ...Object.keys(revByArea), ...Object.keys(costByArea)])
    );
    const rows = names
      .map((name) => ({
        name,
        collections: revByArea[name] || 0,
        costs: costByArea[name] || 0,
      }))
      .sort((a, b) => b.collections - a.collections || b.costs - a.costs);

    return {
      rows,
      totalCollections: rows.reduce((s, r) => s + r.collections, 0),
      totalCosts: rows.reduce((s, r) => s + r.costs, 0),
    };
  }, [dailyRevenue, dailyExpensesList, serviceJobs, selectedDate, areas]);

  const handleQuickAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseNumber(quickAmount);
    if (!quickDesc.trim() || amt <= 0) return;

    addExpense({
      date: selectedDate,
      category: quickCategory,
      description: quickDesc.trim(),
      amount: amt,
      paymentMethodId: quickMethod,
      area: quickArea,
      relatedModule: 'daily',
    });

    setQuickDesc('');
    setQuickAmount('');
    setQuickArea('');
  };

  const getMethodName = (pmId: string) => {
    const found = paymentMethods.find((p) => p.id === pmId);
    return found ? found.name : pmId;
  };

  return (
    <div className="space-y-6">
      {/* Top Day Picker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Daily Accounting Reconciliation</h1>
              <p className="text-xs text-slate-500">
                Itemized collections, expenses and net balance for a specific day
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium cursor-pointer"
          >
            ← Previous Day
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-slate-50 min-w-0"
          />

          <button
            onClick={() => setSelectedDate(getTodayDateString())}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Today
          </button>

          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium cursor-pointer"
          >
            Next Day →
          </button>
        </div>
      </div>

      {/* RESULT CARDS: Daily Revenue, Daily Expenses, Daily Net Income */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Daily Revenue</span>
            <span className="text-emerald-600 font-bold">{dailyRevenue.length} Trans</span>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {formatPHP(dailySummary.totalRevenue)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Collected on {formatDateDisplay(selectedDate)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Daily Expenses</span>
            <span className="text-rose-600 font-bold">{dailyExpensesList.length} Trans</span>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-700 tabular-nums">
            {formatPHP(dailySummary.totalExpenses)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Disbursed on {formatDateDisplay(selectedDate)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Daily Net Income</span>
            <span className="text-slate-500 font-mono text-[10px]">Rev - Exp</span>
          </div>
          <p
            className={`text-2xl font-bold font-mono tabular-nums ${
              dailySummary.netIncome >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {formatPHP(dailySummary.netIncome)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Profit Margin: {dailySummary.netMarginPercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* ACCUMULATED CONTEXT RUNNING TOTALS (Core Objective 5 requirement) */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Accumulated Benchmark Reference
          </span>
          <h3 className="text-sm font-bold text-slate-100 mt-0.5">
            Running Financial Totals for Selected Date's Period
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs">
          <div className="border-l border-slate-700 pl-3">
            <span className="text-slate-400 text-[10px] block">Weekly Total</span>
            <span className="font-mono font-bold text-emerald-400 tabular-nums">
              Net {formatPHP(weeklySummary.netIncome)}
            </span>
          </div>
          <div className="border-l border-slate-700 pl-3">
            <span className="text-slate-400 text-[10px] block">Monthly Total</span>
            <span className="font-mono font-bold text-sky-400 tabular-nums">
              Net {formatPHP(monthlySummary.netIncome)}
            </span>
          </div>
          <div className="border-l border-slate-700 pl-3">
            <span className="text-slate-400 text-[10px] block">Yearly Total</span>
            <span className="font-mono font-bold text-amber-400 tabular-nums">
              Net {formatPHP(yearlySummary.netIncome)}
            </span>
          </div>
        </div>
      </div>

      {/* QUICK ADD DAILY EXPENSE ROW (CORE OBJECTIVE 5) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-rose-600" />
            Quick Record Daily Expense / Petty Cash on {formatDateDisplay(selectedDate)}
          </h3>
          <span className="text-[11px] text-slate-400">Instantly posts to General Ledger</span>
        </div>

        <form onSubmit={handleQuickAddExpense} className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
          <div>
            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white"
              required
            >
              {expenseCategories.length === 0 && <option value="">Add an expense category in Settings</option>}
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <input
              type="text"
              value={quickDesc}
              onChange={(e) => setQuickDesc(e.target.value)}
              placeholder="Description (e.g. Drinking water, lunch, motor gas)"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
              required
            />
          </div>

          <div>
            <input
              type="number"
              step="any"
              value={quickAmount}
              onChange={(e) => setQuickAmount(e.target.value)}
              placeholder="Amount (₱)"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden font-mono font-semibold"
              required
            />
          </div>

          <div>
            <select
              value={quickArea}
              onChange={(e) => setQuickArea(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white"
            >
              <option value="">No area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              + Log Expense
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 12: DETAILED DAILY BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Collections */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900">Collections on {formatDateDisplay(selectedDate)}</h3>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700">
              {formatPHP(dailySummary.totalRevenue)}
            </span>
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2 px-3">Inv #</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyRevenue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      No collections recorded on this date.
                    </td>
                  </tr>
                ) : (
                  dailyRevenue.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-mono font-semibold text-slate-800">{r.invoiceNumber}</td>
                      <td className="py-2 px-3 font-medium text-slate-700">{r.category}</td>
                      <td className="py-2 px-3 text-slate-700 truncate max-w-[140px]">{r.description}</td>
                      <td className="py-2 px-3 text-slate-500">{getMethodName(r.paymentMethodId)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatPHP(r.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Expenses Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-900">Expenses on {formatDateDisplay(selectedDate)}</h3>
            </div>
            <span className="text-xs font-mono font-bold text-rose-700">
              {formatPHP(dailySummary.totalExpenses)}
            </span>
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyExpensesList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                      No expenses logged on this date.
                    </td>
                  </tr>
                ) : (
                  dailyExpensesList.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-semibold text-slate-800">{e.category}</td>
                      <td className="py-2 px-3 text-slate-700 truncate max-w-[150px]">{e.description}</td>
                      <td className="py-2 px-3 text-slate-500">{getMethodName(e.paymentMethodId)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                        {formatPHP(e.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PER-AREA BREAKDOWN FOR SELECTED DAY */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900">Per-Area Breakdown on {formatDateDisplay(selectedDate)}</h3>
          </div>
          <span className="text-[11px] text-slate-500">Collections vs job & tagged expense costs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 font-sans">
              <tr>
                <th className="py-2.5 px-4">Area</th>
                <th className="py-2.5 px-4 text-right">Collections</th>
                <th className="py-2.5 px-4 text-right">Costs</th>
                <th className="py-2.5 px-4 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyAreaRows.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 font-sans">
                    No areas or transactions on this date yet.
                  </td>
                </tr>
              ) : (
                dailyAreaRows.rows.map((row) => {
                  const net = row.collections - row.costs;
                  return (
                    <tr key={row.name} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-800">{row.name}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-700 tabular-nums">
                        {formatPHP(row.collections)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-rose-700 tabular-nums">
                        {formatPHP(row.costs)}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-bold tabular-nums ${net >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                        {formatPHP(net)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {dailyAreaRows.rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-semibold bg-slate-50">
                  <td className="py-2.5 px-4 font-sans uppercase text-[10px] tracking-wider text-slate-500">Total</td>
                  <td className="py-2.5 px-4 text-right text-emerald-800 tabular-nums">
                    {formatPHP(dailyAreaRows.totalCollections)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-800 tabular-nums">
                    {formatPHP(dailyAreaRows.totalCosts)}
                  </td>
                  <td className={`py-2.5 px-4 text-right font-bold tabular-nums ${dailyAreaRows.totalCollections - dailyAreaRows.totalCosts >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                    {formatPHP(dailyAreaRows.totalCollections - dailyAreaRows.totalCosts)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
