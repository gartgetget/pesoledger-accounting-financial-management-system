import React, { useState, useEffect } from 'react';
import { X, Users, Calculator } from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP, parseNumber } from '../../utils/currency';
import { getTodayDateString } from '../../utils/date';
import { Employee } from '../../types';

interface PayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PayrollModal: React.FC<PayrollModalProps> = ({ isOpen, onClose }) => {
  const { employees, paymentMethods, processPayroll } = useAccounting();

  const [date, setDate] = useState(getTodayDateString());
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [period, setPeriod] = useState('Semi-monthly (Sep 1-15, 2026)');

  const [basicSalary, setBasicSalary] = useState('');
  const [overtimePay, setOvertimePay] = useState('0');
  const [incentives, setIncentives] = useState('0');
  const [foodAllowance, setFoodAllowance] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id || 'pm-1');
  const [notes, setNotes] = useState('');

  // Auto-fill basic salary based on selected employee daily rate or basic salary
  useEffect(() => {
    const selected = employees.find((e) => e.id === employeeId);
    if (selected) {
      const base = selected.dailyRate ? selected.dailyRate * 13 : selected.basicSalary || 8500;
      setBasicSalary(String(base));
    }
  }, [employeeId, employees]);

  if (!isOpen) return null;

  const parsedBase = parseNumber(basicSalary);
  const parsedOT = parseNumber(overtimePay);
  const parsedInc = parseNumber(incentives);
  const parsedFood = parseNumber(foodAllowance);
  const parsedDeduc = parseNumber(deductions);

  // Formulas (Section 6)
  // Gross Salary = Basic Salary + Overtime + Incentives + Food Allowance
  const grossSalary = parsedBase + parsedOT + parsedInc + parsedFood;
  // Net Salary = Gross Salary - Deductions
  const netSalary = Math.max(0, grossSalary - parsedDeduc);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === employeeId);
    if (!emp || netSalary <= 0) {
      alert('Please select an employee and enter valid salary details.');
      return;
    }

    processPayroll({
      employeeId: emp.id,
      employeeName: emp.name,
      date,
      period,
      basicSalary: parsedBase,
      overtimePay: parsedOT,
      incentives: parsedInc,
      foodAllowance: parsedFood,
      deductions: parsedDeduc,
      grossSalary,
      netSalary,
      paymentMethodId,
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Process Employee Wage & Payroll
              </h2>
              <p className="text-xs text-slate-500">
                Auto-generates SALARY expense entry in the General Ledger
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
                Disbursement Date <span className="text-rose-500">*</span>
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
                Payroll Period
              </label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="e.g. Sep 1 - 15, 2026"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Employee / Technician <span className="text-rose-500">*</span>
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
              required
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.position} (Daily Rate: ₱{emp.dailyRate || 0})
                </option>
              ))}
            </select>
          </div>

          {/* SALARY COMPUTATION FORMULAS (CORE OBJECTIVE 6) */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-indigo-600" />
              Formula Calculations (Section 6)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Basic / Base Pay (₱) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Overtime Pay (₱)
                </label>
                <input
                  type="number"
                  step="any"
                  value={overtimePay}
                  onChange={(e) => setOvertimePay(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Incentives / Commission (₱)
                </label>
                <input
                  type="number"
                  step="any"
                  value={incentives}
                  onChange={(e) => setIncentives(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Food Allowance (₱)
                </label>
                <input
                  type="number"
                  step="any"
                  value={foodAllowance}
                  onChange={(e) => setFoodAllowance(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-rose-700 mb-1">
                Other Deductions / Cash Advance / SSS (₱)
              </label>
              <input
                type="number"
                step="any"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-rose-300 rounded-lg font-mono font-semibold text-rose-700"
              />
            </div>

            {/* Live Calculation Preview */}
            <div className="pt-2 border-t border-slate-200 text-xs font-mono space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Gross (Base + OT + Inc + Food):</span>
                <span>{formatPHP(grossSalary)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Deductions:</span>
                <span>-{formatPHP(parsedDeduc)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-200">
                <span>NET TAKE-HOME SALARY:</span>
                <span className="text-indigo-800">{formatPHP(netSalary)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disbursement Account <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                required
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
                Remarks / Voucher #
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Clean attendance bonus"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Process & Post Payroll (₱)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
