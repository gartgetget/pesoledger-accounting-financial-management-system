import React from 'react';
import { X, Printer, Wrench } from 'lucide-react';
import { ServiceJob } from '../../types';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP } from '../../utils/currency';
import { formatDateDisplay } from '../../utils/date';

interface JobInvoiceModalProps {
  job: ServiceJob | null;
  onClose: () => void;
}

export const JobInvoiceModal: React.FC<JobInvoiceModalProps> = ({ job, onClose }) => {
  const { companySettings, paymentMethods } = useAccounting();

  if (!job) return null;

  const handlePrint = () => {
    window.print();
  };

  const getMethodName = (pmId: string) => {
    const found = paymentMethods.find((p) => p.id === pmId);
    return found ? found.name : pmId;
  };

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
              <p className="font-bold text-slate-900 mt-0.5 text-sm">{job.customerName}</p>
              <p className="text-slate-600 mt-1">Lead Tech: <strong>{job.technicianName}</strong></p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Service Details
              </span>
              <p className="font-semibold text-slate-800 mt-0.5">{job.serviceCategory}</p>
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
                {job.laborAmount > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-slate-800">
                      Professional Technical Labor & Diagnostics
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">1</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      {formatPHP(job.laborAmount)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatPHP(job.laborAmount)}
                    </td>
                  </tr>
                )}

                {job.partsUsed && job.partsUsed.map((p, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-4 text-slate-800">
                      Part: {p.partName} <span className="text-slate-400 font-mono text-[10px]">[{p.partNumber}]</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{p.quantity}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      {formatPHP(p.sellingPrice)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatPHP(p.totalSelling)}
                    </td>
                  </tr>
                ))}

                {job.otherCharges > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 text-slate-800">Other Diagnostic / Consumable Charges</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">1</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      {formatPHP(job.otherCharges)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatPHP(job.otherCharges)}
                    </td>
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
                <span>TOTAL AMOUNT:</span>
                <span className="text-emerald-800">{formatPHP(job.total)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>Amount Paid ({getMethodName(job.paymentMethodId)}):</span>
                <span>{formatPHP(job.amountPaid)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-800 font-semibold">
                <span>Balance Due:</span>
                <span className={job.total - job.amountPaid > 0 ? 'text-rose-600' : 'text-slate-700'}>
                  {formatPHP(Math.max(0, job.total - job.amountPaid))}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="p-3 bg-slate-50 rounded text-[11px] text-slate-500 space-y-1">
            <p><strong>Warranty Policy:</strong> 30-day service warranty on labor and replaced parts. Electrical surge or misuse voids warranty.</p>
            {job.notes && <p><strong>Job Remarks:</strong> {job.notes}</p>}
          </div>

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
        </div>
      </div>
    </div>
  );
};
