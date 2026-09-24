import React, { useState } from 'react';
import { X, Plus, Trash2, Calculator, Wrench, Package } from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP, parseNumber } from '../../utils/currency';
import { getTodayDateString } from '../../utils/date';
import { PartUsage, PaymentStatus, JobStatus, ServiceJob } from '../../types';

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: ServiceJob | null;
}

export const JobModal: React.FC<JobModalProps> = ({
  isOpen,
  onClose,
  editItem,
}) => {
  const {
    customers,
    employees,
    parts,
    serviceCategories,
    paymentMethods,
    serviceJobs,
    createServiceJob,
    updateServiceJob,
    addCustomer,
  } = useAccounting();

  const [date, setDate] = useState(editItem ? editItem.date : getTodayDateString());
  const [jobNumber, setJobNumber] = useState(
    editItem
      ? editItem.jobNumber
      : `JOB-${new Date().getFullYear()}-${String(serviceJobs.length + 1).padStart(3, '0')}`
  );
  const [customerId, setCustomerId] = useState(editItem ? editItem.customerId : customers[0]?.id || '');
  const [customCustomerName, setCustomCustomerName] = useState(editItem ? editItem.customerName : '');
  const [technicianId, setTechnicianId] = useState(
    editItem ? editItem.technicianId : employees[0]?.id || ''
  );
  const [serviceCategory, setServiceCategory] = useState(
    editItem ? editItem.serviceCategory : serviceCategories[0]?.name || 'SERVICE'
  );
  const [description, setDescription] = useState(editItem ? editItem.description : '');
  const [laborAmount, setLaborAmount] = useState<string>(
    editItem ? String(editItem.laborAmount) : '1500'
  );
  const [otherCharges, setOtherCharges] = useState<string>(
    editItem ? String(editItem.otherCharges) : '0'
  );

  // Selected Parts
  const [selectedParts, setSelectedParts] = useState<PartUsage[]>(
    editItem ? editItem.partsUsed || [] : []
  );

  // Discount
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>(
    editItem ? editItem.discountType : 'amount'
  );
  const [discountValue, setDiscountValue] = useState<string>(
    editItem ? String(editItem.discountValue) : '0'
  );

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    editItem ? editItem.paymentStatus : 'Paid'
  );
  const [jobStatus, setJobStatus] = useState<JobStatus>(
    editItem ? editItem.status || 'open' : 'open'
  );
  const [amountPaid, setAmountPaid] = useState<string>(
    editItem ? String(editItem.amountPaid || editItem.total) : ''
  );
  const [paymentMethodId, setPaymentMethodId] = useState(
    editItem ? editItem.paymentMethodId : paymentMethods[0]?.id || 'pm-1'
  );
  const [notes, setNotes] = useState(editItem ? editItem.notes || '' : '');

  // Add Part state in modal
  const [partToAddId, setPartToAddId] = useState(parts[0]?.id || '');
  const [partToAddQty, setPartToAddQty] = useState('1');

  if (!isOpen) return null;

  const handleAddPartToJob = () => {
    const part = parts.find((p) => p.id === partToAddId);
    const qty = Math.max(1, parseInt(partToAddQty) || 1);
    if (!part) return;

    if (qty > part.quantity) {
      alert(`Warning: Only ${part.quantity} units available in stock.`);
    }

    const existingIdx = selectedParts.findIndex((p) => p.partId === part.id);
    if (existingIdx >= 0) {
      const updated = [...selectedParts];
      updated[existingIdx].quantity += qty;
      updated[existingIdx].totalCost = updated[existingIdx].quantity * updated[existingIdx].costPrice;
      updated[existingIdx].totalSelling = updated[existingIdx].quantity * updated[existingIdx].sellingPrice;
      setSelectedParts(updated);
    } else {
      setSelectedParts([
        ...selectedParts,
        {
          partId: part.id,
          partName: part.name,
          partNumber: part.partNumber,
          quantity: qty,
          costPrice: part.costPrice,
          sellingPrice: part.sellingPrice,
          totalCost: qty * part.costPrice,
          totalSelling: qty * part.sellingPrice,
        },
      ]);
    }
  };

  const handleRemovePart = (index: number) => {
    setSelectedParts(selectedParts.filter((_, i) => i !== index));
  };

  // Computations
  const parsedLabor = parseNumber(laborAmount);
  const parsedOther = parseNumber(otherCharges);
  const totalPartsSelling = selectedParts.reduce((s, p) => s + p.totalSelling, 0);
  const totalPartsCost = selectedParts.reduce((s, p) => s + p.totalCost, 0);

  const subtotal = parsedLabor + totalPartsSelling + parsedOther;

  const parsedDiscVal = parseNumber(discountValue);
  let computedDiscount = 0;
  if (discountType === 'percentage') {
    computedDiscount = (subtotal * parsedDiscVal) / 100;
  } else {
    computedDiscount = parsedDiscVal;
  }

  const finalTotal = Math.max(0, subtotal - computedDiscount);
  const actualPaid = amountPaid ? parseNumber(amountPaid) : paymentStatus === 'Paid' ? finalTotal : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobNumber.trim() || !description.trim()) {
      alert('Please fill in Job Number and Description.');
      return;
    }

    let resolvedCustomerName = customCustomerName.trim();
    if (!resolvedCustomerName) {
      const selectedCust = customers.find((c) => c.id === customerId);
      resolvedCustomerName = selectedCust ? selectedCust.name : 'Walk-in Customer';
    }

    const tech = employees.find((emp) => emp.id === technicianId);

    const payload = {
      jobNumber: jobNumber.trim(),
      customerId: customerId || 'cust-direct',
      customerName: resolvedCustomerName,
      date,
      technicianId,
      technicianName: tech ? tech.name : 'General Technician',
      serviceCategory,
      description: description.trim(),
      laborAmount: parsedLabor,
      partsUsed: selectedParts,
      partsAmount: totalPartsSelling,
      partsCostAmount: totalPartsCost,
      otherCharges: parsedOther,
      discountType,
      discountValue: parsedDiscVal,
      discountAmount: computedDiscount,
      subtotal,
      total: finalTotal,
      amountPaid: actualPaid,
      paymentMethodId,
      paymentStatus,
      status: jobStatus,
      notes: notes.trim(),
    };

    if (editItem) {
      updateServiceJob(editItem.id, payload);
    } else {
      createServiceJob(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editItem ? 'Edit Service Job Order' : 'Create New Service Job Order'}
              </h2>
              <p className="text-xs text-slate-500">
                Auto-deducts inventory, records parts cost and collections
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Job Order # <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Service Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                required
              >
                {serviceCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name / Address
              </label>
              <input
                type="text"
                list="job-cust-list"
                value={customCustomerName}
                onChange={(e) => setCustomCustomerName(e.target.value)}
                placeholder="Select or enter customer..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
              <datalist id="job-cust-list">
                {customers.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Technician Assigned <span className="text-rose-500">*</span>
              </label>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                required
              >
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
              Job Description / Issue Reported <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Refrigerator not cooling - Replace starting capacitor and top-up freon"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>

          {/* PARTS USAGE SELECTOR (CORE OBJECTIVE 8 & 9) */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                Parts Used From Inventory (OW Parts)
              </span>
              <span className="text-[11px] text-slate-500">
                Auto-calculates Cost vs Selling Price
              </span>
            </div>

            {/* Selector Bar */}
            <div className="flex items-center gap-2">
              <select
                value={partToAddId}
                onChange={(e) => setPartToAddId(e.target.value)}
                className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.partNumber}] · Stock: {p.quantity} · Cost: ₱{p.costPrice} · Sell: ₱{p.sellingPrice}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={partToAddQty}
                onChange={(e) => setPartToAddQty(e.target.value)}
                className="w-16 text-xs px-2 py-1.5 border border-slate-300 rounded-lg text-center"
              />

              <button
                type="button"
                onClick={handleAddPartToJob}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                + Add Part
              </button>
            </div>

            {/* Selected Parts Table */}
            {selectedParts.length > 0 && (
              <div className="bg-white rounded border border-slate-200 overflow-hidden mt-2">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold">
                    <tr>
                      <th className="py-1.5 px-3">Part</th>
                      <th className="py-1.5 px-2 text-center">Qty</th>
                      <th className="py-1.5 px-3 text-right">Cost (₱)</th>
                      <th className="py-1.5 px-3 text-right">Selling (₱)</th>
                      <th className="py-1.5 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {selectedParts.map((p, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-3 font-sans font-medium text-slate-800">
                          {p.partName} <span className="text-slate-400 text-[10px]">[{p.partNumber}]</span>
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-700">{p.quantity}</td>
                        <td className="py-1.5 px-3 text-right text-rose-700 font-bold">
                          {formatPHP(p.totalCost)}
                        </td>
                        <td className="py-1.5 px-3 text-right text-emerald-700 font-bold">
                          {formatPHP(p.totalSelling)}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePart(idx)}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CHARGES & DISCOUNT CALCULATIONS (SECTIONS 9 & 10) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Labor / Service Charge (₱)
              </label>
              <input
                type="number"
                step="any"
                value={laborAmount}
                onChange={(e) => setLaborAmount(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Other Charges / Diagnostic (₱)
              </label>
              <input
                type="number"
                step="any"
                value={otherCharges}
                onChange={(e) => setOtherCharges(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono font-semibold"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Discount ({discountType === 'percentage' ? '%' : '₱'})
                </label>
                <div className="flex items-center text-[10px] gap-1">
                  <button
                    type="button"
                    onClick={() => setDiscountType('amount')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${discountType === 'amount' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                  >
                    ₱
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${discountType === 'percentage' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                  >
                    %
                  </button>
                </div>
              </div>
              <input
                type="number"
                step="any"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono font-semibold"
              />
            </div>
          </div>

          {/* CALCULATION SUMMARY CARD (FORMULA DISPLAY) */}
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex flex-wrap items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-600 block text-[11px]">
                Subtotal (Labor {formatPHP(parsedLabor)} + Parts {formatPHP(totalPartsSelling)} + Other {formatPHP(parsedOther)}):
              </span>
              <strong className="text-slate-800 text-sm">{formatPHP(subtotal)}</strong>
              {computedDiscount > 0 && (
                <span className="text-rose-600 ml-2">(-{formatPHP(computedDiscount)} discount)</span>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] text-emerald-800 font-sans uppercase font-bold block">
                Final Billable Total
              </span>
              <span className="text-base font-bold text-emerald-800">
                {formatPHP(finalTotal)}
              </span>
            </div>
          </div>

          {/* PAYMENT & STATUS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Job Status
              </label>
              <select
                value={jobStatus}
                onChange={(e) => setJobStatus(e.target.value as JobStatus)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="Paid">Paid (Full)</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Unpaid">Unpaid / On Account</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Paid (₱)
              </label>
              <input
                type="number"
                step="any"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={paymentStatus === 'Paid' ? String(finalTotal) : '0'}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Job Notes / Customer Feedback
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 30-day parts and labor warranty included"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
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
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              {editItem ? 'Update Job Order' : 'Create & Post Job Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
