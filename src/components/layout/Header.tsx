import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Wrench,
  Search,
  Filter,
  Menu,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { DateRangePreset } from '../../utils/date';

interface HeaderProps {
  onOpenRevenueModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenJobModal: () => void;
  onToggleNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenRevenueModal,
  onOpenExpenseModal,
  onOpenJobModal,
  onToggleNav,
}) => {
  const {
    activeTab,
    dateFilterPreset,
    setDateFilterPreset,
    dateRange,
    setCustomDateRange,
  } = useAccounting();

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [startInput, setStartInput] = useState(dateRange.startDate);
  const [endInput, setEndInput] = useState(dateRange.endDate);

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Executive Financial Dashboard';
      case 'revenue':
        return 'Revenue & Collections Ledger';
      case 'daily':
        return 'Daily Accounting & Expenses';
      case 'expenses':
        return 'Comprehensive Expenses Ledger';
      case 'jobs':
        return 'Service Orders & Job Ticketing';
      case 'payroll':
        return 'Employee Payroll & Compensation';
      case 'vehicles':
        return 'Fleet & Vehicle Expenses (Sasakyan)';
      case 'inventory':
        return 'Parts & Inventory Management (OW Parts)';
      case 'customers':
        return 'Client & Customer Records';
      case 'reports':
        return 'Financial Reports & Profit & Loss';
      case 'monthly':
        return 'Monthly Accounting Performance';
      case 'yearly':
        return '12-Month Annual Accounting Matrix';
      case 'migration':
        return 'Excel Workbook Migration & Backup';
      case 'settings':
        return 'System Configuration';
      default:
        return 'Accounting Portal';
    }
  };

  const presets: { id: DateRangePreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'this_year', label: 'This Year' },
    { id: 'all', label: 'All Time' },
  ];

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (startInput && endInput) {
      setCustomDateRange({ startDate: startInput, endDate: endInput });
      setShowCustomModal(false);
    }
  };

  return (
    <header className="relative min-h-16 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3 sticky top-0 z-20">
      {/* Mobile: hamburger menu trigger */}
      <button
        onClick={onToggleNav}
        className="lg:hidden shrink-0 p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
        aria-label="Open navigation menu"
        title="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Zone 1: Breadcrumb Trail */}
      <div className="min-w-0 flex-1 items-center gap-2 hidden sm:flex">
        <span className="shrink-0 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Ledger
        </span>
        <span className="shrink-0 text-slate-300">/</span>
        <h2 className="min-w-0 truncate text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
          {getBreadcrumbTitle()}
        </h2>
      </div>

      {/* Zone 2: Date Filter Controls */}
      <div className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs">
        {presets.map((p) => {
          const isSelected = dateFilterPreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setDateFilterPreset(p.id)}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          onClick={() => setShowCustomModal(true)}
          className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
            dateFilterPreset === 'custom'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{dateFilterPreset === 'custom' ? `${dateRange.startDate} - ${dateRange.endDate}` : 'Custom'}</span>
        </button>
      </div>

      {/* Zone 3: Quick Action Buttons */}
      <div className="shrink-0 flex items-center gap-2">
        {/* Mobile / tablet date filter dropdown (below lg) */}
        <div className="relative lg:hidden">
          <button
            onClick={() => setShowPresetMenu((open) => !open)}
            className="flex items-center gap-1.5 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            aria-label="Date range filter"
            title="Date range filter"
            aria-expanded={showPresetMenu}
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-medium">
              {dateFilterPreset === 'custom'
                ? `${dateRange.startDate} - ${dateRange.endDate}`
                : presets.find((p) => p.id === dateFilterPreset)?.label || 'Filter'}
            </span>
          </button>
          {showPresetMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPresetMenu(false)} aria-hidden="true" />
              <div className="absolute right-0 top-full mt-1 z-30 w-48 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                {presets.map((p) => {
                  const isSelected = dateFilterPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setDateFilterPreset(p.id);
                        setShowPresetMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    setShowPresetMenu(false);
                    setShowCustomModal(true);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium border-t border-slate-100 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    dateFilterPreset === 'custom' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Custom range…
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onOpenRevenueModal}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          title="Record incoming payment or collection"
          aria-label="Record revenue"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">+ Revenue</span>
        </button>

        <button
          onClick={onOpenExpenseModal}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          title="Record business expense"
          aria-label="Record expense"
        >
          <ArrowDownRight className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">+ Expense</span>
        </button>

        <button
          onClick={onOpenJobModal}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          title="Create a new service job order"
          aria-label="Create job"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">+ Job</span>
        </button>
      </div>

      {/* Custom Date Range Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 my-auto animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Select Custom Accounting Period
            </h3>
            <form onSubmit={handleApplyCustom} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Apply Date Range
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
