import React, { useState, useEffect } from 'react';
import { X, Users, Calculator } from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP, parseNumber } from '../../utils/currency';
import { getTodayDateString } from '../../utils/date';
import { Employee, PayrollRecord } from '../../types';

interface PayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  editRecord?: PayrollRecord | null;
}

export const PayrollModal: React.FC<PayrollModalProps> = ({ isOpen, onClose, editRecord }) => {
  const { employees, paymentMethods, processPayroll, updatePayroll } = useAccounting();

  const [date, setDate] = useState(getTodayDateString());
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [period, setPeriod] = useState('Semi-monthly (Sep 1-15, 2026)');

  const [daysWorked, setDaysWorked] = useState('6');
  const [baseRate, setBaseRate] = useState('');
  const [foodRate, setFoodRate] = useState('0');
  const [overtimePay, setOvertimePay] = useState('0');
  const [incentives, setIncentives] = useState('0');
  const [coop, setCoop] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id || 'pm-1');
  const [notes, setNotes] = useState('');

  // Auto-fill base rate from selected employee's daily rate (create mode only)
  useEffect(() => {
    if (editRecord) return;
    const selected = employees.find((e) => e.id === employeeId);
    if (selected) {
      const rate = selected.dailyRate || (selected.basicSalary || 8500) / 6;
      setBaseRate(String(Math.round(rate * 100) / 100));
    }
  }, [employeeId, employees, editRecord]);

  // Seed form when editing an existing voucher
  useEffect(() => {
    if (!editRecord) return;
    const days = Number(editRecord.daysWorked) > 0 ? Number(editRecord.daysWorked) : 6;
    const seedRate = editRecord.dailyRate
      ? Number(editRecord.dailyRate)
      : Math.round(((editRecord.basicSalary || 0) / days) * 100) / 100;
    const seedFoodRate = editRecord.foodRate
      ? Number(editRecord.foodRate)
      : Math.round(((editRecord.foodAllowance || 0) / days) * 100) / 100;
    setDate(editRecord.date || getTodayDateString());
    setEmployeeId(editRecord.employeeId || '');
    setPeriod(editRecord.period || '');
    setDaysWorked(String(days));
    setBaseRate(String(seedRate));
    setFoodRate(String(seedFoodRate));
    setOvertimePay(String(editRecord.overtimePay ?? 0));
    setIncentives(String(editRecord.incentives ?? 0));
    setCoop(String(editRecord.coop ?? 0));
    setDeductions(String(editRecord.deductions ?? 0));
    setPaymentMethodId(editRecord.paymentMethodId || 'pm-1');
    setNotes(editRecord.notes || '');
  }, [editRecord]);

  if (!isOpen) return null;

  const parsedDays = Math.max(0, parseNumber(daysWorked));
  const parsedRate = parseNumber(baseRate);
  const parsedFoodRate = parseNumber(foodRate);
  const parsedOT = parseNumber(overtimePay);
  const parsedInc = parseNumber(incentives);
  const parsedCoop = parseNumber(coop);
  const parsedDeduc = parseNumber(deductions);

  // Formulas (Section 6)
  // Base Total = Base Rate (₱/day) × Days Worked
  const totalBase = parsedRate * parsedDays;
  // Food Allowance = Food Rate (₱/day) × Days Worked
  const totalFood = parsedFoodRate * parsedDays;
  // Gross Salary = Base Total + Overtime + Incentives + Food Total + Coop
  const grossSalary = totalBase + parsedOT + parsedInc + totalFood + parsedCoop;
  // Net Salary = Gross Salary - Deductions
  const netSalary = Math.max(0, grossSalary - parsedDeduc);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === employeeId);
    if (!emp || parsedDays <= 0 || netSalary <= 0) {
      alert('Please select an employee, enter days worked (1 or more), and valid salary details.');
      return;
    }

    const payload = {
      employeeId: emp.id,
      employeeName: emp.name,
      date,
      period,
      daysWorked: parsedDays,
      dailyRate: parsedRate,
      foodRate: parsedFoodRate,
      basicSalary: totalBase,
      overtimePay: parsedOT,
      incentives: parsedInc,
      coop: parsedCoop,
      foodAllowance: totalFood,
      deductions: parsedDeduc,
      grossSalary,
      netSalary,
      paymentMethodId,
      notes: notes.trim(),
    };

    if (editRecord) {
      updatePayroll(editRecord.id, payload);
    } else {
      processPayroll(payload);
    }

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
                {editRecord ? 'Update Wage & Payroll Voucher' : 'Process Employee Wage & Payroll'}
              </h2>
              <p className="text-xs text-slate-500">
                {editRecord
                  ? 'Re-syncs the linked SALARY expense entry in the General Ledger'
                  : 'Auto-generates SALARY expense entry in the General Ledger'}
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
                  Days Worked <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={daysWorked}
                  onChange={(e) => setDaysWorked(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Base Rate (₱/day) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                  required
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  × {parsedDays || 0} d = {formatPHP(totalBase)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Food Allowance (₱/day)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={foodRate}
                  onChange={(e) => setFoodRate(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  × {parsedDays || 0} d = {formatPHP(totalFood)}
                </span>
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
                  Coop (₱)
                </label>
                <input
                  type="number"
                  step="any"
                  value={coop}
                  onChange={(e) => setCoop(e.target.value)}
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
                <span>Base: {formatPHP(parsedRate)} × {parsedDays || 0} days</span>
                <span>{formatPHP(totalBase)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Food: {formatPHP(parsedFoodRate)} × {parsedDays || 0} days</span>
                <span>{formatPHP(totalFood)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Coop:</span>
                <span>+{formatPHP(parsedCoop)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Gross (Base + OT + Inc + Food + Coop):</span>
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
              {editRecord ? 'Update Voucher (₱)' : 'Process & Post Payroll (₱)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
