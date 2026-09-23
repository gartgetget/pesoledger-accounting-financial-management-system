import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  FileSpreadsheet,
  Award,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP } from '../../utils/currency';
import { getMonthName, getTodayDateString, formatDateDisplay } from '../../utils/date';
import { CategoryHorizontalBars, PaymentMethodDistribution } from '../dashboard/Charts';
import { exportToExcel } from '../../utils/excel';

export const MonthlyAccountingView: React.FC = () => {
  const { revenueTransactions, expenses, getSummaryForRange } = useAccounting();

  const today = new Date(getTodayDateString());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-11

  // Start & End of Selected Month
  const monthRange = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
    const end = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
    return { startDate: start, endDate: end };
  }, [selectedYear, selectedMonth]);

  const monthSummary = useMemo(() => {
    return getSummaryForRange(monthRange);
  }, [monthRange, revenueTransactions, expenses]);

  // Daily Breakdown inside this month
  const dailyBreakdown = useMemo(() => {
    const map: Record<string, { revenue: number; expenses: number; count: number }> = {};

    revenueTransactions
      .filter((r) => !r.isVoid && r.date >= monthRange.startDate && r.date <= monthRange.endDate)
      .forEach((r) => {
        if (!map[r.date]) map[r.date] = { revenue: 0, expenses: 0, count: 0 };
        map[r.date].revenue += r.amount;
        map[r.date].count += 1;
      });

    expenses
      .filter((e) => !e.isVoid && e.date >= monthRange.startDate && e.date <= monthRange.endDate)
      .forEach((e) => {
        if (!map[e.date]) map[e.date] = { revenue: 0, expenses: 0, count: 0 };
        map[e.date].expenses += e.amount;
        map[e.date].count += 1;
      });

    return Object.entries(map)
      .map(([date, val]) => ({
        date,
        revenue: val.revenue,
        expenses: val.expenses,
        netIncome: val.revenue - val.expenses,
        count: val.count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [revenueTransactions, expenses, monthRange]);

  // Top revenue day
  const topRevenueDay = useMemo(() => {
    if (dailyBreakdown.length === 0) return null;
    return [...dailyBreakdown].sort((a, b) => b.revenue - a.revenue)[0];
  }, [dailyBreakdown]);

  const handleExport = () => {
    const exportData = dailyBreakdown.map((d) => ({
      'Date': d.date,
      'Revenue (PHP)': d.revenue,
      'Expenses (PHP)': d.expenses,
      'Net Income (PHP)': d.netIncome,
      'Transactions Count': d.count,
    }));
    exportToExcel([{ sheetName: 'Monthly Daily Breakdown', data: exportData }], `Monthly_Accounting_${getMonthName(selectedMonth)}_${selectedYear}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Month Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <CalendarRange className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Monthly Accounting Performance</h1>
            <p className="text-xs text-slate-500">
              Aggregated monthly collections, expenses, top volume days and category splits
            </p>
          </div>
        </div>

        {/* Year and Month Pickers */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {getMonthName(i)}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* MONTHLY SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Monthly Revenue
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-700 tabular-nums mt-1">
            {formatPHP(monthSummary.totalRevenue)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {getMonthName(selectedMonth)} {selectedYear} Collections
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Monthly Expenses
          </span>
          <p className="text-2xl font-bold font-mono text-rose-700 tabular-nums mt-1">
            {formatPHP(monthSummary.totalExpenses)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Disbursed in {getMonthName(selectedMonth)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Monthly Net Income
          </span>
          <p
            className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
              monthSummary.netIncome >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {formatPHP(monthSummary.netIncome)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Margin: {monthSummary.netMarginPercent.toFixed(1)}%
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            Top Revenue Day
          </span>
          {topRevenueDay ? (
            <>
              <p className="text-xl font-bold font-mono text-slate-900 tabular-nums mt-1">
                {formatPHP(topRevenueDay.revenue)}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {formatDateDisplay(topRevenueDay.date)}
              </span>
            </>
          ) : (
            <p className="text-xs text-slate-400 mt-2">No revenue this month</p>
          )}
        </div>
      </div>

      {/* DAILY CALENDAR BREAKDOWN FOR THIS MONTH */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900">
            Day-by-Day Reconciliation ({getMonthName(selectedMonth)} {selectedYear})
          </h2>
          <span className="text-[11px] text-slate-500">
            {dailyBreakdown.length} active business days recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 font-sans">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4 text-right">Collections (₱)</th>
                <th className="py-2.5 px-4 text-right">Disbursements (₱)</th>
                <th className="py-2.5 px-4 text-right">Daily Net (₱)</th>
                <th className="py-2.5 px-4 text-center">Transactions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-sans">
                    No transactions recorded for this month.
                  </td>
                </tr>
              ) : (
                dailyBreakdown.map((row) => (
                  <tr key={row.date} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                      {formatDateDisplay(row.date)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-700 font-bold tabular-nums">
                      {formatPHP(row.revenue)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-rose-700 font-bold tabular-nums">
                      {formatPHP(row.expenses)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-bold tabular-nums ${
                        row.netIncome >= 0 ? 'text-slate-900' : 'text-rose-600'
                      }`}
                    >
                      {formatPHP(row.netIncome)}
                    </td>
                    <td className="py-2.5 px-4 text-center font-sans text-slate-500">
                      {row.count} entries
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CATEGORY & PAYMENT METHOD DISTRIBUTIONS FOR THE MONTH */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 mb-3">Top Expense Categories This Month</h3>
          <CategoryHorizontalBars
            categories={monthSummary.expensesByCategory}
            total={monthSummary.totalExpenses}
            colorClass="bg-rose-500"
            emptyMessage="No expenses recorded this month."
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 mb-3">Payment Method Breakdown</h3>
          <PaymentMethodDistribution balances={monthSummary.paymentMethodBalances} />
        </div>
      </div>
    </div>
  );
};
