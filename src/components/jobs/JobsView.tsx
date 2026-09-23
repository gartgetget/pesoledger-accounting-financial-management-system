import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Search,
  Plus,
  Printer,
  Edit2,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { ServiceJob } from '../../types';
import { formatPHP } from '../../utils/currency';
import { formatDateDisplay } from '../../utils/date';
import { exportToExcel } from '../../utils/excel';
import { JobInvoiceModal } from './JobInvoiceModal';
import { ConfirmModal } from '../layout/ConfirmModal';

interface JobsViewProps {
  onOpenJobModal: () => void;
  onEditJob: (job: ServiceJob) => void;
}

export const JobsView: React.FC<JobsViewProps> = ({ onOpenJobModal, onEditJob }) => {
  const { serviceJobs, deleteServiceJob, userRole } = useAccounting();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Active Job for Invoice View
  const [invoiceJob, setInvoiceJob] = useState<ServiceJob | null>(null);
  // Delete Target
  const [deleteTarget, setDeleteTarget] = useState<ServiceJob | null>(null);

  const filteredJobs = useMemo(() => {
    return serviceJobs.filter((job) => {
      if (statusFilter !== 'ALL' && job.paymentStatus !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && job.serviceCategory !== categoryFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNumber = job.jobNumber.toLowerCase().includes(q);
        const matchCust = job.customerName.toLowerCase().includes(q);
        const matchDesc = job.description.toLowerCase().includes(q);
        const matchTech = (job.technicianName || '').toLowerCase().includes(q);
        if (!matchNumber && !matchCust && !matchDesc && !matchTech) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [serviceJobs, statusFilter, categoryFilter, searchTerm]);

  const totalRevenueGenerated = useMemo(() => {
    return filteredJobs.reduce((s, j) => s + j.amountPaid, 0);
  }, [filteredJobs]);

  const handleExport = () => {
    const exportData = filteredJobs.map((j) => ({
      'Job Order #': j.jobNumber,
      'Date': j.date,
      'Customer': j.customerName,
      'Category': j.serviceCategory,
      'Technician': j.technicianName,
      'Description': j.description,
      'Labor': j.laborAmount,
      'Parts Selling': j.partsAmount,
      'Parts Cost': j.partsCostAmount,
      'Total Billed': j.total,
      'Amount Paid': j.amountPaid,
      'Status': j.paymentStatus,
    }));
    exportToExcel([{ sheetName: 'Service Orders', data: exportData }], `Service_Jobs_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Services & Job Orders Management</h1>
            <p className="text-xs text-slate-500">
              Integrated technical labor, parts inventory deduction, and customer billing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">Total Paid Collections</span>
            <span className="text-base font-bold font-mono text-emerald-800 tabular-nums">
              {formatPHP(totalRevenueGenerated)}
            </span>
          </div>

          <button
            onClick={onOpenJobModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Job Order</span>
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search job #, customer, tech..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
          >
            <option value="ALL">All Categories</option>
            <option value="REF/AC">REF/AC</option>
            <option value="WM/TV">WM/TV</option>
            <option value="PARAÑAQUE">PARAÑAQUE</option>
            <option value="JIM/EUGENE">JIM/EUGENE</option>
          </select>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Export Jobs</span>
        </button>
      </div>

      {/* JOBS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Job #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Technician Assigned</th>
                <th className="py-3 px-4">Diagnosis / Details</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Total Billed</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No service jobs found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                      {job.jobNumber}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                      {formatDateDisplay(job.date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {job.customerName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                      {job.serviceCategory}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                      {job.technicianName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={job.description}>
                      {job.description}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {job.paymentStatus === 'Paid' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Paid
                        </span>
                      )}
                      {job.paymentStatus === 'Partially Paid' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" />
                          Partial
                        </span>
                      )}
                      {job.paymentStatus === 'Unpaid' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3" />
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap text-sm">
                      {formatPHP(job.total)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setInvoiceJob(job)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                          title="View and print official service invoice"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>Invoice</span>
                        </button>
                        <button
                          onClick={() => onEditJob(job)}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Edit Job"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {userRole === 'admin' && (
                          <button
                            onClick={() => setDeleteTarget(job)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Delete Job"
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

      {/* INVOICE MODAL */}
      <JobInvoiceModal job={invoiceJob} onClose={() => setInvoiceJob(null)} />

      {/* DELETE CONFIRMATION */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Service Job Record"
        message={`Are you sure you want to remove job ${deleteTarget?.jobNumber} for ${deleteTarget?.customerName}?`}
        confirmLabel="Remove Job"
        isDestructive={true}
        onConfirm={() => {
          if (deleteTarget) {
            deleteServiceJob(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
