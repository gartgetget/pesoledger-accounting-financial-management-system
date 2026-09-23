import React, { useState } from 'react';
import {
  FileBarChart2,
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  TrendingUp,
  CreditCard,
  Building2,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP } from '../../utils/currency';
import { formatDateDisplay } from '../../utils/date';
import { exportToExcel, exportToCSV } from '../../utils/excel';

export const ReportsView: React.FC = () => {
  const {
    financialSummary,
    dateRange,
    companySettings,
    revenueTransactions,
    expenses,
    paymentMethods,
  } = useAccounting();

  const [activeReportTab, setActiveReportTab] = useState<'pnl' | 'categories' | 'payment_methods'>('pnl');

  // P&L CALCULATIONS (Section 15)
  // Revenue
  const totalRevenue = financialSummary.totalRevenue;
  // COGS: Parts used + direct technician salary
  const partsUsedCOGS = financialSummary.partsExpense;
  const technicianLaborCOGS = Math.round(financialSummary.salaryExpense * 0.7); // 70% of payroll is direct field technician labor
  const totalCOGS = partsUsedCOGS + technicianLaborCOGS;
  // Gross Profit = Revenue - COGS
  const grossProfit = totalRevenue - totalCOGS;

  // Operating Expenses
  const administrativePayroll = Math.max(0, financialSummary.salaryExpense - technicianLaborCOGS);
  const gasFuelExpense = financialSummary.gasExpense;
  const vehicleMaintenanceExpense = financialSummary.sasakyanExpense;
  const dailyPettyExpenses = financialSummary.dailyExpenses;
  const otherOpExpenses = financialSummary.otherExpenses;
  const totalOperatingExpenses = administrativePayroll + gasFuelExpense + vehicleMaintenanceExpense + dailyPettyExpenses + otherOpExpenses;

  // Net Income = Gross Profit - Operating Expenses
  const pnlNetIncome = grossProfit - totalOperatingExpenses;
  const grossMarginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';
  const netMarginPct = totalRevenue > 0 ? ((pnlNetIncome / totalRevenue) * 100).toFixed(1) : '0';

  const handlePrint = () => {
    window.print();
  };

  const handleExportPNLExcel = () => {
    const pnlData = [
      { 'Account / Line Item': 'REVENUE & COLLECTIONS', 'Amount (PHP)': totalRevenue },
      { 'Account / Line Item': '  Collections from Appliance Services', 'Amount (PHP)': totalRevenue },
      { 'Account / Line Item': 'TOTAL REVENUE', 'Amount (PHP)': totalRevenue },
      { 'Account / Line Item': '', 'Amount (PHP)': '' },
      { 'Account / Line Item': 'COST OF GOODS & DIRECT SERVICES (COGS)', 'Amount (PHP)': '' },
      { 'Account / Line Item': '  Parts Used in Repairs', 'Amount (PHP)': partsUsedCOGS },
      { 'Account / Line Item': '  Direct Field Technician Labor', 'Amount (PHP)': technicianLaborCOGS },
      { 'Account / Line Item': 'TOTAL COGS', 'Amount (PHP)': totalCOGS },
      { 'Account / Line Item': '', 'Amount (PHP)': '' },
      { 'Account / Line Item': 'GROSS PROFIT', 'Amount (PHP)': grossProfit },
      { 'Account / Line Item': '', 'Amount (PHP)': '' },
      { 'Account / Line Item': 'OPERATING EXPENSES (OPEX)', 'Amount (PHP)': '' },
      { 'Account / Line Item': '  Admin & Support Salaries', 'Amount (PHP)': administrativePayroll },
      { 'Account / Line Item': '  Gas & Fuel Disbursements', 'Amount (PHP)': gasFuelExpense },
      { 'Account / Line Item': '  Vehicle Fleet Maintenance (Sasakyan)', 'Amount (PHP)': vehicleMaintenanceExpense },
      { 'Account / Line Item': '  Daily Operational Expenses & Savings', 'Amount (PHP)': dailyPettyExpenses },
      { 'Account / Line Item': '  Shop Rent & Other Overheads', 'Amount (PHP)': otherOpExpenses },
      { 'Account / Line Item': 'TOTAL OPERATING EXPENSES', 'Amount (PHP)': totalOperatingExpenses },
      { 'Account / Line Item': '', 'Amount (PHP)': '' },
      { 'Account / Line Item': 'NET INCOME / NET PROFIT', 'Amount (PHP)': pnlNetIncome },
    ];
    exportToExcel([{ sheetName: 'Profit and Loss', data: pnlData }], `Profit_Loss_Statement_${dateRange.startDate}_to_${dateRange.endDate}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Print Controls (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <FileBarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Financial Reports & Profit & Loss Statement</h1>
            <p className="text-xs text-slate-500">
              Audited P&L, service category profit margins, and payment inflow analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPNLExcel}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Report</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Formal P&L</span>
          </button>
        </div>
      </div>

      {/* TABS SWITCHER (Hidden on Print) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold print:hidden">
        <button
          onClick={() => setActiveReportTab('pnl')}
          className={`px-3 py-1.5 rounded-lg cursor-pointer ${
            activeReportTab === 'pnl' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Profit & Loss Statement (P&L)
        </button>
        <button
          onClick={() => setActiveReportTab('categories')}
          className={`px-3 py-1.5 rounded-lg cursor-pointer ${
            activeReportTab === 'categories' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Category Margin Matrix
        </button>
        <button
          onClick={() => setActiveReportTab('payment_methods')}
          className={`px-3 py-1.5 rounded-lg cursor-pointer ${
            activeReportTab === 'payment_methods' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Payment Channels & Liquidity
        </button>
      </div>

      {/* REPORT 1: AUDITED PROFIT & LOSS STATEMENT */}
      {activeReportTab === 'pnl' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
          {/* Official Company Letterhead Header */}
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-base font-bold text-slate-900 tracking-tight uppercase">
              {companySettings.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{companySettings.address} · TIN: {companySettings.tin}</p>
            <h3 className="text-sm font-bold text-slate-800 mt-3 tracking-wider uppercase font-mono">
              STATEMENT OF PROFIT AND LOSS
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              For the Period: {formatDateDisplay(dateRange.startDate)} to {formatDateDisplay(dateRange.endDate)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">(All amounts stated in Philippine Peso ₱)</p>
          </div>

          {/* Statement Body */}
          <div className="space-y-5 text-xs font-mono">
            {/* 1. REVENUE */}
            <div>
              <div className="flex justify-between py-1.5 font-bold text-slate-900 border-b border-slate-300">
                <span className="font-sans uppercase">I. REVENUE / COLLECTIONS</span>
                <span></span>
              </div>
              <div className="divide-y divide-slate-100 pl-4 py-1">
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Gross Collections from Appliance Services & Repairs</span>
                  <span className="tabular-nums">{formatPHP(totalRevenue)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Direct Sales of Replacement Appliance Parts</span>
                  <span className="tabular-nums">₱0.00</span>
                </div>
              </div>
              <div className="flex justify-between py-1.5 font-bold text-slate-900 border-t border-slate-200 bg-slate-50 px-2">
                <span>TOTAL REVENUE</span>
                <span className="tabular-nums text-emerald-800">{formatPHP(totalRevenue)}</span>
              </div>
            </div>

            {/* 2. COGS */}
            <div>
              <div className="flex justify-between py-1.5 font-bold text-slate-900 border-b border-slate-300">
                <span className="font-sans uppercase">II. COST OF GOODS & DIRECT SERVICES (COGS)</span>
                <span></span>
              </div>
              <div className="divide-y divide-slate-100 pl-4 py-1">
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Parts & Consumables Used in Job Orders</span>
                  <span className="tabular-nums text-rose-700">{formatPHP(partsUsedCOGS)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Direct Technical Labor (Technicians & Helpers)</span>
                  <span className="tabular-nums text-rose-700">{formatPHP(technicianLaborCOGS)}</span>
                </div>
              </div>
              <div className="flex justify-between py-1.5 font-bold text-slate-900 border-t border-slate-200 bg-slate-50 px-2">
                <span>TOTAL COST OF GOODS SOLD</span>
                <span className="tabular-nums text-rose-800">{formatPHP(totalCOGS)}</span>
              </div>
            </div>

            {/* 3. GROSS PROFIT */}
            <div className="p-3 bg-emerald-50 rounded border border-emerald-200 flex justify-between font-bold text-slate-900 text-sm">
              <span className="font-sans">GROSS PROFIT (Margin: {grossMarginPct}%)</span>
              <span className="tabular-nums text-emerald-900">{formatPHP(grossProfit)}</span>
            </div>

            {/* 4. OPERATING EXPENSES */}
            <div>
              <div className="flex justify-between py-1.5 font-bold text-slate-900 border-b border-slate-300">
                <span className="font-sans uppercase">III. OPERATING EXPENDITURES (OPEX)</span>
                <span></span>
              </div>
              <div className="divide-y divide-slate-100 pl-4 py-1">
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Administrative & Support Personnel Salaries</span>
                  <span className="tabular-nums">{formatPHP(administrativePayroll)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Gas & Fuel Disbursements</span>
                  <span className="tabular-nums">{formatPHP(gasFuelExpense)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Vehicle Fleet Maintenance & Repairs (Sasakyan)</span>
                  <span className="tabular-nums">{formatPHP(vehicleMaintenanceExpense)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Daily Petty Operational Expenses & Provisions</span>
                  <span className="tabular-nums">{formatPHP(dailyPettyExpenses)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Shop Rent, Utilities & Other Business Deductions</span>
                  <span className="tabular-nums">{formatPHP(otherOpExpenses)}</span>
                </div>
              </div>
              <div className="flex justify-between py-1.5 font-bold text-slate-900 border-t border-slate-200 bg-slate-50 px-2">
                <span>TOTAL OPERATING EXPENSES</span>
                <span className="tabular-nums text-rose-800">{formatPHP(totalOperatingExpenses)}</span>
              </div>
            </div>

            {/* 5. NET INCOME */}
            <div className="p-4 bg-slate-900 text-white rounded-lg flex justify-between items-center text-sm font-bold border-2 border-slate-800">
              <div>
                <span className="font-sans tracking-wide uppercase block">NET INCOME / PROFIT</span>
                <span className="text-[11px] font-sans text-slate-400 font-normal">
                  Net Profit Margin: {netMarginPct}%
                </span>
              </div>
              <span className={`text-lg tabular-nums ${pnlNetIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatPHP(pnlNetIncome)}
              </span>
            </div>
          </div>

          {/* Certification signature line */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
                Prepared By: Finance Officer
              </div>
              <p className="text-[10px] text-slate-400">Certified Transactional Ledger</p>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
                Approved By: Business Managing Owner
              </div>
              <p className="text-[10px] text-slate-400">Verified and Accepted</p>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: CATEGORY MARGIN MATRIX */}
      {activeReportTab === 'categories' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900">Service Category Financial Matrix</h2>
            <span className="text-[11px] text-slate-500">Period: {formatDateDisplay(dateRange.startDate)} to {formatDateDisplay(dateRange.endDate)}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 font-sans">
                <tr>
                  <th className="py-2.5 px-4">Category Name</th>
                  <th className="py-2.5 px-4 text-right">Inflow / Revenue</th>
                  <th className="py-2.5 px-4 text-right">Disbursements / Cost</th>
                  <th className="py-2.5 px-4 text-right">Net Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financialSummary.categoryBalances.map((cat, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-800">
                      {cat.category}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-700 tabular-nums">
                      {formatPHP(cat.revenue)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-rose-700 tabular-nums">
                      {formatPHP(cat.expenses)}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-bold tabular-nums ${cat.net >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                      {formatPHP(cat.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 3: PAYMENT CHANNELS & BALANCES */}
      {activeReportTab === 'payment_methods' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900">Payment Accounts & Cash-Flow Liquidity</h2>
            <span className="text-[11px] text-slate-500">Net inflow per payment channel</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 font-sans">
                <tr>
                  <th className="py-2.5 px-4">Payment Method / Account</th>
                  <th className="py-2.5 px-4 text-right">Total Inflow (Collections)</th>
                  <th className="py-2.5 px-4 text-right">Total Outflow (Disbursed)</th>
                  <th className="py-2.5 px-4 text-right">Net Account Balance Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financialSummary.paymentMethodBalances.map((pm) => (
                  <tr key={pm.methodId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-800">
                      {pm.methodName}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-700 tabular-nums">
                      {formatPHP(pm.revenue)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-rose-700 tabular-nums">
                      {formatPHP(pm.expenses)}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-bold tabular-nums ${pm.balance >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                      {formatPHP(pm.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
