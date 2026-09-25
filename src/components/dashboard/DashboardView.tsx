import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  Wrench,
  Fuel,
  Users,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP } from '../../utils/currency';
import {
  getDateRangeFromPreset,
  getTodayDateString,
  formatDateDisplay,
} from '../../utils/date';
import {
  RevenueExpensesBarChart,
  CategoryHorizontalBars,
  PaymentMethodDistribution,
} from './Charts';

export const DashboardView: React.FC<{
  onOpenRevenueModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenJobModal: () => void;
}> = ({ onOpenRevenueModal, onOpenExpenseModal, onOpenJobModal }) => {
  const {
    revenueTransactions,
    expenses,
    paymentMethods,
    financialSummary,
    getSummaryForRange,
    getYearlyMatrix,
    dateRange,
    dateFilterPreset,
    setActiveTab,
  } = useAccounting();

  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'revenue' | 'expense'>('all');

  const todayStr = getTodayDateString();

  // 1. Calculate Period Snapshots (Today, This Week, This Month, This Year)
  const todaySummary = useMemo(
    () => getSummaryForRange(getDateRangeFromPreset('today', todayStr)),
    [revenueTransactions, expenses, todayStr]
  );

  const thisWeekSummary = useMemo(
    () => getSummaryForRange(getDateRangeFromPreset('this_week', todayStr)),
    [revenueTransactions, expenses, todayStr]
  );

  const thisMonthSummary = useMemo(
    () => getSummaryForRange(getDateRangeFromPreset('this_month', todayStr)),
    [revenueTransactions, expenses, todayStr]
  );

  const thisYearSummary = useMemo(
    () => getSummaryForRange(getDateRangeFromPreset('this_year', todayStr)),
    [revenueTransactions, expenses, todayStr]
  );

  // 2. Prepare 6-month comparative chart data
  const currentYear = new Date(todayStr).getFullYear();
  const yearlyMatrix = useMemo(() => getYearlyMatrix(currentYear), [currentYear, revenueTransactions, expenses]);
  
  // Format matrix for bar chart: display last 6 months up to current month (e.g. Apr to Sep)
  const currentMonthIdx = new Date(todayStr).getMonth();
  const chartData = useMemo(() => {
    return yearlyMatrix
      .filter((m) => m.monthIndex <= currentMonthIdx && m.monthIndex >= Math.max(0, currentMonthIdx - 5))
      .map((m) => ({
        label: m.monthName.substring(0, 3),
        revenue: m.revenue,
        expenses: m.expenses,
        netIncome: m.netIncome,
      }));
  }, [yearlyMatrix, currentMonthIdx]);

  // 3. Combined Recent Transactions List
  const recentTransactions = useMemo(() => {
    const revs = revenueTransactions.map((r) => ({
      id: r.id,
      date: r.date,
      type: 'revenue' as const,
      category: r.category,
      description: r.description,
      customerOrVendor: r.customerName,
      paymentMethodId: r.paymentMethodId,
      amount: r.amount,
      isVoid: r.isVoid,
      createdAt: r.createdAt,
    }));

    const exps = expenses.map((e) => ({
      id: e.id,
      date: e.date,
      type: 'expense' as const,
      category: e.category,
      description: e.description,
      customerOrVendor: e.vendorSupplier || e.employeeName || 'Operational',
      paymentMethodId: e.paymentMethodId,
      amount: e.amount,
      isVoid: e.isVoid,
      createdAt: e.createdAt,
    }));

    return [...revs, ...exps]
      .filter((item) => {
        if (transactionTypeFilter === 'revenue' && item.type !== 'revenue') return false;
        if (transactionTypeFilter === 'expense' && item.type !== 'expense') return false;
        if (transactionSearch.trim()) {
          const q = transactionSearch.toLowerCase();
          return (
            item.description.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) ||
            item.customerOrVendor.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10);
  }, [revenueTransactions, expenses, transactionTypeFilter, transactionSearch]);

  const getMethodName = (pmId: string) => {
    const found = paymentMethods.find((p) => p.id === pmId);
    return found ? found.name : pmId || 'Cash';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Accounting Financial Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Current Filter View: <strong className="text-slate-800">{formatDateDisplay(dateRange.startDate)} to {formatDateDisplay(dateRange.endDate)}</strong> · Base Currency: Philippine Peso (₱)
          </p>
        </div>

        {/* Quick Summary Highlights Pill */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Period Inflow</span>
            <span className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
              {formatPHP(financialSummary.totalRevenue)}
            </span>
          </div>
          <div className="px-3.5 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Period Outflow</span>
            <span className="text-sm font-bold text-rose-700 font-mono tabular-nums">
              {formatPHP(financialSummary.totalExpenses)}
            </span>
          </div>
          <div className="px-3.5 py-2 bg-emerald-50/80 rounded-lg border border-emerald-200">
            <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold block">Net Income</span>
            <span className={`text-sm font-bold font-mono tabular-nums ${financialSummary.netIncome >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
              {formatPHP(financialSummary.netIncome)}
            </span>
          </div>
        </div>
      </div>

      {/* CORE OBJECTIVE 2: 3 Matrix Summary Columns: Revenue, Expenses, Profit (Today, Week, Month, Year) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Column 1: REVENUE */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Total Collections & Revenue</h2>
            </div>
            <button
              onClick={() => setActiveTab('revenue')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
            >
              View All →
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">Today's Revenue</span>
              <strong className="font-mono tabular-nums text-emerald-700 text-sm">
                {formatPHP(todaySummary.totalRevenue)}
              </strong>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">This Week's Revenue</span>
              <strong className="font-mono tabular-nums text-slate-800 text-sm">
                {formatPHP(thisWeekSummary.totalRevenue)}
              </strong>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">This Month's Revenue</span>
              <strong className="font-mono tabular-nums text-slate-900 text-sm font-bold">
                {formatPHP(thisMonthSummary.totalRevenue)}
              </strong>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">This Year's Revenue</span>
              <strong className="font-mono tabular-nums text-slate-800 text-sm">
                {formatPHP(thisYearSummary.totalRevenue)}
              </strong>
            </div>
          </div>
        </div>

        {/* Column 2: EXPENSES */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Business Expenses</h2>
            </div>
            <button
              onClick={() => setActiveTab('expenses')}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
            >
              View All →
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">Today's Expenses</span>
              <strong className="font-mono tabular-nums text-rose-700 text-sm">
                {formatPHP(todaySummary.totalExpenses)}
              </strong>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">This Week's Expenses</span>
              <strong className="font-mono tabular-nums text-slate-800 text-sm">
                {formatPHP(thisWeekSummary.totalExpenses)}
              </strong>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">This Month's Expenses</span>
              <strong className="font-mono tabular-nums text-slate-900 text-sm font-bold">
                {formatPHP(thisMonthSummary.totalExpenses)}
              </strong>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">This Year's Expenses</span>
              <strong className="font-mono tabular-nums text-slate-800 text-sm">
                {formatPHP(thisYearSummary.totalExpenses)}
              </strong>
            </div>
          </div>
        </div>

        {/* Column 3: PROFIT / NET INCOME */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Net Profit / Margin</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Formula: Rev - Exp</span>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">Today's Net Income</span>
              <strong className={`font-mono tabular-nums text-sm ${todaySummary.netIncome >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatPHP(todaySummary.netIncome)}
              </strong>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">This Week's Net Income</span>
              <strong className={`font-mono tabular-nums text-sm ${thisWeekSummary.netIncome >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                {formatPHP(thisWeekSummary.netIncome)}
              </strong>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">This Month's Net Income</span>
              <strong className={`font-mono tabular-nums text-sm font-bold ${thisMonthSummary.netIncome >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatPHP(thisMonthSummary.netIncome)}
              </strong>
            </div>
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">This Year's Net Income</span>
              <strong className={`font-mono tabular-nums text-sm ${thisYearSummary.netIncome >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                {formatPHP(thisYearSummary.netIncome)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* CORE OBJECTIVE 2 (PART B): Total Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Collections</span>
          <p className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-1">
            {formatPHP(financialSummary.totalRevenue)}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Expenses</span>
          <p className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-1">
            {formatPHP(financialSummary.totalExpenses)}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Parts Cost</span>
          <p className="text-sm font-bold text-amber-700 font-mono tabular-nums mt-1">
            {formatPHP(financialSummary.partsExpense)}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Salaries / Payroll</span>
          <p className="text-sm font-bold text-indigo-700 font-mono tabular-nums mt-1">
            {formatPHP(financialSummary.salaryExpense)}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Gas & Fuel</span>
          <p className="text-sm font-bold text-orange-700 font-mono tabular-nums mt-1">
            {formatPHP(financialSummary.gasExpense)}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Other Expenses</span>
          <p className="text-sm font-bold text-slate-700 font-mono tabular-nums mt-1">
            {formatPHP(financialSummary.otherExpenses)}
          </p>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Bar Chart: Revenue vs Expenses (Monthly Trend) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue vs. Expenses Trend</h3>
              <p className="text-xs text-slate-500">6-Month historical performance with net profit margins</p>
            </div>
            <button
              onClick={() => setActiveTab('yearly')}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              Full 12-Month Matrix →
            </button>
          </div>
          <RevenueExpensesBarChart data={chartData} />
        </div>

        {/* Payment Method Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payment Inflow & Balance</h3>
              <p className="text-xs text-slate-500">Cash vs Banks vs E-wallets</p>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
            >
              Report →
            </button>
          </div>
          <PaymentMethodDistribution balances={financialSummary.paymentMethodBalances} />
        </div>
      </div>

      {/* CATEGORY BREAKDOWNS (Revenue vs Expenses Categories) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue by Service Category</h3>
              <p className="text-xs text-slate-500">REF/AC, WM/TV, Parañaque, Jim/Eugene, etc.</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700">
              {formatPHP(financialSummary.totalRevenue)}
            </span>
          </div>
          <CategoryHorizontalBars
            categories={financialSummary.revenueByCategory}
            total={financialSummary.totalRevenue}
            colorClass="bg-emerald-500"
            emptyMessage="No revenue transactions recorded in this period."
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Expenses by Operational Category</h3>
              <p className="text-xs text-slate-500">Gas, Salaries, Sasakyan, Parts, Rent, etc.</p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-700">
              {formatPHP(financialSummary.totalExpenses)}
            </span>
          </div>
          <CategoryHorizontalBars
            categories={financialSummary.expensesByCategory}
            total={financialSummary.totalExpenses}
            colorClass="bg-rose-500"
            emptyMessage="No expenses recorded in this period."
          />
        </div>
      </div>

      {/* RECENT TRANSACTIONS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Accounting Ledger Activity</h3>
            <p className="text-xs text-slate-500">Real-time synchronized transactions across all modules</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setTransactionTypeFilter('all')}
                className={`px-2.5 py-1 font-medium rounded-md cursor-pointer transition-colors ${
                  transactionTypeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTransactionTypeFilter('revenue')}
                className={`px-2.5 py-1 font-medium rounded-md cursor-pointer transition-colors ${
                  transactionTypeFilter === 'revenue' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setTransactionTypeFilter('expense')}
                className={`px-2.5 py-1 font-medium rounded-md cursor-pointer transition-colors ${
                  transactionTypeFilter === 'expense' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                Expenses
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={transactionSearch}
                onChange={(e) => setTransactionSearch(e.target.value)}
                placeholder="Search transactions..."
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-400 w-40 sm:w-56"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 hidden md:table-cell">Category</th>
                <th className="py-2.5 px-4">Particulars / Description</th>
                <th className="py-2.5 px-4 hidden md:table-cell">Party / Responsible</th>
                <th className="py-2.5 px-4 hidden md:table-cell">Payment Method</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No transactions match your search criteria.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      tx.isVoid ? 'opacity-40 line-through bg-slate-50/50' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 whitespace-nowrap font-medium text-slate-700">
                      {formatDateDisplay(tx.date)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {tx.type === 'revenue' ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Collection
                        </span>
                      ) : (
                        <span className="text-rose-700 font-semibold flex items-center gap-1">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          Expense
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap hidden md:table-cell">
                      <span className="font-medium text-slate-700">{tx.category}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-800 max-w-xs truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 truncate max-w-[160px] hidden md:table-cell">
                      {tx.customerOrVendor}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap hidden md:table-cell">
                      {getMethodName(tx.paymentMethodId)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                        tx.type === 'revenue' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {tx.type === 'revenue' ? '+' : '-'} {formatPHP(tx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Showing latest {recentTransactions.length} transaction entries</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('revenue')}
              className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
            >
              Full Revenue Ledger
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('expenses')}
              className="text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
            >
              Full Expenses Ledger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
