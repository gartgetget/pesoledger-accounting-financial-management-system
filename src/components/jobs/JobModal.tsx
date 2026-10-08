import React, { useState } from 'react';
import { X, Plus, Trash2, Calculator, Wrench } from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP, parseNumber } from '../../utils/currency';
import { getTodayDateString } from '../../utils/date';
import { PaymentStatus, JobStatus, ServiceJob, JobCustomer, JobPartLine } from '../../types';

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: ServiceJob | null;
}

const nextJobNumber = (jobs: ServiceJob[]): string => {
  const year = new Date().getFullYear();
  const prefix = `JOB-${year}-`;
  const max = jobs
    .map((j) => j.jobNumber)
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .reduce((a, b) => (Number.isNaN(b) ? a : Math.max(a, b)), 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
};

const getCustomerTotalCollection = (customer: JobCustomer): number => {
  const partsTotal = customer.parts.reduce((sum, part) => sum + (Number(part.price) || 0), 0);
  return (Number(customer.amountCollected) || 0) -
    (Number(customer.installationMaterialsPrice) || 0) -
    partsTotal -
    (Number(customer.referralAmount) || 0);
};

export const JobModal: React.FC<JobModalProps> = ({
  isOpen,
  onClose,
  editItem,
}) => {
  const {
    customers,
    employees,
    serviceCategories,
    paymentMethods,
    serviceJobs,
    areas,
    createServiceJob,
    updateServiceJob,
    addCustomer,
  } = useAccounting();

  const [date, setDate] = useState(editItem ? editItem.date : getTodayDateString());
  const [jobNumber, setJobNumber] = useState(
    editItem ? editItem.jobNumber : nextJobNumber(serviceJobs)
  );
  const [jobCustomers, setJobCustomers] = useState<JobCustomer[]>(() => {
    if (editItem?.customers && editItem.customers.length > 0) {
      return editItem.customers.map((customer) => ({
        ...customer,
        paymentMethodId: customer.paymentMethodId || editItem.paymentMethodId || paymentMethods[0]?.id || '',
        serviceCategory: customer.serviceCategory || serviceCategories[0]?.name || '',
        parts: (customer.parts || []).map((part) => ({
          ...part,
          paymentMethodId:
            part.paymentMethodId || customer.paymentMethodId || editItem.paymentMethodId || paymentMethods[0]?.id || '',
        })),
        installationMaterials: customer.installationMaterials || '',
        installationMaterialsPrice: customer.installationMaterialsPrice || 0,
        referral: customer.referral || '',
        referralAmount: customer.referralAmount || 0,
      }));
    }
    if (editItem) {
      return [{
        customerId: editItem.customerId || '',
        name: editItem.customerName || '',
        amountCollected: editItem.amountPaid || 0,
        paymentMethodId: editItem.paymentMethodId || paymentMethods[0]?.id || '',
        serviceCategory: serviceCategories[0]?.name || '',
        parts: [],
        installationMaterials: '',
        installationMaterialsPrice: 0,
        referral: '',
        referralAmount: 0,
      }];
    }
    return [{
      customerId: '',
      name: '',
      amountCollected: 0,
      paymentMethodId: paymentMethods[0]?.id || '',
      serviceCategory: serviceCategories[0]?.name || '',
      parts: [],
      installationMaterials: '',
      installationMaterialsPrice: 0,
      referral: '',
      referralAmount: 0,
    }];
  });
  const [area, setArea] = useState(
    editItem ? editItem.area || '' : employees[0]?.area || ''
  );
  const [technicianName, setTechnicianName] = useState(
    editItem ? editItem.technicianName || '' : ''
  );
  const [description, setDescription] = useState(editItem ? editItem.description : '');
  // Discount (kept from stored job so editing never changes its total)
  const [discountType] = useState<'percentage' | 'amount'>(
    editItem ? editItem.discountType : 'amount'
  );
  const [discountValue] = useState<string>(
    editItem ? String(editItem.discountValue) : '0'
  );

  // Payment
  const [jobStatus, setJobStatus] = useState<JobStatus>(
    editItem ? editItem.status || 'open' : 'open'
  );
  const [notes, setNotes] = useState(editItem ? editItem.notes || '' : '');

  if (!isOpen) return null;

  // Customers & collections repeater
  const updateCustomerRow = (index: number, patch: Partial<JobCustomer>) => {
    setJobCustomers((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const merged = { ...row, ...patch };
        if (patch.name !== undefined) {
          const match = customers.find((c) => c.name === patch.name);
          merged.customerId = match ? match.id : '';
        }
        return merged;
      })
    );
  };

  const addCustomerRow = () => {
    setJobCustomers((prev) => [...prev, {
      customerId: '',
      name: '',
      amountCollected: 0,
      paymentMethodId: paymentMethods[0]?.id || '',
      serviceCategory: serviceCategories[0]?.name || '',
      parts: [],
      installationMaterials: '',
      installationMaterialsPrice: 0,
      referral: '',
      referralAmount: 0,
    }]);
  };

  const updatePartRow = (customerIndex: number, partIndex: number, patch: Partial<JobPartLine>) => {
    setJobCustomers((prev) => prev.map((customer, i) => i === customerIndex
      ? { ...customer, parts: customer.parts.map((part, j) => j === partIndex ? { ...part, ...patch } : part) }
      : customer));
  };

  const addPartRow = (customerIndex: number) => {
    setJobCustomers((prev) => prev.map((customer, i) => i === customerIndex
      ? {
          ...customer,
          parts: [...customer.parts, {
            sku: '',
            invoice: '',
            description: '',
            price: 0,
            paymentMethodId: customer.paymentMethodId || paymentMethods[0]?.id || '',
          }],
        }
      : customer));
  };

  const removePartRow = (customerIndex: number, partIndex: number) => {
    setJobCustomers((prev) => prev.map((customer, i) => i === customerIndex
      ? { ...customer, parts: customer.parts.filter((_, j) => j !== partIndex) }
      : customer));
  };

  const removeCustomerRow = (index: number) => {
    setJobCustomers((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const cleanCustomerRows = jobCustomers
    .map((customer) => ({
      ...customer,
      parts: customer.parts.filter((part) => part.sku.trim() || part.invoice.trim() || part.description.trim() || part.price > 0),
    }))
    .filter((c) => c.name.trim() || c.amountCollected > 0 || c.serviceCategory || c.parts.length || c.installationMaterials.trim() || c.installationMaterialsPrice > 0 || c.referral.trim() || c.referralAmount > 0);

  // Computations
  const partsTotal = cleanCustomerRows.reduce((sum, customer) => sum + customer.parts.reduce((partSum, part) => partSum + part.price, 0), 0);
  const installationMaterialsTotal = cleanCustomerRows.reduce((sum, customer) => sum + customer.installationMaterialsPrice, 0);
  const referralTotal = cleanCustomerRows.reduce((sum, customer) => sum + customer.referralAmount, 0);
  const collectionAmount = cleanCustomerRows.reduce((sum, customer) => sum + (Number(customer.amountCollected) || 0), 0);
  const grossCollection = collectionAmount;
  const totalDeductions = partsTotal + installationMaterialsTotal + referralTotal;
  const totalCollected = grossCollection - totalDeductions;
  const subtotal = grossCollection;

  const parsedDiscVal = parseNumber(discountValue);
  let computedDiscount = 0;
  if (discountType === 'percentage') {
    computedDiscount = (subtotal * Math.max(0, parsedDiscVal)) / 100;
  } else {
    computedDiscount = Math.max(0, parsedDiscVal);
  }

  computedDiscount = Math.min(subtotal, computedDiscount);
  const finalTotal = Math.max(0, subtotal - computedDiscount);
  const actualPaid = collectionAmount;
  const paymentStatus: PaymentStatus =
    actualPaid >= finalTotal ? 'Paid' : actualPaid > 0 ? 'Partially Paid' : 'Unpaid';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobNumber.trim() || !description.trim()) {
      alert('Please fill in Job Number and Description.');
      return;
    }

    const primaryRow = cleanCustomerRows.find((c) => c.name.trim());
    const resolvedCustomerName = primaryRow ? primaryRow.name.trim() : 'Walk-in Customer';

    const payload = {
      jobNumber: jobNumber.trim(),
      customerId: primaryRow?.customerId || 'cust-direct',
      customerName: resolvedCustomerName,
      area,
      customers: cleanCustomerRows.map((c) => ({
        customerId: c.customerId || '',
        name: c.name.trim(),
        amountCollected: Number(c.amountCollected) || 0,
        paymentMethodId: c.paymentMethodId,
        serviceCategory: c.serviceCategory,
        parts: c.parts,
        installationMaterials: c.installationMaterials.trim(),
        installationMaterialsPrice: Number(c.installationMaterialsPrice) || 0,
        referral: c.referral.trim(),
        referralAmount: Number(c.referralAmount) || 0,
      })),
      date,
      technicianId: '',
      technicianName: technicianName.trim() || 'General Technician',
      description: description.trim(),
      laborAmount: 0,
      otherCharges: 0,
      discountType,
      discountValue: parsedDiscVal,
      discountAmount: computedDiscount,
      subtotal,
      total: finalTotal,
      amountPaid: actualPaid,
      paymentMethodId: primaryRow?.paymentMethodId || '',
      paymentStatus,
      status: jobStatus,
      notes: notes.trim(),
    };

    if (editItem) {
      const updated = await updateServiceJob(editItem.id, payload);
      if (updated) onClose();
    } else {
      const createdId = await createServiceJob(payload);
      if (createdId) onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
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
                Job tracking, labor billing, and customer collection summary
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Technician Assigned <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tech Area / Service Zone
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">No area</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
                {area && !areas.some((a) => a.name === area) && (
                  <option value={area}>{area}</option>
                )}
              </select>
            </div>
          </div>

          {/* CUSTOMERS & COLLECTIONS (MULTI-CUSTOMER + AUTO-SUMMARY) */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div>
              <span className="text-xs font-bold text-slate-800">
                Customers & Collections
                <span className="ml-2 text-[10px] font-semibold text-slate-400">
                  add each customer and their collection — totals auto-summarize
                </span>
              </span>
            </div>

            {jobCustomers.map((row, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Customer {idx + 1}{row.name.trim() ? ` — ${row.name.trim()}` : ''}
                  </span>
                  <span className="text-xs font-bold font-mono text-emerald-700">
                    Total Collection: {formatPHP(getCustomerTotalCollection(row))}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_9rem_1fr_auto] gap-2 items-end">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Customer</label>
                    <input
                      type="text"
                      list="job-cust-list"
                      value={row.name}
                      onChange={(e) => updateCustomerRow(idx, { name: e.target.value })}
                      placeholder="Customer name..."
                      className="w-full min-w-0 text-xs px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Service Category</label>
                    <select
                      value={row.serviceCategory}
                      onChange={(e) => updateCustomerRow(idx, { serviceCategory: e.target.value })}
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select category</option>
                      {serviceCategories.map((category) => (
                        <option key={category.id} value={category.name}>{category.name}</option>
                      ))}
                      {row.serviceCategory && !serviceCategories.some((category) => category.name === row.serviceCategory) && (
                        <option value={row.serviceCategory}>{row.serviceCategory}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Collection (₱)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={row.amountCollected || ''}
                      onChange={(e) => updateCustomerRow(idx, { amountCollected: parseNumber(e.target.value) })}
                      placeholder="0.00"
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Payment Method</label>
                    <select
                      value={row.paymentMethodId}
                      onChange={(e) => updateCustomerRow(idx, { paymentMethodId: e.target.value })}
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select method</option>
                      {paymentMethods.map((method) => (
                        <option key={method.id} value={method.id}>{method.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomerRow(idx)}
                    disabled={jobCustomers.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove customer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Installation Materials</label>
                    <input
                      type="text"
                      value={row.installationMaterials}
                      onChange={(e) => updateCustomerRow(idx, { installationMaterials: e.target.value })}
                      placeholder="Describe installation materials"
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Installation Price (₱)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={row.installationMaterialsPrice || ''}
                      onChange={(e) => updateCustomerRow(idx, { installationMaterialsPrice: parseNumber(e.target.value) })}
                      placeholder="0.00"
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Referral / Less</label>
                    <input
                      type="text"
                      value={row.referral}
                      onChange={(e) => updateCustomerRow(idx, { referral: e.target.value })}
                      placeholder="Who referred this customer?"
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Referral Amount (₱)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={row.referralAmount || ''}
                      onChange={(e) => updateCustomerRow(idx, { referralAmount: parseNumber(e.target.value) })}
                      placeholder="0.00"
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-600">Parts / Materials</span>
                    <span className="text-[10px] font-semibold font-mono text-slate-600">
                      {formatPHP(row.parts.reduce((sum, part) => sum + part.price, 0))}
                    </span>
                  </div>
                  {row.parts.map((part, partIdx) => (
                    <div key={partIdx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_1fr_1fr_auto] gap-2 items-end">
                      <input
                        type="text"
                        value={part.sku}
                        onChange={(e) => updatePartRow(idx, partIdx, { sku: e.target.value })}
                        placeholder="Part SKU"
                        aria-label={`Customer ${idx + 1} part SKU`}
                        className="w-full min-w-0 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={part.invoice}
                        onChange={(e) => updatePartRow(idx, partIdx, { invoice: e.target.value })}
                        placeholder="Invoice #"
                        aria-label={`Customer ${idx + 1} part invoice`}
                        className="w-full min-w-0 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={part.description}
                        onChange={(e) => updatePartRow(idx, partIdx, { description: e.target.value })}
                        placeholder="Part / material description"
                        aria-label={`Customer ${idx + 1} part description`}
                        className="w-full min-w-0 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                      />
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={part.price || ''}
                        onChange={(e) => updatePartRow(idx, partIdx, { price: parseNumber(e.target.value) })}
                        placeholder="Price (₱)"
                        aria-label={`Customer ${idx + 1} part price`}
                        className="w-full min-w-0 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                      <select
                        value={part.paymentMethodId || row.paymentMethodId || paymentMethods[0]?.id || ''}
                        onChange={(e) => updatePartRow(idx, partIdx, { paymentMethodId: e.target.value })}
                        aria-label={`Customer ${idx + 1} part payment method`}
                        className="w-full min-w-0 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="">Select method</option>
                        {paymentMethods.map((method) => (
                          <option key={method.id} value={method.id}>{method.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removePartRow(idx, partIdx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Remove part"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addPartRow(idx)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Part / Material
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addCustomerRow}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Customer
            </button>
            <datalist id="job-cust-list">
              {customers.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
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

          {/* JOB CALCULATION SUMMARY */}
          {/* CALCULATION SUMMARY CARD (FORMULA DISPLAY) */}
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex flex-wrap items-center justify-between text-xs font-mono">
            <div className="space-y-1">
              <span className="text-slate-600 block text-[11px]">
                Total Bill:
              </span>
              <strong className="text-slate-800 text-sm">{formatPHP(finalTotal)}</strong>
              {totalDeductions > 0 && (
                <div className="text-amber-600">
                  Installation materials, parts/materials, and referral expenses: {formatPHP(totalDeductions)}
                </div>
              )}
              <div className="text-[10px] text-slate-600">
                Installation: {formatPHP(installationMaterialsTotal)} · Parts: {formatPHP(partsTotal)} · Referral: {formatPHP(referralTotal)}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-emerald-800 font-sans uppercase font-bold block">
                NET AFTER JOB EXPENSES
              </span>
              <span className="text-base font-bold text-emerald-800">
                {formatPHP(totalCollected)}
              </span>
            </div>
          </div>

          {/* STATUS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                disabled
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 font-semibold"
              >
                <option value="Paid">Paid (Full)</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Unpaid">Unpaid / On Account</option>
              </select>
            </div>

          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Invoice Note (shown at the bottom of the invoice)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note, work detail, or customer instruction"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg resize-y"
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
