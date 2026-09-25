import React, { useState } from 'react';
import {
  Users,
  Plus,
  PhilippinePeso,
  UserPlus,
  Trash2,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP } from '../../utils/currency';
import { formatDateDisplay } from '../../utils/date';
import { exportToExcel } from '../../utils/excel';
import { PayrollModal } from './PayrollModal';

export const PayrollView: React.FC = () => {
  const {
    employees,
    payrollRecords,
    paymentMethods,
    addEmployee,
    deleteEmployee,
    userRole,
  } = useAccounting();

  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);

  // New employee state
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('Technician');
  const [newEmpRate, setNewEmpRate] = useState('650');
  const [newEmpContact, setNewEmpContact] = useState('');

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;

    addEmployee({
      name: newEmpName.trim(),
      position: newEmpRole,
      dailyRate: parseFloat(newEmpRate) || 0,
      contact: newEmpContact.trim(),
    });

    setNewEmpName('');
    setNewEmpContact('');
    setShowAddEmpModal(false);
  };

  const getMethodName = (pmId: string) => {
    const found = paymentMethods.find((p) => p.id === pmId);
    return found ? found.name : pmId;
  };

  const totalPayrollPaid = payrollRecords.reduce((s, r) => s + r.netSalary, 0);

  const handleExport = () => {
    const exportData = payrollRecords.map((r) => ({
      'Date': r.date,
      'Period': r.period,
      'Employee': r.employeeName,
      'Basic Salary': r.basicSalary,
      'Overtime': r.overtimePay,
      'Incentives': r.incentives,
      'Food Allowance': r.foodAllowance,
      'Deductions': r.deductions,
      'Gross Salary': r.grossSalary,
      'Net Salary (PHP)': r.netSalary,
      'Payment Method': getMethodName(r.paymentMethodId),
      'Notes': r.notes || '',
    }));
    exportToExcel([{ sheetName: 'Payroll Records', data: exportData }], `Payroll_Ledger_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Employee Payroll & Compensation</h1>
            <p className="text-xs text-slate-500">
              Manage staff profiles, daily rates, and wage disbursement vouchers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddEmpModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            <span>+ Add Employee</span>
          </button>

          <button
            onClick={() => setIsPayrollModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
          >
            <PhilippinePeso className="w-4 h-4" />
            <span>Process Payroll</span>
          </button>
        </div>
      </div>

      {/* STAFF DIRECTORY ROSTER */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900">Active Staff & Technician Roster ({employees.length})</h2>
          <span className="text-[11px] text-slate-500">Rates auto-fill in payroll vouchers</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{emp.name}</span>
                  {userRole === 'admin' && (
                    <button
                      onClick={() => deleteEmployee(emp.id)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Delete employee profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                  {emp.position}
                </span>
                <p className="text-xs text-slate-500 mt-2 font-mono">
                  Daily Rate: <strong className="text-slate-800 font-bold">{formatPHP(emp.dailyRate || 0)}</strong>
                </p>
                {emp.contact && (
                  <p className="text-[11px] text-slate-400 mt-0.5">📞 {emp.contact}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PAYROLL VOUCHERS DISBURSEMENT TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900">Historical Wage & Payroll Vouchers</h2>
            <p className="text-[11px] text-slate-500">Auto-posted to general expenses under category 'SALARY'</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Payroll</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4 hidden md:table-cell">Period</th>
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4 text-right">Base Pay</th>
                <th className="py-2.5 px-4 text-right hidden md:table-cell">OT / Add-ons</th>
                <th className="py-2.5 px-4 text-right">Deductions</th>
                <th className="py-2.5 px-4 text-right">Net Take-Home</th>
                <th className="py-2.5 px-4 hidden md:table-cell">Account Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {payrollRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-sans">
                    No payroll disbursements recorded yet. Click "Process Payroll" to disburse wages.
                  </td>
                </tr>
              ) : (
                payrollRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-700 whitespace-nowrap">
                      {formatDateDisplay(r.date)}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-600 whitespace-nowrap hidden md:table-cell">
                      {r.period}
                    </td>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900 whitespace-nowrap">
                      {r.employeeName}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-700 tabular-nums">
                      {formatPHP(r.basicSalary)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-700 tabular-nums hidden md:table-cell">
                      +{formatPHP(r.overtimePay + r.incentives + r.foodAllowance)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-rose-700 tabular-nums">
                      -{formatPHP(r.deductions)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-indigo-800 tabular-nums text-sm">
                      {formatPHP(r.netSalary)}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-600 whitespace-nowrap hidden md:table-cell">
                      {getMethodName(r.paymentMethodId)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROCESS PAYROLL MODAL */}
      <PayrollModal isOpen={isPayrollModalOpen} onClose={() => setIsPayrollModalOpen(false)} />

      {/* ADD EMPLOYEE MODAL */}
      {showAddEmpModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 my-auto animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              Add New Staff / Technician
            </h3>
            <form onSubmit={handleCreateEmployee} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="e.g. Arnel Santos"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Position / Role
                </label>
                <select
                  value={newEmpRole}
                  onChange={(e) => setNewEmpRole(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Senior Technician">Senior Technician</option>
                  <option value="Aircon Technician">Aircon Technician</option>
                  <option value="Washing Machine Tech">Washing Machine Tech</option>
                  <option value="Driver / Logistics">Driver / Logistics</option>
                  <option value="Administrative Staff">Administrative Staff</option>
                  <option value="HR / Auditing Team">HR / Auditing Team</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Daily Rate (₱)
                </label>
                <input
                  type="number"
                  step="any"
                  value={newEmpRate}
                  onChange={(e) => setNewEmpRate(e.target.value)}
                  placeholder="650"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={newEmpContact}
                  onChange={(e) => setNewEmpContact(e.target.value)}
                  placeholder="0917-XXX-XXXX"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
