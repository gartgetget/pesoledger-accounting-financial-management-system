import React from 'react';
import { X, Printer, Wrench } from 'lucide-react';
import { ServiceJob } from '../../types';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP } from '../../utils/currency';
import { formatDateDisplay } from '../../utils/date';
import { getJobCollectionTotals } from '../../utils/jobAccounting';

interface JobInvoiceModalProps {
  job: ServiceJob | null;
  onClose: () => void;
}

export const JobInvoiceModal: React.FC<JobInvoiceModalProps> = ({ job, onClose }) => {
  const { companySettings, paymentMethods, expenses } = useAccounting();

  if (!job) return null;

  const handlePrint = () => {
    window.print();
  };

  const getMethodName = (pmId: string) => {
    const found = paymentMethods.find((p) => p.id === pmId);
    return found ? found.name : pmId || 'Not specified';
  };
  const getExpenseKind = (category: string) => {
    const normalized = category.toUpperCase().replace(/[^A-Z]/g, '');
    if (normalized.includes('INSTALLATIONMATERIALS')) return 'installationMaterials';
    if (normalized.includes('PARTS') || normalized.includes('MATERIALS')) return 'parts';
    if (normalized.includes('REFERRAL') || normalized.includes('REFERAL')) return 'referral';
    return null;
  };
  const invoiceCustomers = job.customers || [];
  const jobTotals = getJobCollectionTotals(job, expenses);
  const collectedCustomers = invoiceCustomers.filter(
    (customer) => customer.amountCollected > 0 || customer.installationMaterialsPrice > 0
  );
  const customerPartsLines = invoiceCustomers.flatMap((customer, customerIndex) =>
    (customer.parts || [])
      .filter((part) => part.price > 0)
      .map((part, partIndex) => ({
        key: `part-${customerIndex}-${partIndex}`,
        label: [
          part.description || 'Part / Material',
          part.sku && `SKU ${part.sku}`,
          part.invoice && `Invoice ${part.invoice}`,
          (part.paymentMethodId || customer.paymentMethodId) &&
            `Paid via ${getMethodName(part.paymentMethodId || customer.paymentMethodId)}`,
        ]
          .filter(Boolean)
          .join(' · '),
        customerName: customer.name,
        amount: part.price,
      }))
  );
  const customerReferralLines = invoiceCustomers
    .filter((customer) => customer.referralAmount > 0)
    .map((customer, index) => ({
      key: `referral-${index}`,
      label: customer.referral || 'Referral',
      customerName: customer.name,
      amount: customer.referralAmount,
    }));
  const customerInstallationMaterialsLines = invoiceCustomers
    .filter((customer) => customer.installationMaterialsPrice > 0)
    .map((customer, index) => ({
      key: `installation-materials-${index}`,
      label: customer.installationMaterials || 'Installation Materials',
      customerName: customer.name,
      amount: customer.installationMaterialsPrice,
    }));
  const linkedJobExpenses = expenses.filter(
    (expense) =>
      expense.relatedId === job.id &&
      !expense.isVoid &&
      getExpenseKind(expense.category) !== null
  );
  const ledgerPartsLines = linkedJobExpenses
    .filter((expense) => getExpenseKind(expense.category) === 'parts')
    .map((expense) => ({
      key: expense.id,
      label: `${expense.description || expense.category} · Paid via ${getMethodName(expense.paymentMethodId)}`,
      customerName: '',
      amount: expense.amount,
    }));
  const ledgerReferralLines = linkedJobExpenses
    .filter((expense) => getExpenseKind(expense.category) === 'referral')
    .map((expense) => ({
      key: expense.id,
      label: expense.description || expense.category,
      customerName: '',
      amount: expense.amount,
    }));
  const ledgerInstallationMaterialsLines = linkedJobExpenses
    .filter((expense) => getExpenseKind(expense.category) === 'installationMaterials')
    .map((expense) => ({
      key: expense.id,
      label: `${expense.description || expense.category} · Paid via ${getMethodName(expense.paymentMethodId)}`,
      customerName: '',
      amount: expense.amount,
    }));
  const partsExpense = jobTotals.partsExpense;
  const installationMaterialsExpense = jobTotals.installationMaterialsExpense;
  const referralExpense = jobTotals.referralExpense;
  const getCompleteExpenseLines = (
    customerLines: typeof customerPartsLines,
    ledgerLines: typeof ledgerPartsLines,
    expectedAmount: number,
    fallbackLabel: string,
  ) => {
    const customerAmount = customerLines.reduce((sum, line) => sum + line.amount, 0);
    const ledgerAmount = ledgerLines.reduce((sum, line) => sum + line.amount, 0);
    const sourceLines = ledgerAmount > customerAmount ? ledgerLines : customerLines;
    const sourceAmount = Math.max(customerAmount, ledgerAmount);
    const missingAmount = expectedAmount - sourceAmount;
    return missingAmount > 0.009
      ? [
          ...sourceLines,
          {
            key: `job-expense-${fallbackLabel}`,
            label: fallbackLabel,
            customerName: '',
            amount: missingAmount,
          },
        ]
      : sourceLines;
  };
  const partsExpenseLines = getCompleteExpenseLines(
    customerPartsLines,
    ledgerPartsLines,
    partsExpense,
    'Parts / Materials',
  );
  const referralExpenseLines = getCompleteExpenseLines(
    customerReferralLines,
    ledgerReferralLines,
    referralExpense,
    'Referral',
  );
  const installationMaterialsExpenseLines = getCompleteExpenseLines(
    customerInstallationMaterialsLines,
    ledgerInstallationMaterialsLines,
    installationMaterialsExpense,
    'Installation Materials',
  );
  const grossCollection = jobTotals.grossCollection;
  const invoiceCollection = jobTotals.netCollection;
  const customerGrossCollection = invoiceCustomers.reduce(
    (sum, customer) => sum + customer.amountCollected,
    0,
  );
  const additionalCollection = Math.max(0, grossCollection - customerGrossCollection);
  const invoiceTotal = job.total > 0 || job.subtotal === 0
    ? job.total
    : Math.max(0, job.subtotal - job.discountAmount);
  const netAfterJobExpenses = invoiceCollection;
  const jobExpenseLines = [
    ...partsExpenseLines,
    ...installationMaterialsExpenseLines,
    ...referralExpenseLines,
  ];
  const totalJobExpenses = partsExpense + installationMaterialsExpense + referralExpense;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Top Actions (Hidden on Print) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              Invoice Preview
            </span>
            <span className="text-xs text-slate-500 font-mono">{job.jobNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              aria-label="Print invoice receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Invoice Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE INVOICE BODY */}
        <div className="space-y-6 text-slate-800">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-base">
                  ₱
                </div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  {companySettings.name}
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">{companySettings.address}</p>
              <p className="text-xs text-slate-500">Contact: {companySettings.phone} · TIN: {companySettings.tin}</p>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-800 block text-lg">
                SERVICE INVOICE
              </span>
              <p className="text-xs font-mono font-semibold text-slate-800 mt-1">
                NO: {job.jobNumber}
              </p>
              <p className="text-xs text-slate-500">
                Date: {formatDateDisplay(job.date)}
              </p>
            </div>
          </div>

          {/* Client & Service Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Billed To Customer
              </span>
              <p className="font-bold text-slate-900 mt-0.5 text-sm">
                {(job.customers || []).map((customer) => customer.name).filter(Boolean).join(', ') || job.customerName}
              </p>
              <p className="text-slate-600 mt-1">Lead Tech: <strong>{job.technicianName}</strong></p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Service Details
              </span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {(job.customers || [])
                  .map((customer) => [customer.name, customer.serviceCategory].filter(Boolean).join(' — '))
                  .filter(Boolean)
                  .join('; ')}
              </p>
              <p className="text-slate-600 mt-1">{job.description}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Amount (₱)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoiceCustomers.flatMap((customer, customerIndex) => [
                  ...(customer.installationMaterials || customer.installationMaterialsPrice > 0 ? [
                    <tr key={`${customerIndex}-installation-materials`}>
                      <td className="py-2.5 px-4 text-slate-800">
                        {customer.installationMaterials || 'Installation Materials'}
                        {customer.name ? ` — ${customer.name}` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">1</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatPHP(customer.installationMaterialsPrice)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatPHP(customer.installationMaterialsPrice)}</td>
                    </tr>,
                  ] : []),
                  ...(customer.amountCollected > 0 ? [
                    <tr key={`${customerIndex}-collection`}>
                      <td className="py-2.5 px-4 text-slate-800">
                        Service Collection
                        {customer.name ? ` — ${customer.name}` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">1</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatPHP(customer.amountCollected)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatPHP(customer.amountCollected)}</td>
                    </tr>,
                  ] : []),
                ])}
                {additionalCollection > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 text-slate-800">Additional Collection / Installation Materials</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">1</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatPHP(additionalCollection)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatPHP(additionalCollection)}</td>
                  </tr>
                )}
                {invoiceCustomers.length === 0 && job.amountPaid > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 text-slate-800">Job Collection</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">1</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatPHP(job.amountPaid)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatPHP(job.amountPaid)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-1.5 font-mono">
              <div className="flex justify-between py-1 text-slate-600 border-b border-slate-100">
                <span>Subtotal:</span>
                <span>{formatPHP(job.subtotal)}</span>
              </div>
              {job.discountAmount > 0 && (
                <div className="flex justify-between py-1 text-rose-600 border-b border-slate-100">
                  <span>Discount ({job.discountType === 'percentage' ? `${job.discountValue}%` : 'Fixed'}):</span>
                  <span>-{formatPHP(job.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 text-slate-900 font-bold text-sm border-b-2 border-slate-900">
                <span>GROSS JOB TOTAL (BEFORE EXPENSES):</span>
                <span className="text-emerald-800">{formatPHP(invoiceTotal)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Gross Collection Before Expenses:</span>
                <span>{formatPHP(grossCollection)}</span>
              </div>
              {collectedCustomers.length > 0 ? (
                collectedCustomers.map((customer, index) => (
                  <div key={`${customer.customerId}-${index}`} className="flex justify-between gap-3 py-1 text-slate-600">
                    <span className="min-w-0 truncate">
                      {customer.name || 'Customer'} ({getMethodName(customer.paymentMethodId)}):
                    </span>
                    <span className="shrink-0">{formatPHP(customer.amountCollected)}</span>
                  </div>
                ))
              ) : null}
              <div className="flex justify-between py-1 text-emerald-800 font-bold">
                <span>NET AFTER JOB EXPENSE:</span>
                <span>{formatPHP(invoiceCollection)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-800 font-semibold">
                <span>INSTALLATION MATERIALS + PARTS / MATERIALS + REFERRAL EXPENSES:</span>
                <span className={totalJobExpenses > 0 ? 'text-rose-600' : 'text-slate-700'}>
                  {formatPHP(totalJobExpenses)}
                </span>
              </div>
            </div>
          </div>
          {(invoiceCollection > 0 || totalJobExpenses > 0) && (
            <div className="flex justify-end text-xs">
              <div className="w-64 space-y-1 font-mono border-t border-slate-200 pt-2 text-amber-700">
                <span className="block text-[10px] font-sans font-bold uppercase tracking-wide text-slate-500">
                  Job Expenses and Net Collection
                </span>
                {jobExpenseLines.map((line) => (
                  <div key={line.key} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {line.label}{line.customerName ? ` — ${line.customerName}` : ''}:
                    </span>
                    <span className="shrink-0">-{formatPHP(line.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-amber-200 pt-1">
                  <span>Total Job Expenses:</span>
                  <span>-{formatPHP(totalJobExpenses)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-1 font-bold text-slate-900">
                  <span>NET AFTER JOB EXPENSES:</span>
                  <span className={netAfterJobExpenses >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {formatPHP(netAfterJobExpenses)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
            <div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
                Customer Signature & Acceptance
              </div>
              <p className="text-[10px] text-slate-400">Received appliance in good working order</p>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
                {job.technicianName} (Authorized Technician)
              </div>
              <p className="text-[10px] text-slate-400">Certified Appliance Service Specialist</p>
            </div>
          </div>

          {/* Invoice note and terms */}
          <div className="mt-8 border-t border-slate-200 pt-3 text-[11px] text-slate-600 space-y-1">
            {job.notes && <p className="whitespace-pre-wrap"><strong>Note:</strong> {job.notes}</p>}
            <p><strong>Warranty Policy:</strong> 30-day service warranty on labor and workmanship. Electrical surge or misuse voids warranty.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
