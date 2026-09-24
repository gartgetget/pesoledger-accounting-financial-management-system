import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowDownRight,
  Download,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Filter,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { Expense } from '../../types';
import { formatPHP } from '../../utils/currency';
import { formatDateDisplay, isDateInRange } from '../../utils/date';
import { exportToExcel, exportToCSV } from '../../utils/excel';

interface ExpensesViewProps {
  onOpenExpenseModal: () => void;
  onEditExpense: (exp: Expense) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  onOpenExpenseModal,
  onEditExpense,
}) => {
  const {
    expenses,
    expenseCategories,
    paymentMethods,
    dateRange,
    voidExpense,
    userRole,
  } = useAccounting();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [includeVoid, setIncludeVoid] = useState(false);

  const filteredList = useMemo(() => {
    return expenses.filter((e) => {
      if (!includeVoid && e.isVoid) return false;
      if (!isDateInRange(e.date, dateRange)) return false;
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false;
      if (paymentFilter !== 'ALL' && e.paymentMethodId !== paymentFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchDesc = e.description.toLowerCase().includes(q);
        const matchRef = (e.referenceNumber || '').toLowerCase().includes(q);
        const matchVendor = (e.vendorSupplier || '').toLowerCase().includes(q);
        const matchEmp = (e.employeeName || '').toLowerCase().includes(q);
        if (!matchDesc && !matchRef && !matchVendor && !matchEmp) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });
  }, [expenses, includeVoid, dateRange, categoryFilter, paymentFilter, searchTerm, sortBy]);

  const totalFilteredAmount = useMemo(() => {
    return filteredList.filter((e) => !e.isVoid).reduce((s, e) => s + e.amount, 0);
  }, [filteredList]);

  const getMethodName = (pmId: string) => {
    const found = paymentMethods.find((p) => p.id === pmId);
    return found ? found.name : pmId;
  };

  const handleExportExcel = () => {
    const exportData = filteredList.map((e) => ({
      'Date': e.date,
      'Category': e.category,
      'Description / Particulars': e.description,
      'Amount (PHP)': e.amount,
      'Payment Method': getMethodName(e.paymentMethodId),
      'Vendor / Supplier': e.vendorSupplier || '',
      'Person Responsible': e.employeeName || '',
      'Ref / OR Number': e.referenceNumber || '',
      'Status': e.isVoid ? `VOIDED: ${e.voidReason}` : 'ACTIVE',
      'Notes': e.notes || '',
    }));
    exportToExcel([{ sheetName: 'Business Expenses', data: exportData }], `Expenses_Ledger_${dateRange.startDate}_${dateRange.endDate}`);
  };

  const handleExportCSV = () => {
    const exportData = filteredList.map((e) => ({
      Date: e.date,
      Category: e.category,
      Description: e.description,
      Amount: e.amount,
      PaymentMethod: getMethodName(e.paymentMethodId),
      Vendor: e.vendorSupplier || '',
      Reference: e.referenceNumber || '',
      Status: e.isVoid ? 'VOIDED' : 'VALID',
    }));
    exportToCSV(exportData, `Expenses_Report_${dateRange.startDate}`);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <ArrowDownRight className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Expenses & Outflow Ledger</h1>
            <p className="text-xs text-slate-500">
              Period: {formatDateDisplay(dateRange.startDate)} – {formatDateDisplay(dateRange.endDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right px-4 py-2 bg-rose-50 rounded-lg border border-rose-200">
            <span className="text-[10px] uppercase font-bold text-rose-700 tracking-wider block">Total Filtered Outflow</span>
            <span className="text-base font-bold font-mono text-rose-800 tabular-nums">
              {formatPHP(totalFilteredAmount)}
            </span>
          </div>

          <button
            onClick={onOpenExpenseModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>+ Record Expense</span>
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search description, supplier, OR #..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden bg-white text-slate-700"
            >
              <option value="ALL">All Expense Categories</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

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
                className="rounded text-rose-600 focus:ring-0"
              />
              <span>Show Voided Expenses</span>
            </label>
            <span className="text-slate-400">·</span>
            <span>Showing <strong>{filteredList.length}</strong> items</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg font-medium cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-rose-600" />
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

      {/* EXPENSES TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Particulars / Description</th>
                <th className="py-3 px-4">Vendor / Supplier</th>
                <th className="py-3 px-4">Person Responsible</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">OR / Ref #</th>
                <th className="py-3 px-4 text-right">Amount (₱)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No expense records found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredList.map((e) => (
                  <tr
                    key={e.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      e.isVoid ? 'opacity-40 line-through bg-slate-50/60' : ''
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                      {formatDateDisplay(e.date)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{e.category}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 max-w-xs truncate" title={e.description}>
                      {e.description}
                    </td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[160px]" title={e.vendorSupplier}>
                      {e.vendorSupplier || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {e.employeeName || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {getMethodName(e.paymentMethodId)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {e.referenceNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap text-rose-700 text-sm">
                      {formatPHP(e.amount)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEditExpense(e)}
                          disabled={e.isVoid}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Edit expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {userRole === 'admin' && (
                          <button
                            onClick={() => voidExpense(e.id)}
                            disabled={e.isVoid}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                            title="Delete expense"
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
