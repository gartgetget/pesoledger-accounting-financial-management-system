import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Printer,
  FileSpreadsheet,
  Wallet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { PayrollRecord } from '../../types';
import { formatPHP } from '../../utils/currency';
import { resolveEmployeeBaseRate } from '../../utils/payroll';
import {
  formatDateDisplayWithWeekday,
  getWeekStartForDate,
  addDaysToDateString,
} from '../../utils/date';
import { exportToExcel } from '../../utils/excel';

export interface PayrollCalcLine {
  paymentDate: string;
  days: number;
  dailyRate: number;
  basePay: number;
  overtime: number;
  incentives: number;
  food: number;
  coop: number;
  deductions: number;
  voucherGross: number;
}

export interface MergedPayrollRow {
  employeeId: string;
  employeeName: string;
  areasText: string;
  dates: string[];
  datesText: string;
  periodsText: string;
  paymentCount: number;
  paymentMethodsText: string;
  notesText: string;
  daysWorked: number;
  basicSalary: number;
  overtimePay: number;
  incentives: number;
  coop: number;
  foodAllowance: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  lines: PayrollCalcLine[];
}

export const mergeWeekRecords = (
  weekRecords: PayrollRecord[],
  nameOfMethod?: (id: string) => string,
  profileRate?: (employeeId: string, employeeName: string) => number
): MergedPayrollRow[] => {
  const map = new Map<string, PayrollRecord[]>();
  weekRecords.forEach((r) => {
    const key = r.employeeId || r.employeeName.trim().toLowerCase();
    const list = map.get(key);
    if (list) list.push(r);
    else map.set(key, [r]);
  });
  // Recomputed from raw inputs, mirroring the Process Payroll modal formula:
  // Base = daily rate × days worked; Food = food rate × days worked;
  // Gross = Base + OT + Incentives + Food + Coop;
  // Net is clamped ONCE per person per week: max(0, Σgross − Σdeductions) —
  // never per voucher, so deductions spanning multiple vouchers reconcile.
  // Rate priority per voucher: stored dailyRate → employee profile rate
  // (looked up by id, then normalized name) → stored Basic Salary lump.
  const recompute = (r: PayrollRecord) => {
    const days = r.daysWorked || 0;
    const effectiveRate =
      r.dailyRate && r.dailyRate > 0
        ? r.dailyRate
        : profileRate
          ? profileRate(r.employeeId, r.employeeName)
          : 0;
    const basePay =
      effectiveRate > 0 && days > 0 ? effectiveRate * days : r.basicSalary || 0;
    const foodPay =
      r.foodRate && r.foodRate > 0 && days > 0
        ? r.foodRate * days
        : r.foodAllowance || 0;
    const gross =
      basePay + (r.overtimePay || 0) + (r.incentives || 0) + foodPay + (r.coop || 0);
    return { basePay, foodPay, gross, effectiveRate };
  };
  return Array.from(map.values())
    .map((rows) => {
      rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const first = rows[0];
      const unique = (vals: (string | undefined)[]): string[] =>
        Array.from(
          new Set(
            vals
              .map((v) => (v || '').trim())
              .filter(Boolean)
          )
        );
      const dates = unique(rows.map((r) => String(r.date).slice(0, 10)));
      const areas = unique(rows.map((r) => r.area));
      const methodsNamed = unique(
        rows.map((r) => (nameOfMethod ? nameOfMethod(r.paymentMethodId) : r.paymentMethodId))
      );
      const periodText = unique(rows.map((r) => r.period)).join(' / ');
      const notesText = unique(rows.map((r) => r.notes)).join(' / ');
      const recomputed = rows.map(recompute);
      const weekGross = recomputed.reduce((s, c) => s + c.gross, 0);
      const weekDeductions = rows.reduce((s, r) => s + (r.deductions || 0), 0);
      const lines: PayrollCalcLine[] = rows.map((r, i) => ({
        paymentDate: String(r.date).slice(0, 10),
        days: r.daysWorked || 0,
        dailyRate:
          (r.daysWorked || 0) > 0 ? recomputed[i].effectiveRate : r.dailyRate || 0,
        basePay: recomputed[i].basePay,
        overtime: r.overtimePay || 0,
        incentives: r.incentives || 0,
        food: recomputed[i].foodPay,
        coop: r.coop || 0,
        deductions: r.deductions || 0,
        voucherGross: recomputed[i].gross,
      }));
      return {
        employeeId: first.employeeId,
        employeeName: first.employeeName.trim() || 'Unnamed',
        areasText: areas.join(' / ') || '',
        dates,
        datesText: dates.join(' + '),
        periodsText: periodText,
        paymentCount: rows.length,
        paymentMethodsText: methodsNamed.length > 1 ? 'Mixed' : (methodsNamed[0] || ''),
        notesText: notesText,
        daysWorked: rows.reduce((s, r) => s + (r.daysWorked || 0), 0),
        basicSalary: recomputed.reduce((s, c) => s + c.basePay, 0),
        overtimePay: rows.reduce((s, r) => s + (r.overtimePay || 0), 0),
        incentives: rows.reduce((s, r) => s + (r.incentives || 0), 0),
        coop: rows.reduce((s, r) => s + (r.coop || 0), 0),
        foodAllowance: recomputed.reduce((s, c) => s + c.foodPay, 0),
        deductions: weekDeductions,
        grossSalary: weekGross,
        netSalary: Math.max(0, weekGross - weekDeductions),
        lines,
      };
    })
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
};

