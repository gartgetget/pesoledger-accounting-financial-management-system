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
  MapPin,
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
  isDateInRange,
} from '../../utils/date';
import {
  RevenueExpensesBarChart,
  CategoryHorizontalBars,
  PaymentMethodDistribution,
} from './Charts';

const groupAmounts = <T,>(
  items: T[],
  getName: (item: T) => string,
  getAmount: (item: T) => number
) => {
  const totals = new Map<string, { name: string; amount: number }>();
  items.forEach((item) => {
    const name = getName(item).trim() || 'Other';
    const key = name.toLocaleLowerCase();
    const current = totals.get(key);
    totals.set(key, { name: current?.name || name, amount: (current?.amount || 0) + getAmount(item) });
  });
  return Array.from(totals.values())
    .sort((a, b) => b.amount - a.amount);
};

export const DashboardView: React.FC<{
  onOpenRevenueModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenJobModal: () => void;
  onOpenAreaProfitability: () => void;
}> = ({ onOpenRevenueModal, onOpenExpenseModal, onOpenJobModal, onOpenAreaProfitability }) => {
  const {
    revenueTransactions,
    expenses,
    paymentMethods,
    companySettings,
    financialSummary,
    getSummaryForRange,
    getYearlyMatrix,
    dateRange,
    dateFilterPreset,
    setActiveTab,
    serviceJobs,
    vehicleExpenses,
    areas,
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

  // 2b. Service Jobs panel data (range-filtered)
  const jobsPanel = useMemo(() => {
    const inRange = serviceJobs.filter((j) => isDateInRange(j.date, dateRange));
    const completed = inRange.filter((j) => j.status === 'completed');
    const inProgress = inRange.filter((j) => j.status === 'open' || j.status === 'in_progress');
    const jobCollections = inRange.reduce((s, j) => s + (j.amountPaid || 0), 0);
    const recentJobs = [...inRange]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
    return {
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      jobCollections,
      recentJobs,
    };
  }, [serviceJobs, dateRange]);

  // 2c. Vehicle Expenses panel data (range-filtered)
  const vehiclePanel = useMemo(() => {
    const inRange = vehicleExpenses.filter((v) => isDateInRange(v.date, dateRange));
    const vehicleTotal = inRange.reduce((s, v) => s + (v.amount || 0), 0);
    const fuelTotal = inRange
      .filter((v) => v.expenseType === 'Fuel/Gas')
      .reduce((s, v) => s + (v.amount || 0), 0);
    const maintenanceTotal = vehicleTotal - fuelTotal;

    const byVehicle: Record<string, number> = {};
    inRange.forEach((v) => {
      const key = v.vehicleName || 'Unassigned';
      byVehicle[key] = (byVehicle[key] || 0) + (v.amount || 0);
    });
    const topVehicle = Object.entries(byVehicle).sort((a, b) => b[1] - a[1])[0];

    const recent = [...inRange]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    return {
      vehicleTotal,
      fuelTotal,
      maintenanceTotal,
      topVehicleName: topVehicle ? topVehicle[0] : '',
      topVehicleAmount: topVehicle ? topVehicle[1] : 0,
      recent,
    };
  }, [vehicleExpenses, dateRange]);

  // 2d. Collections by Area panel data (range-filtered)
  const areaPanel = useMemo(() => {
    const periodRevenue = revenueTransactions.filter((r) => !r.isVoid && isDateInRange(r.date, dateRange));
    const periodExpenses = expenses.filter(
      (e) => !e.isVoid && isDateInRange(e.date, dateRange) && e.relatedModule !== 'salary'
    );

    const names = Array.from(
      new Set([
        ...areas.map((a) => a.name),
        ...periodRevenue.map((r) => r.area || 'Unassigned'),
        ...periodExpenses.map((e) => e.area || 'Unassigned'),
      ])
    );
    const rows = names
      .map((row) => ({
        name: row,
        collectionCategories: groupAmounts(
          periodRevenue.filter((revenue) => (revenue.area || 'Unassigned') === row),
          (revenue) => revenue.serviceType || revenue.category || 'Other Collections',
          (revenue) => revenue.amount || 0
        ),
        expenseCategories: groupAmounts(
          periodExpenses.filter((expense) => (expense.area || 'Unassigned') === row),
          (expense) => expense.category || 'Other Expenses',
          (expense) => expense.amount || 0
        ),
      }))
      .map((row) => ({
        ...row,
        collections: row.collectionCategories.reduce((sum, category) => sum + category.amount, 0),
        expenses: row.expenseCategories.reduce((sum, category) => sum + category.amount, 0),
      }))
      .sort((a, b) => b.collections - a.collections || b.expenses - a.expenses);

    return {
      rows,
      totalCollections: rows.reduce((s, r) => s + r.collections, 0),
      totalExpenses: rows.reduce((s, r) => s + r.expenses, 0),
    };
  }, [revenueTransactions, expenses, dateRange, areas]);
  const featuredArea = areaPanel.rows[0];

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3">
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
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Referral Expense</span>
          <p className="text-sm font-bold text-rose-700 font-mono tabular-nums mt-1">
            {formatPHP(financialSummary.referralExpense)}
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
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Sasakyan</span>
          <p className="text-sm font-bold text-sky-700 font-mono tabular-nums mt-1">
            {formatPHP(financialSummary.sasakyanExpense)}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Other Expenses</span>
          <p className="text-sm font-bold text-slate-700 font-mono tabular-nums mt-1">
            {formatPHP(financialSummary.otherExpenses)}
          </p>
        </div>
      </div>

      {/* SERVICE JOBS, VEHICLE EXPENSES & AREA PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-5">
        {/* Service Job Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Service Job Orders</h3>
                <p className="text-xs text-slate-500">Collections recorded for jobs in period</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('jobs')}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="min-w-0 bg-emerald-50 border border-emerald-100 rounded-lg p-2 sm:p-3">
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">Completed</span>
              <p className="text-base xl:text-lg font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
                {jobsPanel.completedCount}
              </p>
            </div>
            <div className="min-w-0 bg-amber-50 border border-amber-100 rounded-lg p-2 sm:p-3">
              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">In Progress</span>
              <p className="text-base xl:text-lg font-bold text-amber-700 font-mono tabular-nums mt-0.5">
                {jobsPanel.inProgressCount}
              </p>
            </div>
            <div className="min-w-0 bg-indigo-50 border border-indigo-100 rounded-lg p-2 sm:p-3">
              <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block">Collections</span>
              <p className="whitespace-nowrap text-xs 2xl:text-sm font-bold text-indigo-700 font-mono tabular-nums mt-0.5">
                {formatPHP(jobsPanel.jobCollections)}
              </p>
            </div>
          </div>

          {jobsPanel.recentJobs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              No job orders in this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2 pr-3">Job #</th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 text-right">Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {jobsPanel.recentJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50/70">
                      <td className="py-2 pr-3 font-semibold text-slate-700 whitespace-nowrap">{j.jobNumber}</td>
                      <td className="py-2 pr-3 text-slate-600 truncate max-w-[120px]">{j.customerName || 'Walk-in'}</td>
                      <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{formatDateDisplay(j.date)}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                        {formatPHP(j.amountPaid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vehicle Expenses */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                <Fuel className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Vehicle Expenses</h3>
                <p className="text-xs text-slate-500">Fuel, maintenance, toll & repairs in period</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('vehicles')}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-orange-600 hover:text-orange-800 font-medium cursor-pointer"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="min-w-0 bg-orange-50 border border-orange-100 rounded-lg p-2 sm:p-3">
              <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider block">Total</span>
              <p className="whitespace-nowrap text-xs 2xl:text-sm font-bold text-orange-700 font-mono tabular-nums mt-0.5">
                {formatPHP(vehiclePanel.vehicleTotal)}
              </p>
            </div>
            <div className="min-w-0 bg-amber-50 border border-amber-100 rounded-lg p-2 sm:p-3">
              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">Fuel & Gas</span>
              <p className="whitespace-nowrap text-xs 2xl:text-sm font-bold text-amber-700 font-mono tabular-nums mt-0.5">
                {formatPHP(vehiclePanel.fuelTotal)}
              </p>
            </div>
            <div className="min-w-0 bg-sky-50 border border-sky-100 rounded-lg p-2 sm:p-3">
              <span className="text-[10px] font-semibold text-sky-600 uppercase tracking-wider block">Maintenance & Other</span>
              <p className="whitespace-nowrap text-xs 2xl:text-sm font-bold text-sky-700 font-mono tabular-nums mt-0.5">
                {formatPHP(vehiclePanel.maintenanceTotal)}
              </p>
            </div>
          </div>

          {vehiclePanel.topVehicleName && (
            <p className="text-xs text-slate-500 mb-3">
              Top spending:{' '}
              <span className="font-semibold text-slate-700">{vehiclePanel.topVehicleName}</span>{' '}
              <span className="font-mono text-slate-600">({formatPHP(vehiclePanel.topVehicleAmount)})</span>
            </p>
          )}

          {vehiclePanel.recent.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              No vehicle expenses logged in this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Vehicle</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {vehiclePanel.recent.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70">
                      <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{formatDateDisplay(v.date)}</td>
                      <td className="py-2 pr-3 text-slate-600 truncate max-w-[120px]">{v.vehicleName}</td>
                      <td className="py-2 pr-3">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {v.expenseType}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-orange-700 font-semibold">
                        {formatPHP(v.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Area profitability summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs lg:col-span-2">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Area Profit & Loss Statement</h3>
                <p className="text-xs text-slate-500">
                  {areaPanel.rows.length > 0
                    ? `Showing top area by collections · 1 of ${areaPanel.rows.length} areas`
                    : 'Category totals for collections and expenses by area'}
                </p>
              </div>
            </div>
            <button
              onClick={onOpenAreaProfitability}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-violet-600 hover:text-violet-800 font-medium cursor-pointer"
            >
              Full statement <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {!featuredArea ? (
            <p className="text-xs text-slate-400 text-center py-4">
              No areas or collections in this period yet.
            </p>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
              <div className="border-b border-slate-200 pb-3 text-center">
                <h4 className="text-sm font-bold uppercase tracking-tight text-slate-900">
                  {companySettings.name}
                </h4>
                {(companySettings.address || companySettings.tin) && (
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {[companySettings.address, companySettings.tin ? `TIN: ${companySettings.tin}` : ''].filter(Boolean).join(' · ')}
                  </p>
                )}
                <h5 className="mt-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-800">
                  Statement of Profit and Loss
                </h5>
                <p className="font-mono text-[10px] text-slate-500">
                  For the Period: {formatDateDisplay(dateRange.startDate)} to {formatDateDisplay(dateRange.endDate)}
                </p>
                <p className="mt-0.5 text-[9px] text-slate-400">(All amounts stated in Philippine Peso ₱)</p>
              </div>

              <div className="space-y-5 font-mono text-[11px]">
                <section>
                      <div className="flex justify-between border-b border-slate-300 py-1.5 font-bold text-slate-900">
                        <span className="uppercase">I. {featuredArea.name}</span>
                      </div>

                      <div className="space-y-3 py-2 pl-3">
                        <div>
                          <div className="flex justify-between gap-3 py-0.5 text-slate-700">
                            <span>Collections by Service</span>
                            <span className="whitespace-nowrap tabular-nums">{formatPHP(featuredArea.collections)}</span>
                          </div>
                          {featuredArea.collectionCategories.length > 0 && (
                            <div className="mt-1 space-y-0.5 pl-3 text-[10px] text-slate-500">
                              {featuredArea.collectionCategories.map((category) => (
                                <div key={category.name} className="flex justify-between gap-3">
                                  <span className="min-w-0 break-words">{category.name}</span>
                                  <span className="shrink-0 whitespace-nowrap tabular-nums">{formatPHP(category.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between gap-3 py-0.5 text-slate-700">
                            <span>Expenses by Category</span>
                            <span className="whitespace-nowrap tabular-nums text-rose-700">{formatPHP(featuredArea.expenses)}</span>
                          </div>
                          {featuredArea.expenseCategories.length > 0 && (
                            <div className="mt-1 space-y-0.5 pl-3 text-[10px] text-slate-500">
                              {featuredArea.expenseCategories.map((category) => (
                                <div key={category.name} className="flex justify-between gap-3">
                                  <span className="min-w-0 break-words">{category.name}</span>
                                  <span className="shrink-0 whitespace-nowrap tabular-nums text-rose-600">{formatPHP(category.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between border-t border-slate-200 bg-slate-50 px-2 py-1.5 font-bold text-slate-900">
                        <span>NET — {featuredArea.name}</span>
                        <span className={`whitespace-nowrap tabular-nums ${featuredArea.collections - featuredArea.expenses >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                          {formatPHP(featuredArea.collections - featuredArea.expenses)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between rounded bg-slate-900 px-3 py-2 text-white">
                        <div>
                          <span className="block font-sans text-[10px] font-bold uppercase tracking-wide">Net Income / Profit</span>
                          <span className="font-sans text-[9px] text-slate-400">
                            Net Profit Margin: {featuredArea.collections > 0
                              ? (((featuredArea.collections - featuredArea.expenses) / featuredArea.collections) * 100).toFixed(1)
                              : '0'}%
                          </span>
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${
                          featuredArea.collections - featuredArea.expenses >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {formatPHP(featuredArea.collections - featuredArea.expenses)}
                        </span>
                      </div>
                </section>
              </div>
            </div>
          )}
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
