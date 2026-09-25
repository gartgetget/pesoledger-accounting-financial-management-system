import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP } from '../../utils/currency';
import { getTodayDateString } from '../../utils/date';
import { RevenueExpensesBarChart } from '../dashboard/Charts';
import { exportToExcel } from '../../utils/excel';

export const YearlyAccountingView: React.FC = () => {
  const { getYearlyMatrix } = useAccounting();

  const currentYear = new Date(getTodayDateString()).getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const monthsMatrix = useMemo(() => {
    return getYearlyMatrix(selectedYear);
  }, [selectedYear, getYearlyMatrix]);

  const totalYearRevenue = monthsMatrix.reduce((s, m) => s + m.revenue, 0);
  const totalYearExpenses = monthsMatrix.reduce((s, m) => s + m.expenses, 0);
  const totalYearNetIncome = totalYearRevenue - totalYearExpenses;
  const netMarginPct = totalYearRevenue > 0 ? ((totalYearNetIncome / totalYearRevenue) * 100).toFixed(1) : '0';

  // Format data for chart
  const chartData = monthsMatrix.map((m) => ({
    label: m.monthName.substring(0, 3),
    revenue: m.revenue,
    expenses: m.expenses,
    netIncome: m.netIncome,
  }));

  const handleExport = () => {
    const exportData = monthsMatrix.map((m) => ({
      'Month': m.monthName,
      'Revenue (PHP)': m.revenue,
      'Expenses (PHP)': m.expenses,
      'Net Income (PHP)': m.netIncome,
    }));
    exportData.push({
      'Month': 'ANNUAL TOTAL',
      'Revenue (PHP)': totalYearRevenue,
      'Expenses (PHP)': totalYearExpenses,
      'Net Income (PHP)': totalYearNetIncome,
    });
    exportToExcel([{ sheetName: '12-Month Matrix', data: exportData }], `Annual_Matrix_${selectedYear}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <CalendarRange className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">12-Month Annual Accounting Matrix</h1>
            <p className="text-xs text-slate-500">
              Complete full-year Jan - Dec financial performance and trend analysis
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
          >
            <option value={2025}>Fiscal Year 2025</option>
            <option value={2026}>Fiscal Year 2026</option>
            <option value={2027}>Fiscal Year 2027</option>
          </select>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export 12-Month Matrix</span>
          </button>
        </div>
      </div>

      {/* ANNUAL TOTAL CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Annual Revenue
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-700 tabular-nums mt-1">
            {formatPHP(totalYearRevenue)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            January - December {selectedYear}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Annual Expenses
          </span>
          <p className="text-2xl font-bold font-mono text-rose-700 tabular-nums mt-1">
            {formatPHP(totalYearExpenses)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Operating outflows
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Annual Net Income
          </span>
          <p
            className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
              totalYearNetIncome >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {formatPHP(totalYearNetIncome)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Annual Net Margin: {netMarginPct}%
          </span>
        </div>
      </div>

      {/* 12-MONTH VISUAL BAR CHART */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 mb-1">
          12-Month Revenue vs. Expenses Performance ({selectedYear})
        </h3>
        <p className="text-xs text-slate-500 mb-3">Side-by-side monthly collections and operating costs</p>
        <RevenueExpensesBarChart data={chartData} />
      </div>

      {/* 12-MONTH TABLE (Section 14) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900">
            Monthly Ledger Matrix: January to December {selectedYear}
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">PHP (₱)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 font-sans">
              <tr>
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4 text-right">Revenue (Collections)</th>
                <th className="py-3 px-4 text-right">Expenses (Outflow)</th>
                <th className="py-3 px-4 text-right">Net Income (Profit)</th>
                <th className="py-3 px-4 text-right">Profit Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthsMatrix.map((m) => {
                const margin = m.revenue > 0 ? ((m.netIncome / m.revenue) * 100).toFixed(1) : '0';
                return (
                  <tr key={m.monthIndex} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-sans font-bold text-slate-800">
                      {m.monthName}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-bold tabular-nums">
                      {formatPHP(m.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-700 font-bold tabular-nums">
                      {formatPHP(m.expenses)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold tabular-nums ${
                        m.netIncome >= 0 ? 'text-slate-900' : 'text-rose-600'
                      }`}
                    >
                      {formatPHP(m.netIncome)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 tabular-nums">
                      {m.revenue > 0 ? `${margin}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* TOTAL FOOTER ROW */}
            <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-800">
              <tr>
                <td className="py-3.5 px-4 font-sans uppercase tracking-wider">ANNUAL TOTAL</td>
                <td className="py-3.5 px-4 text-right text-emerald-400 tabular-nums">
                  {formatPHP(totalYearRevenue)}
                </td>
                <td className="py-3.5 px-4 text-right text-rose-400 tabular-nums">
                  {formatPHP(totalYearExpenses)}
                </td>
                <td className="py-3.5 px-4 text-right text-amber-400 tabular-nums text-sm">
                  {formatPHP(totalYearNetIncome)}
                </td>
                <td className="py-3.5 px-4 text-right text-slate-300 tabular-nums">
                  {netMarginPct}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
