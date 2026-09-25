import React, { useState } from 'react';
import { X, Calculator, Plus, UserPlus } from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP, parseNumber } from '../../utils/currency';
import { getTodayDateString } from '../../utils/date';
import { RevenueTransaction } from '../../types';

interface RevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: RevenueTransaction | null;
}

export const RevenueModal: React.FC<RevenueModalProps> = ({
  isOpen,
  onClose,
  editItem,
}) => {
  const {
    revenueCategories,
    paymentMethods,
    employees,
    customers,
    addRevenueTransaction,
    updateRevenueTransaction,
    addCustomer,
  } = useAccounting();

  const [date, setDate] = useState(editItem ? editItem.date : getTodayDateString());
  const [invoiceNumber, setInvoiceNumber] = useState(editItem ? editItem.invoiceNumber : '');
  const [customerName, setCustomerName] = useState(editItem ? editItem.customerName : '');
  const [serviceType, setServiceType] = useState(editItem ? editItem.serviceType : '');
  const [category, setCategory] = useState(
    editItem ? editItem.category : revenueCategories[0]?.name || 'REF/AC'
  );
  const [description, setDescription] = useState(editItem ? editItem.description : '');
  const [originalAmount, setOriginalAmount] = useState<string>(
    editItem ? String(editItem.originalAmount || editItem.amount) : ''
  );
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [discountVal, setDiscountVal] = useState<string>(
    editItem ? String(editItem.discount || 0) : '0'
  );
  const [paymentMethodId, setPaymentMethodId] = useState(
    editItem ? editItem.paymentMethodId : paymentMethods[0]?.id || 'pm-1'
  );
  const [employeeId, setEmployeeId] = useState(editItem ? editItem.employeeId || '' : '');
  const [notes, setNotes] = useState(editItem ? editItem.notes || '' : '');

  if (!isOpen) return null;

  // Real-time discount calculations
  const parsedOriginal = parseNumber(originalAmount);
  const parsedDiscVal = parseNumber(discountVal);

  let computedDiscount = 0;
  if (discountType === 'percentage') {
    computedDiscount = (parsedOriginal * parsedDiscVal) / 100;
  } else {
    computedDiscount = parsedDiscVal;
  }
  const finalAmount = Math.max(0, parsedOriginal - computedDiscount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !category || parsedOriginal <= 0 || !paymentMethodId) {
      alert('Please fill in all required fields (Date, Category, Amount, Payment Method).');
      return;
    }

    const assignedEmp = employees.find((emp) => emp.id === employeeId);

    // If new customer name, auto-save customer record
    if (customerName.trim() && !customers.some((c) => c.name.toLowerCase() === customerName.trim().toLowerCase())) {
      addCustomer({
        name: customerName.trim(),
        contact: '',
        address: 'Parañaque / Metro Manila',
      });
    }

    const payload = {
      date,
      invoiceNumber: invoiceNumber.trim(),
      customerName: customerName.trim() || 'Walk-in Customer',
      serviceType: serviceType.trim() || description.trim() || 'Appliance Service',
      category: category.toUpperCase(),
      description: description.trim() || serviceType.trim() || 'Appliance Service',
      originalAmount: parsedOriginal,
      discount: computedDiscount,
      amount: finalAmount,
      paymentMethodId,
      employeeId: assignedEmp?.id,
      employeeName: assignedEmp?.name,
      notes: notes.trim(),
    };

    if (editItem) {
      updateRevenueTransaction(editItem.id, payload);
    } else {
      addRevenueTransaction(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editItem ? 'Edit Revenue Transaction' : 'Record Revenue / Collection'}
            </h2>
            <p className="text-xs text-slate-500">Record payments from customer appliance repairs & services</p>
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
                Transaction Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice / OR Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Leave blank for auto INV-2026-XXXX"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                list="customers-list"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. San Antonio Residence"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
              <datalist id="customers-list">
                {customers.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Revenue Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden bg-white"
                required
              >
                {revenueCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Service Type & Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (!serviceType) setServiceType(e.target.value);
              }}
              placeholder="e.g. 2.0HP Split Inverter Cleaning + Freon Top-up"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>

          {/* PRICING & DISCOUNT LOGIC (CORE OBJECTIVE 10) */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                Price & Discount Calculation
              </span>
              <div className="flex items-center text-[11px] gap-2">
                <span className="text-slate-500">Discount Mode:</span>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="discMode"
                    checked={discountType === 'amount'}
                    onChange={() => setDiscountType('amount')}
                    className="text-emerald-600"
                  />
                  <span>Amount (₱)</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="discMode"
                    checked={discountType === 'percentage'}
                    onChange={() => setDiscountType('percentage')}
                    className="text-emerald-600"
                  />
                  <span>Percent (%)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Original Gross Amount (₱) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={originalAmount}
                  onChange={(e) => setOriginalAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Discount ({discountType === 'percentage' ? '%' : '₱'})
                </label>
                <input
                  type="number"
                  step="any"
                  value={discountVal}
                  onChange={(e) => setDiscountVal(e.target.value)}
                  placeholder="0"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>

            {/* Calculated Breakdown Display */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-mono">
              <span className="text-slate-500">
                Original: <strong>{formatPHP(parsedOriginal)}</strong> · Disc: -{formatPHP(computedDiscount)}
              </span>
              <span className="text-emerald-700 font-bold text-sm">
                Final Collection: {formatPHP(finalAmount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden bg-white"
                required
              >
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name} {pm.accountNumber ? `(${pm.accountNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Technician / Collector
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="">-- None / Direct Counter --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Notes / Bank Reference #
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. GCash Ref 9028129031 or Cash handed to cashier"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            />
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {editItem ? 'Save Changes' : 'Record Collection (₱)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
