import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { RevenueTransaction } from '../../types';
import { formatPHP } from '../../utils/currency';
import { formatDateDisplay, isDateInRange } from '../../utils/date';
import { exportToExcel, exportToCSV } from '../../utils/excel';

interface RevenueViewProps {
  onOpenRevenueModal: () => void;
  onEditRevenue: (tx: RevenueTransaction) => void;
}

export const RevenueView: React.FC<RevenueViewProps> = ({
  onOpenRevenueModal,
  onEditRevenue,
}) => {
  const {
    revenueTransactions,
    revenueCategories,
    paymentMethods,
    employees,
    areas,
    dateRange,
    voidRevenueTransaction,
    userRole,
  } = useAccounting();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [includeVoid, setIncludeVoid] = useState(false);

  // Filtered and sorted transactions
  const filteredList = useMemo(() => {
    return revenueTransactions.filter((tx) => {
      if (!includeVoid && tx.isVoid) return false;
      if (!isDateInRange(tx.date, dateRange)) return false;
      if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) return false;
      if (paymentFilter !== 'ALL' && tx.paymentMethodId !== paymentFilter) return false;
      if (areaFilter !== 'ALL') {
        const wanted = areaFilter === 'UNASSIGNED' ? '' : areaFilter;
        if ((tx.area || '') !== wanted) return false;
      }
      if (employeeFilter !== 'ALL' && tx.employeeId !== employeeFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchInvoice = tx.invoiceNumber.toLowerCase().includes(q);
        const matchCustomer = tx.customerName.toLowerCase().includes(q);
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchNotes = (tx.notes || '').toLowerCase().includes(q);
        if (!matchInvoice && !matchCustomer && !matchDesc && !matchNotes) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });
  }, [
    revenueTransactions,
    includeVoid,
    dateRange,
    categoryFilter,
    paymentFilter,
    areaFilter,
    employeeFilter,
    searchTerm,
    sortBy,
  ]);

  const totalFilteredAmount = useMemo(() => {
    return filteredList.filter((t) => !t.isVoid).reduce((s, t) => s + t.amount, 0);
  }, [filteredList]);

  const getMethodName = (pmId: string) => {
    const found = paymentMethods.find((p) => p.id === pmId);
    return found ? found.name : pmId;
  };

  const handleExportExcel = () => {
    const exportData = filteredList.map((tx) => ({
      'Date': tx.date,
      'Invoice #': tx.invoiceNumber,
      'Customer Name': tx.customerName,
      'Category': tx.category,
      'Description': tx.description,
      'Payment Method': getMethodName(tx.paymentMethodId),
      'Assigned Employee': tx.employeeName || 'Counter',
      'Gross Amount': tx.originalAmount || tx.amount,
      'Discount': tx.discount || 0,
      'Net Amount (PHP)': tx.amount,
      'Status': tx.isVoid ? `VOIDED: ${tx.voidReason}` : 'ACTIVE',
      'Notes': tx.notes || '',
    }));
    exportToExcel([{ sheetName: 'Revenue Collections', data: exportData }], `Revenue_Ledger_${dateRange.startDate}_${dateRange.endDate}`);
  };

  const handleExportCSV = () => {
    const exportData = filteredList.map((tx) => ({
      Date: tx.date,
      Invoice: tx.invoiceNumber,
      Customer: tx.customerName,
      Category: tx.category,
      Description: tx.description,
      PaymentMethod: getMethodName(tx.paymentMethodId),
      Technician: tx.employeeName || 'Counter',
      Amount: tx.amount,
      Status: tx.isVoid ? 'VOIDED' : 'VALID',
    }));
    exportToCSV(exportData, `Revenue_Report_${dateRange.startDate}`);
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Summary Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Revenue & Collections Ledger</h1>
              <p className="text-xs text-slate-500">
                Period: {formatDateDisplay(dateRange.startDate)} – {formatDateDisplay(dateRange.endDate)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-right px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">Total Filtered Inflow</span>
            <span className="text-base font-bold font-mono text-emerald-800 tabular-nums">
              {formatPHP(totalFilteredAmount)}
            </span>
          </div>

          <button
            onClick={onOpenRevenueModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ Record Collection</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR & SEARCH (Core Objective 18 & 19) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
          {/* Search Input */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice #, customer name, notes..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden bg-white text-slate-700"
            >
              <option value="ALL">All Service Categories</option>
              {revenueCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Area Filter */}
          <div>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden bg-white text-slate-700"
            >
              <option value="ALL">All Areas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
              <option value="UNASSIGNED">Unassigned</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden bg-white text-slate-700"
            >
              <option value="ALL">All Payment Methods</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden bg-white text-slate-700"
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="amount-desc">Amount (Highest First)</option>
              <option value="amount-asc">Amount (Lowest First)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeVoid}
                onChange={(e) => setIncludeVoid(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-0"
              />
              <span>Show Voided Transactions</span>
            </label>
            <span className="text-slate-400">·</span>
            <span>Found <strong>{filteredList.length}</strong> records</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg font-medium cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg font-medium cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* REVENUE DATA TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 hidden md:table-cell">Service Description</th>
                <th className="py-3 px-4 hidden md:table-cell">Payment Method</th>
                <th className="py-3 px-4 hidden md:table-cell">Technician</th>
                <th className="py-3 px-4 text-right">Amount (₱)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No revenue transactions found for this date range or filter.
                  </td>
                </tr>
              ) : (
                filteredList.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      tx.isVoid ? 'opacity-40 line-through bg-slate-50/60' : ''
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                      {formatDateDisplay(tx.date)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold text-slate-900">
                      {tx.invoiceNumber}
                      {tx.relatedId && (
                        <span
                          className="ml-1.5 inline-block px-1.5 py-0.5 text-[9px] font-sans font-bold uppercase rounded bg-indigo-100 text-indigo-700 align-middle"
                          title="Auto-created from a job order"
                        >
                          JOB
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium truncate max-w-[180px]" title={tx.customerName}>
                      {tx.customerName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-700">{tx.category}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 truncate max-w-[220px] hidden md:table-cell" title={tx.description}>
                      {tx.description}
                      {tx.discount > 0 && (
                        <span className="text-[10px] text-slate-400 ml-1">
                          (Less ₱{tx.discount})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 hidden md:table-cell">
                      {getMethodName(tx.paymentMethodId)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 hidden md:table-cell">
                      {tx.employeeName || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap text-emerald-700 text-sm">
                      {formatPHP(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEditRevenue(tx)}
                          disabled={tx.isVoid}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Edit transaction"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {userRole === 'admin' && (
                          <button
                            onClick={() => voidRevenueTransaction(tx.id)}
                            disabled={tx.isVoid}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