export interface WeeklyPayrollGroup {
  weekStart: string;
  weekEnd: string;
  records: MergedPayrollRow[];
  employeeCount: number;
  paymentCount: number;
  totalDaysWorked: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
}

export const buildWeeklyPayrollGroups = (
  records: PayrollRecord[],
  nameOfMethod?: (id: string) => string,
  profileRate?: (employeeId: string, employeeName: string) => number
): WeeklyPayrollGroup[] => {
  const buckets = new Map<string, PayrollRecord[]>();
  records.forEach((r) => {
    const key = getWeekStartForDate(r.date);
    const list = buckets.get(key);
    if (list) list.push(r);
    else buckets.set(key, [r]);
  });
  return Array.from(buckets.entries())
    .map(([weekStart, weekRecords]) => {
      const merged = mergeWeekRecords(weekRecords, nameOfMethod, profileRate);
      const paymentCount = merged.reduce((s, r) => s + r.paymentCount, 0);
      return {
        weekStart,
        weekEnd: addDaysToDateString(weekStart, 6),
        records: merged,
        employeeCount: merged.length,
        paymentCount,
        totalDaysWorked: merged.reduce((s, r) => s + r.daysWorked, 0),
        totalGross: merged.reduce((s, r) => s + r.grossSalary, 0),
        totalDeductions: merged.reduce((s, r) => s + r.deductions, 0),
        totalNet: merged.reduce((s, r) => s + r.netSalary, 0),
      };
    })
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
};

export interface EmployeeTotalRow {
  employeeId: string;
  employeeName: string;
  payments: number;
  daysWorked: number;
  gross: number;
  deductions: number;
  net: number;
}

export const buildEmployeeTotals = (
  weeklyGroups: WeeklyPayrollGroup[]
): EmployeeTotalRow[] => {
  const map = new Map<string, EmployeeTotalRow>();
  weeklyGroups.forEach((g) => {
    g.records.forEach((r) => {
      const key = r.employeeId || r.employeeName.trim().toLowerCase();
      const current = map.get(key);
      if (current) {
        current.payments += r.paymentCount;
        current.daysWorked += r.daysWorked;
        current.gross += r.grossSalary;
        current.deductions += r.deductions;
        current.net += r.netSalary;
      } else {
        map.set(key, {
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          payments: r.paymentCount,
          daysWorked: r.daysWorked,
          gross: r.grossSalary,
          deductions: r.deductions,
          net: r.netSalary,
        });
      }
    });
  });
  return Array.from(map.values()).sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName)
  );
};

