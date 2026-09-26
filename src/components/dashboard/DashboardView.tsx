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
    const jobCollections = completed.reduce((s, j) => s + (j.amountPaid || 0), 0);
    const recentCompleted = [...completed]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
    return {
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      jobCollections,
      recentCompleted,
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
    const revByArea: Record<string, number> = {};
    revenueTransactions
      .filter((r) => !r.isVoid && isDateInRange(r.date, dateRange))
      .forEach((r) => {
        const key = r.area || 'Unassigned';
        revByArea[key] = (revByArea[key] || 0) + (r.amount || 0);
      });

    const costByArea: Record<string, number> = {};
    serviceJobs
      .filter((j) => isDateInRange(j.date, dateRange))
      .forEach((j) => {
        const key = j.area || 'Unassigned';
        costByArea[key] = (costByArea[key] || 0) + (j.partsCostAmount || 0);
      });
    expenses
      .filter((e) => !e.isVoid && isDateInRange(e.date, dateRange) && e.relatedModule !== 'salary')
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
        jobCosts: costByArea[name] || 0,
      }))
      .sort((a, b) => b.collections - a.collections || b.jobCosts - a.jobCosts);

    return {
      rows,
      totalCollections: rows.reduce((s, r) => s + r.collections, 0),
      totalJobCosts: rows.reduce((s, r) => s + r.jobCosts, 0),
    };
  }, [revenueTransactions, serviceJobs, expenses, dateRange, areas]);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Job Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Service Job Orders</h3>
                <p className="text-xs text-slate-500">Collections from completed jobs in period</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('jobs')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              View all →
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">Completed</span>
              <p className="text-lg font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
                {jobsPanel.completedCount}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">In Progress</span>
              <p className="text-lg font-bold text-amber-700 font-mono tabular-nums mt-0.5">
                {jobsPanel.inProgressCount}
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
              <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block">Collections</span>
              <p className="text-lg font-bold text-indigo-700 font-mono tabular-nums mt-0.5">
                {formatPHP(jobsPanel.jobCollections)}
              </p>
            </div>
          </div>

          {jobsPanel.recentCompleted.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              No completed job orders in this period.
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
                  {jobsPanel.recentCompleted.map((j) => (
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                <Fuel className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Vehicle Expenses</h3>
                <p className="text-xs text-slate-500">Fuel, maintenance, toll & repairs in period</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('vehicles')}
              className="text-xs text-orange-600 hover:text-orange-800 font-medium cursor-pointer"
            >
              View all →
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
              <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider block">Total</span>
              <p className="text-lg font-bold text-orange-700 font-mono tabular-nums mt-0.5">
                {formatPHP(vehiclePanel.vehicleTotal)}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">Fuel & Gas</span>
              <p className="text-lg font-bold text-amber-700 font-mono tabular-nums mt-0.5">
                {formatPHP(vehiclePanel.fuelTotal)}
              </p>
            </div>
            <div className="bg-sky-50 border border-sky-100 rounded-lg p-3">
              <span className="text-[10px] font-semibold text-sky-600 uppercase tracking-wider block">Maintenance & Other</span>
              <p className="text-lg font-bold text-sky-700 font-mono tabular-nums mt-0.5">
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

        {/* Collections by Area */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Collections by Area</h3>
                <p className="text-xs text-slate-500">Collections vs job & tagged expense costs per area in period</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('revenue')}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-medium cursor-pointer"
            >
              View all →
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">Collections</span>
              <p className="text-lg font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
                {formatPHP(areaPanel.totalCollections)}
              </p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
              <span className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider block">Costs</span>
              <p className="text-lg font-bold text-rose-700 font-mono tabular-nums mt-0.5">
                {formatPHP(areaPanel.totalJobCosts)}
              </p>
            </div>
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-3">
              <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block">Net</span>
              <p className="text-lg font-bold text-slate-800 font-mono tabular-nums mt-0.5">
                {formatPHP(areaPanel.totalCollections - areaPanel.totalJobCosts)}
              </p>
            </div>
          </div>

          {areaPanel.rows.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              No areas or collections in this period yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2 pr-3">Area</th>
                    <th className="py-2 pr-3 text-right">Collections</th>
                    <th className="py-2 pr-3 text-right">Costs</th>
                    <th className="py-2 text-right">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {areaPanel.rows.map((row) => (
                    <tr key={row.name} className="hover:bg-slate-50/70">
                      <td className="py-2 pr-3 font-semibold text-slate-700 whitespace-nowrap">{row.name}</td>
                      <td className="py-2 pr-3 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                        {formatPHP(row.collections)}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono tabular-nums text-rose-600">
                        {formatPHP(row.jobCosts)}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums font-semibold text-slate-800">
                        {formatPHP(row.collections - row.jobCosts)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-semibold">
                    <td className="py-2 pr-3 text-slate-600 uppercase text-[10px] tracking-wider">Total</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-emerald-700">
                      {formatPHP(areaPanel.totalCollections)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-rose-600">
                      {formatPHP(areaPanel.totalJobCosts)}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-slate-800">
                      {formatPHP(areaPanel.totalCollections - areaPanel.totalJobCosts)}
                    </td>
                  </tr>
                </tfoot>
              </table>
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
