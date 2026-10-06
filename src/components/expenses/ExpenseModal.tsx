import React, { useState } from 'react';
import { X, ArrowDownRight } from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP, parseNumber } from '../../utils/currency';
import { getTodayDateString } from '../../utils/date';
import { Expense } from '../../types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: Expense | null;
  defaultCategory?: string;
}

interface ExpenseLine {
  category: string;
  amount: string;
  paymentMethodId: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  editItem,
  defaultCategory,
}) => {
  const {
    expenseCategories,
    paymentMethods,
    employees,
    areas,
    addExpensesBatch,
    updateExpense,
  } = useAccounting();

  const [date, setDate] = useState(editItem ? editItem.date : getTodayDateString());
  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>(() => {
    const firstCategory = editItem?.category || defaultCategory || expenseCategories[0]?.name || '';
    const secondCategory = expenseCategories.find((category) => category.name !== firstCategory)?.name || firstCategory;
    const defaultPaymentMethod = editItem?.paymentMethodId || paymentMethods[0]?.id || '';
    return [
      {
        category: firstCategory,
        amount: editItem ? String(editItem.amount) : '',
        paymentMethodId: defaultPaymentMethod,
      },
      {
        category: secondCategory,
        amount: '',
        paymentMethodId: paymentMethods[0]?.id || '',
      },
    ];
  });
  const [description, setDescription] = useState(editItem ? editItem.description : '');
  const [vendorSupplier, setVendorSupplier] = useState(editItem ? editItem.vendorSupplier || '' : '');
  const [area, setArea] = useState(editItem ? editItem.area || '' : '');
  const [employeeId, setEmployeeId] = useState(editItem ? editItem.employeeId || '' : '');
  const [referenceNumber, setReferenceNumber] = useState(
    editItem ? editItem.referenceNumber || '' : ''
  );
  const [notes, setNotes] = useState(editItem ? editItem.notes || '' : '');

  if (!isOpen) return null;

  const updateExpenseLine = (index: number, updates: Partial<ExpenseLine>) => {
    setExpenseLines((current) =>
      current.map((line, lineIndex) => lineIndex === index ? { ...line, ...updates } : line)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLines = expenseLines.slice(0, editItem ? 1 : 2).map((line) => ({
      ...line,
      parsedAmount: parseNumber(line.amount),
    }));
    if (!date || parsedLines.some((line) => !line.category || line.parsedAmount <= 0 || !line.paymentMethodId)) {
      alert(editItem
        ? 'Please fill in the expense category, amount, and payment method.'
        : 'Please fill in both expense categories, amounts, and payment methods.');
      return;
    }

    const assignedEmp = employees.find((emp) => emp.id === employeeId);

    try {
      if (editItem) {
        const line = parsedLines[0];
        await updateExpense(editItem.id, {
          date,
          category: line.category.toUpperCase(),
          description: description.trim() || `${line.category} Expense`,
          amount: line.parsedAmount,
          paymentMethodId: line.paymentMethodId,
          area,
          vendorSupplier: vendorSupplier.trim(),
          employeeId: assignedEmp?.id,
          employeeName: assignedEmp?.name,
          referenceNumber: referenceNumber.trim(),
          notes: notes.trim(),
          relatedModule: 'general',
        });
      } else {
        await addExpensesBatch(parsedLines.map((line) => ({
          date,
          category: line.category.toUpperCase(),
          description: description.trim() || `${line.category} Expense`,
          amount: line.parsedAmount,
          paymentMethodId: line.paymentMethodId,
          area,
          vendorSupplier: vendorSupplier.trim(),
          employeeId: assignedEmp?.id,
          employeeName: assignedEmp?.name,
          referenceNumber: referenceNumber.trim(),
          notes: notes.trim(),
          relatedModule: 'general' as const,
        })));
      }
      onClose();
    } catch {
      // The accounting context reports the failed save; keep the form open for correction/retry.
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editItem ? 'Edit Expense Record' : 'Record Business Expense'}
            </h2>
            <p className="text-xs text-slate-500">Record cash or bank outflow for operational expenditures</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            {expenseLines.slice(0, editItem ? 1 : 2).map((line, index) => (
              <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="mb-2 text-xs font-bold text-slate-800">Expense {index + 1}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Expense Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={line.category}
                      onChange={(e) => updateExpenseLine(index, { category: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-hidden bg-white"
                      required
                    >
                      <option value="">Select category</option>
                      {expenseCategories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Amount (₱ PHP) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={line.amount}
                      onChange={(e) => updateExpenseLine(index, { amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-hidden font-mono text-rose-700 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Method <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={line.paymentMethodId}
                      onChange={(e) => updateExpenseLine(index, { paymentMethodId: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-hidden bg-white"
                      required
                    >
                      <option value="">Select payment method</option>
                      {paymentMethods.map((method) => (
                        <option key={method.id} value={method.id}>{method.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Name / Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Diesel fuel refill for Hiace van NDB-4821"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Area
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-hidden bg-white"
            >
              <option value="">-- None / Unassigned --</option>
              {areas.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vendor / Supplier / Store
              </label>
              <input
                type="text"
                value={vendorSupplier}
                onChange={(e) => setVendorSupplier(e.target.value)}
                placeholder="e.g. Shell El Grande / Quiapo Electro Mart"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employee / Person Responsible
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-hidden bg-white"
              >
                <option value="">-- General / Operational --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Receipt / Reference #
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. OR-89102 or Invoice #"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Remarks / Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid out of Petty cash"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {editItem ? 'Save Changes' : 'Record Expense (₱)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