export const WeeklyPayrollReport: React.FC = () => {
  const { payrollRecords, employees, paymentMethods, dateRange, companySettings } =
    useAccounting();

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedTotals, setExpandedTotals] = useState<Set<string>>(new Set());

  const rowKey = (r: MergedPayrollRow) =>
    r.employeeId || r.employeeName.trim().toLowerCase();

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleTotal = (key: string) => {
    setExpandedTotals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getMethodName = (pmId: string) => {
    const found = paymentMethods.find((p) => p.id === pmId);
    return found ? found.name : pmId;
  };

  const calcFormulaLine = (r: MergedPayrollRow): string => {
    const addParts: string[] = [`${formatPHP(r.basicSalary)} base`];
    if (r.overtimePay) addParts.push(`${formatPHP(r.overtimePay)} OT`);
    if (r.incentives) addParts.push(`${formatPHP(r.incentives)} inc.`);
    if (r.foodAllowance) addParts.push(`${formatPHP(r.foodAllowance)} food`);
    if (r.coop) addParts.push(`${formatPHP(r.coop)} coop`);
    let line = `${addParts.join(' + ')} = ${formatPHP(r.grossSalary)} gross`;
    line +=
      r.deductions > 0
        ? ` − ${formatPHP(r.deductions)} deductions = ${formatPHP(r.netSalary)} net`
        : ` = ${formatPHP(r.netSalary)} net`;
    if (r.deductions > r.grossSalary) line += ' (capped at ₱0)';
    return line;
  };

  const weeklyGroups = useMemo(
    () =>
      buildWeeklyPayrollGroups(
        payrollRecords,
        getMethodName,
        (id, name) => resolveEmployeeBaseRate(employees, id, name)
      ),
    [payrollRecords, paymentMethods, employees]
  );

  const grandTotals = useMemo(
    () =>
      weeklyGroups.reduce(
        (acc, g) => ({
          employees: acc.employees + g.employeeCount,
          payments: acc.payments + g.paymentCount,
          days: acc.days + g.totalDaysWorked,
          gross: acc.gross + g.totalGross,
          deductions: acc.deductions + g.totalDeductions,
          net: acc.net + g.totalNet,
        }),
        { employees: 0, payments: 0, days: 0, gross: 0, deductions: 0, net: 0 }
      ),
    [weeklyGroups]
  );

  const employeeTotals = useMemo(
    () => buildEmployeeTotals(weeklyGroups),
    [weeklyGroups]
  );

  const employeeTotalsMap = useMemo(() => {
    const m = new Map<string, EmployeeTotalRow>();
    employeeTotals.forEach((e) =>
      m.set(e.employeeId || e.employeeName.trim().toLowerCase(), e)
    );
    return m;
  }, [employeeTotals]);

  const employeeWeeksMap = useMemo(() => {
    const m = new Map<
      string,
      { weekStart: string; weekEnd: string; gross: number; deductions: number; net: number }[]
    >();
    weeklyGroups.forEach((g) => {
      g.records.forEach((r) => {
        const key = rowKey(r);
        const list = m.get(key) || [];
        list.push({
          weekStart: g.weekStart,
          weekEnd: g.weekEnd,
          gross: r.grossSalary,
          deductions: r.deductions,
          net: r.netSalary,
        });
        m.set(key, list);
      });
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyGroups]);

  const employeeTotalsSum = useMemo(
    () =>
      employeeTotals.reduce(
        (acc, e) => ({
          payments: acc.payments + e.payments,
          days: acc.days + e.daysWorked,
          gross: acc.gross + e.gross,
          deductions: acc.deductions + e.deductions,
          net: acc.net + e.net,
        }),
        { payments: 0, days: 0, gross: 0, deductions: 0, net: 0 }
      ),
    [employeeTotals]
  );

  const handleExportExcel = () => {
    const summaryData = weeklyGroups.map((g) => ({
      'Week Start': g.weekStart,
      'Week End': g.weekEnd,
      'People Paid': g.employeeCount,
      'Payments': g.paymentCount,
      'Days Worked': g.totalDaysWorked,
      'Gross Payroll (PHP)': g.totalGross,
      'Deductions (PHP)': g.totalDeductions,
      'Net Paid (PHP)': g.totalNet,
    }));
    summaryData.push({
      'Week Start': 'TOTAL',
      'Week End': '',
      'People Paid': grandTotals.employees,
      'Payments': grandTotals.payments,
      'Days Worked': grandTotals.days,
      'Gross Payroll (PHP)': grandTotals.gross,
      'Deductions (PHP)': grandTotals.deductions,
      'Net Paid (PHP)': grandTotals.net,
    });

    const detailData: Record<string, string | number>[] = [];
    weeklyGroups.forEach((g) => {
      g.records.forEach((r) => {
        detailData.push({
          'Week Start': g.weekStart,
          'Week End': g.weekEnd,
          'Payment Dates': r.datesText,
          'Period': r.periodsText,
          'Employee': r.employeeName,
          'Area': r.areasText,
          'Payments (count)': r.paymentCount,
          'Days Worked': r.daysWorked || '',
          'Basic Salary': r.basicSalary,
          'Overtime': r.overtimePay,
          'Incentives': r.incentives,
          'Coop': r.coop,
          'Food Allowance': r.foodAllowance,
          'Deductions': r.deductions,
          'Gross Salary (PHP)': r.grossSalary,
          'Net Salary (PHP)': r.netSalary,
          'Payment Method': r.paymentMethodsText,
          'Notes': r.notesText,
        });
      });
    });

    const perEmployeeData: Record<string, string | number>[] = employeeTotals.map(
      (e) => ({
        'Employee': e.employeeName,
        'Payments (count)': e.payments,
        'Days Worked': e.daysWorked || '',
        'Gross Pay (PHP)': e.gross,
        'Deductions (PHP)': e.deductions,
        'Total Net Pay (PHP)': e.net,
      })
    );
    perEmployeeData.push({
      'Employee': 'TOTAL',
      'Payments (count)': employeeTotalsSum.payments,
      'Days Worked': employeeTotalsSum.days,
      'Gross Pay (PHP)': employeeTotalsSum.gross,
      'Deductions (PHP)': employeeTotalsSum.deductions,
      'Total Net Pay (PHP)': employeeTotalsSum.net,
    });

    const breakdownData: Record<string, string | number>[] = [];
    weeklyGroups.forEach((g) => {
      g.records.forEach((r) => {
        r.lines.forEach((l) => {
          breakdownData.push({
            'Week Start': g.weekStart,
            'Week End': g.weekEnd,
            'Employee': r.employeeName,
            'Pay Date': `${formatDateDisplayWithWeekday(l.paymentDate)}`,
            'Days Worked': l.days || '',
            'Daily Rate (PHP)': l.days > 0 && l.dailyRate > 0 ? l.dailyRate : '',
            'Base = Days x Rate (PHP)': l.basePay,
            'Overtime (PHP)': l.overtime,
            'Incentives (PHP)': l.incentives,
            'Food (PHP)': l.food,
            'Coop (PHP)': l.coop,
            'Voucher Gross (PHP)': l.voucherGross,
            'Deductions (PHP)': l.deductions,
            'Calc Step': 'voucher (gross before deductions)',
          });
        });
        breakdownData.push({
          'Week Start': g.weekStart,
          'Week End': g.weekEnd,
          'Employee': r.employeeName,
          'Pay Date': 'WEEK NET',
          'Days Worked': r.daysWorked || '',
          'Base = Days x Rate (PHP)': r.basicSalary,
          'Overtime (PHP)': r.overtimePay,
          'Incentives (PHP)': r.incentives,
          'Food (PHP)': r.foodAllowance,
          'Coop (PHP)': r.coop,
          'Voucher Gross (PHP)': r.grossSalary,
          'Deductions (PHP)': r.deductions,
          'Week Net (PHP)': r.netSalary,
          'Calc Step': `max(0, ${formatPHP(r.grossSalary)} - ${formatPHP(r.deductions)}) = ${formatPHP(r.netSalary)}`,
        });
      });
    });

    exportToExcel(
      [
        { sheetName: 'Weekly Summary', data: summaryData },
        { sheetName: 'Payroll Detail', data: detailData },
        { sheetName: 'Per-Employee Totals', data: perEmployeeData },
        { sheetName: 'Calculation Breakdown', data: breakdownData },
      ],
      `Weekly_Payroll_Report_${dateRange.startDate}_to_${dateRange.endDate}`
    );
  };

  return (
    <div className="space-y-4">
      {/* Report Controls (hidden on print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Weekly Payroll &amp; Wages Summary
            </h2>
            <p className="text-[11px] text-slate-500">
              Weekly pay-per-person totals grouped from payment dates (Thu–Wed)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Weekly Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {weeklyGroups.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-10 text-center text-xs text-slate-400 print:hidden">
          No payroll disbursements in the selected date range. Adjust the date
          filter above or process payroll vouchers to generate weekly totals.
        </div>
      ) : (
        <>
          {/* Week Blocks */}
          {weeklyGroups.map((group) => (
            <div
              key={group.weekStart}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:border-0 print:shadow-none print:rounded-none print:break-inside-avoid"
            >
              {/* Week header (letterhead) */}
              <div className="px-5 sm:px-8 pt-5 pb-3 border-b border-slate-200">
                <div className="text-center">
                  <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-900">
                    {companySettings.name}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {companySettings.address} · TIN: {companySettings.tin}
                  </p>
                  <p className="text-xs font-bold text-slate-800 mt-3">
                    WEEKLY PAYROLL &amp; WAGES REPORT
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Pay Week: {formatDateDisplayWithWeekday(group.weekStart)} –{' '}
                    {formatDateDisplayWithWeekday(group.weekEnd)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                    {group.employeeCount}{' '}
                    {group.employeeCount === 1 ? 'Person' : 'People'} Paid
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    {group.paymentCount}{' '}
                    {group.paymentCount === 1 ? 'Payment' : 'Payments'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    {group.totalDaysWorked} Days Worked
                  </span>
                </div>
              </div>

              {/* Per-person pay table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 ml-0">Dates</th>
                      <th className="py-2 px-3">Employee</th>
                      <th className="py-2 px-3">Area</th>
                      <th className="py-2 px-3 hidden md:table-cell">Period</th>
                      <th className="py-2 px-3 text-right">Days</th>
                      <th className="py-2 px-3 text-right">Basic</th>
                      <th className="py-2 px-3 text-right hidden md:table-cell">OT</th>
                      <th className="py-2 px-3 text-right hidden md:table-cell">Inc.</th>
                      <th className="py-2 px-3 text-right hidden md:table-cell">Food</th>
                      <th className="py-2 px-3 text-right hidden md:table-cell">Coop</th>
                      <th className="py-2 px-3 text-right">Deduct.</th>
                      <th className="py-2 px-3 text-right">Gross</th>
                      <th className="py-2 px-3 text-right">Net</th>
                      <th className="py-2 px-3 text-right border-l border-slate-200">Total Pay (All Weeks)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {group.records.map((r) => {
                      const expandKey = `${group.weekStart}|${rowKey(r)}`;
                      const isExpanded = expandedRows.has(expandKey);
                      const hasInternalClamp = r.lines.some(
                        (l) => l.deductions > l.voucherGross
                      );
                      return (
                      <React.Fragment key={r.employeeId || r.employeeName}>
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-sans text-slate-600 whitespace-nowrap">
                          {formatDateDisplayWithWeekday(r.dates[0])}
                          {r.paymentCount > 1 && (
                            <span className="ml-1.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 whitespace-nowrap">
                              +{r.paymentCount - 1} payment
                              {r.paymentCount - 1 === 1 ? '' : 's'}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-sans font-bold text-slate-900 whitespace-nowrap">
                          <button
                            onClick={() => toggleRow(expandKey)}
                            className="inline-flex items-center gap-1 hover:text-indigo-700 cursor-pointer print:static print:text-slate-900"
                            title={isExpanded ? 'Hide calculation' : 'Show calculation'}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 shrink-0" />
                            ) : (
                              <ChevronDown className="w-3 h-3 shrink-0" />
                            )}
                            <span>
                              {r.employeeName}
                            </span>
                          </button>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600 whitespace-nowrap">
                          {r.areasText || '—'}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-500 hidden md:table-cell truncate max-w-[140px]">
                          {r.periodsText || '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500 tabular-nums">
                          {r.daysWorked || '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700 tabular-nums">
                          {formatPHP(r.basicSalary)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-700 tabular-nums hidden md:table-cell">
                          {r.overtimePay ? formatPHP(r.overtimePay) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-700 tabular-nums hidden md:table-cell">
                          {r.incentives ? formatPHP(r.incentives) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-700 tabular-nums hidden md:table-cell">
                          {r.foodAllowance ? formatPHP(r.foodAllowance) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-700 tabular-nums hidden md:table-cell">
                          {r.coop ? formatPHP(r.coop) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-rose-700 tabular-nums">
                          {r.deductions ? `-${formatPHP(r.deductions)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700 tabular-nums">
                          {formatPHP(r.grossSalary)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-indigo-800 tabular-nums">
                          {formatPHP(r.netSalary)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums border-l border-slate-200">
                          {formatPHP(
                            employeeTotalsMap.get(
                              r.employeeId || r.employeeName.trim().toLowerCase()
                            )?.net ?? 0
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td
                            colSpan={14}
                            className="px-3 pb-3"
                          >
                            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Calculation Breakdown — {r.paymentCount}{' '}
                                {r.paymentCount === 1 ? 'payment' : 'payments'}
                              </p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-[11px] text-left">
                                  <thead className="text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                                    <tr>
                                      <th className="py-1 px-2">Pay Date</th>
                                      <th className="py-1 px-2 text-right">Days</th>
                                      <th className="py-1 px-2 text-right">Daily Rate</th>
                                      <th className="py-1 px-2 text-right">Base = Days × Rate</th>
                                      <th className="py-1 px-2 text-right">OT</th>
                                      <th className="py-1 px-2 text-right">Inc.</th>
                                      <th className="py-1 px-2 text-right">Food</th>
                                      <th className="py-1 px-2 text-right">Coop</th>
                                      <th className="py-1 px-2 text-right">Deduct.</th>
                                      <th className="py-1 px-2 text-right">Voucher Gross</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-mono">
                                    {r.lines.map((l, li) => (
                                      <tr key={li} className="text-slate-700">
                                        <td className="py-1 px-2 font-sans whitespace-nowrap">
                                          {formatDateDisplayWithWeekday(l.paymentDate)}
                                        </td>
                                        <td className="py-1 px-2 text-right tabular-nums">
                                          {l.days || '—'}
                                        </td>
                                        <td className="py-1 px-2 text-right tabular-nums">
                                          {l.days > 0 && l.dailyRate > 0
                                            ? formatPHP(l.dailyRate)
                                            : '—'}
                                        </td>
                                        <td className="py-1 px-2 text-right tabular-nums">
                                          {l.days > 0 && l.dailyRate > 0
                                            ? `${formatPHP(l.dailyRate)} × ${l.days} = ${formatPHP(l.basePay)}`
                                            : formatPHP(l.basePay)}
                                        </td>
                                        <td className="py-1 px-2 text-right tabular-nums">
                                          {l.overtime ? formatPHP(l.overtime) : '—'}
                                        </td>
                                        <td className="py-1 px-2 text-right tabular-nums">
                                          {l.incentives ? formatPHP(l.incentives) : '—'}
                                        </td>
                                        <td className="py-1 px-2 text-right tabular-nums">
                                          {l.food ? formatPHP(l.food) : '—'}
                                        </td>
                                        <td className="py-1 px-2 text-right tabular-nums">
                                          {l.coop ? formatPHP(l.coop) : '—'}
                                        </td>
                                        <td className="py-1 px-2 text-right tabular-nums text-rose-700">
                                          {l.deductions ? `-${formatPHP(l.deductions)}` : '—'}
                                        </td>
                                        <td className="py-1 px-2 text-right tabular-nums font-semibold">
                                          {formatPHP(l.voucherGross)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <p className="text-[11px] font-mono text-slate-700 bg-slate-100 rounded px-2 py-1.5">
                                {calcFormulaLine(r)}
                              </p>
                              {hasInternalClamp && (
                                <p className="text-[10px] text-amber-700">
                                  Note: one or more vouchers carry deductions larger than
                                  their own gross pay. Net is clamped once for the whole
                                  week: max(₱0, {formatPHP(r.grossSalary)} −{' '}
                                  {formatPHP(r.deductions)}) = {formatPHP(r.netSalary)}.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-semibold border-t-2 border-slate-800">
                      <td
                        colSpan={4}
                        className="py-2.5 px-3 font-sans text-[11px] uppercase tracking-wider"
                      >
                        Week Total ({group.employeeCount}{' '}
                        {group.employeeCount === 1 ? 'person' : 'people'} ·{' '}
                        {group.paymentCount}{' '}
                        {group.paymentCount === 1 ? 'payment' : 'payments'})
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {group.totalDaysWorked}
                      </td>
                      <td colSpan={6} className="py-2.5 px-3"></td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {formatPHP(group.totalGross)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold">
                        {formatPHP(group.totalNet)}
                      </td>
                      <td className="py-2.5 px-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          {/* Per-Person Payroll Totals (All Weeks) */}
          {employeeTotals.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:border-0 print:shadow-none print:rounded-none print:break-inside-avoid">
              <div className="px-5 sm:px-8 pt-5 pb-3 border-b border-slate-200 text-center">
                <p className="text-xs font-bold text-slate-800">
                  PER-PERSON PAYROLL TOTALS (ALL WEEKS)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Total pay per employee across{' '}
                  {weeklyGroups.length}{' '}
                  {weeklyGroups.length === 1 ? 'week' : 'weeks'} ·{' '}
                  {employeeTotals.length}{' '}
                  {employeeTotals.length === 1 ? 'person' : 'people'}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Employee</th>
                      <th className="py-2.5 px-4 text-right">Payments</th>
                      <th className="py-2.5 px-4 text-right">Days Worked</th>
                      <th className="py-2.5 px-4 text-right">Gross Pay</th>
                      <th className="py-2.5 px-4 text-right">Deductions</th>
                      <th className="py-2.5 px-4 text-right">Total Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {employeeTotals.map((e) => {
                      const totKey = e.employeeId || e.employeeName.trim().toLowerCase();
                      const isExpanded = expandedTotals.has(totKey);
                      const weeks = employeeWeeksMap.get(totKey) || [];
                      return (
                      <React.Fragment key={e.employeeId || e.employeeName}>
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-sans font-bold text-slate-900 whitespace-nowrap">
                          <button
                            onClick={() => toggleTotal(totKey)}
                            className="inline-flex items-center gap-1 hover:text-indigo-700 cursor-pointer print:static print:text-slate-900"
                            title={isExpanded ? 'Hide week-by-week math' : 'Show week-by-week math'}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 shrink-0" />
                            ) : (
                              <ChevronDown className="w-3 h-3 shrink-0" />
                            )}
                            <span>
                              {e.employeeName}
                            </span>
                          </button>
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-500 tabular-nums">
                          {e.payments}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-500 tabular-nums">
                          {e.daysWorked || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-700 tabular-nums">
                          {formatPHP(e.gross)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-rose-700 tabular-nums">
                          {e.deductions
                            ? `-${formatPHP(e.deductions)}`
                            : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-indigo-800 tabular-nums text-sm">
                          {formatPHP(e.net)}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={6} className="px-4 pb-3">
                            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Week-by-Week Math — {weeks.length}{' '}
                                {weeks.length === 1 ? 'week' : 'weeks'}
                              </p>
                              <div className="space-y-1">
                                {weeks.map((w) => (
                                  <p
                                    key={w.weekStart}
                                    className="text-[11px] font-mono text-slate-700 flex flex-wrap justify-between gap-x-3 bg-slate-50 rounded px-2 py-1"
                                  >
                                    <span className="font-sans text-slate-600">
                                      {formatDateDisplayWithWeekday(w.weekStart)} –{' '}
                                      {formatDateDisplayWithWeekday(w.weekEnd)}
                                    </span>
                                    <span className="tabular-nums">
                                      {formatPHP(w.gross)} − {formatPHP(w.deductions)} ={' '}
                                      <span className="font-bold text-indigo-800">
                                        {formatPHP(w.net)}
                                      </span>
                                    </span>
                                  </p>
                                ))}
                              </div>
                              <p className="text-[11px] font-mono text-slate-700 bg-slate-100 rounded px-2 py-1.5">
                                Running total:{' '}
                                {weeks
                                  .map((w) => formatPHP(w.net))
                                  .join(' + ') || '—'}{' '}
                                = <span className="font-bold text-indigo-800">
                                  {formatPHP(e.net)}
                                </span>
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-semibold border-t-2 border-slate-800">
                      <td className="py-2.5 px-4 font-sans text-[11px] uppercase tracking-wider">
                        TOTAL ({employeeTotals.length}{' '}
                        {employeeTotals.length === 1 ? 'person' : 'people'})
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        {employeeTotalsSum.payments}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        {employeeTotalsSum.days}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        {formatPHP(employeeTotalsSum.gross)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        {formatPHP(employeeTotalsSum.deductions)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-bold">
                        {formatPHP(employeeTotalsSum.net)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Grand Totals Block */}
          <div className="bg-slate-900 rounded-xl p-5 sm:p-8 text-white print:break-inside-avoid">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">
                  All Weeks Combined Totals
                </h2>
                <p className="text-[11px] text-slate-300">
                  {weeklyGroups.length}{' '}
                  {weeklyGroups.length === 1 ? 'week' : 'weeks'} ·{' '}
                  {grandTotals.payments}{' '}
                  {grandTotals.payments === 1 ? 'payment' : 'payments'} ·{' '}
                  {grandTotals.days} days worked
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Gross Payroll
                </p>
                <p className="font-mono text-base font-bold mt-0.5 tabular-nums">
                  {formatPHP(grandTotals.gross)}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Deductions
                </p>
                <p className="font-mono text-base font-bold mt-0.5 tabular-nums text-rose-300">
                  -{formatPHP(grandTotals.deductions)}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Net Cash Disbursed
                </p>
                <p className="font-mono text-base font-bold mt-0.5 tabular-nums text-emerald-300">
                  {formatPHP(grandTotals.net)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
