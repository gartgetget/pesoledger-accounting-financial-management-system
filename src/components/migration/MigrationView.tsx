import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Download,
  Database,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP } from '../../utils/currency';
import { inspectExcelFile, ImportInspectionResult, exportToExcel } from '../../utils/excel';

export const MigrationView: React.FC = () => {
  const {
    batchImportData,
    exportDatabaseJSON,
    importDatabaseJSON,
    resetToDefaultData,
    userRole,
  } = useAccounting();

  const [isLoading, setIsLoading] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<ImportInspectionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await inspectExcelFile(file);
      setInspectionResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to inspect Excel file. Please ensure it is a valid .xlsx or .csv.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!inspectionResult) return;

    try {
      batchImportData(inspectionResult);
      setSuccessMessage(
        `Successfully imported ${inspectionResult.totalRecords} records into the accounting database!`
      );
      setInspectionResult(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving imported data.');
    }
  };

  const handleDownloadSampleTemplate = () => {
    const sampleRevenue = [
      {
        'Date': '2026-09-22',
        'Invoice #': 'INV-2026-9001',
        'Customer Name': 'Ayala Alabang Residence',
        'Category': 'REF/AC',
        'Description': 'Carrier 2.5HP Inverter General Cleaning',
        'Gross Amount': 2500,
        'Discount': 0,
        'Net Amount': 2500,
        'Payment Method': 'BDO Unibank',
        'Technician': 'Eugene',
        'Notes': 'Paid in full via online bank transfer',
      },
      {
        'Date': '2026-09-22',
        'Invoice #': 'INV-2026-9002',
        'Customer Name': 'Sucat Parañaque Client',
        'Category': 'WM/TV',
        'Description': 'LG Front Load Washing Machine Error OE Drain Pump',
        'Gross Amount': 3200,
        'Discount': 200,
        'Net Amount': 3000,
        'Payment Method': 'GCash',
        'Technician': 'Jim',
        'Notes': 'Replaced drain pump assembly',
      },
    ];

    const sampleExpenses = [
      {
        'Date': '2026-09-22',
        'Category': 'GAS',
        'Description': 'Diesel fuel refill Hiace van NDB-4821 Shell Sucat',
        'Amount': 2000,
        'Payment Method': 'Cash',
        'Vendor / Supplier': 'Shell Sucat',
        'Person Responsible': 'Eugene',
        'Reference #': 'OR-99120',
        'Notes': 'Official gas receipt logged',
      },
      {
        'Date': '2026-09-22',
        'Category': 'SALARY',
        'Description': 'Weekly wage payout for field technicians',
        'Amount': 6500,
        'Payment Method': 'BDO Unibank',
        'Vendor / Supplier': '',
        'Person Responsible': 'Arnel',
        'Reference #': 'PAY-009',
        'Notes': 'Direct bank transfer',
      },
      {
        'Date': '2026-09-22',
        'Category': 'DAILY EXPENSES & SAVINGS',
        'Description': 'Drinking water refill 5 gallons and team lunch allowance',
        'Amount': 450,
        'Payment Method': 'Cash',
        'Vendor / Supplier': 'Aqua Pure',
        'Person Responsible': 'Staff',
        'Reference #': '',
        'Notes': 'Petty cash cash voucher',
      },
    ];

    const sampleParts = [
      {
        'Part Name': 'Dual Run Capacitor 45+5uF 450V',
        'Part Number': 'CAP-45-5',
        'Category': 'Capacitor',
        'Cost Price': 280,
        'Selling Price': 750,
        'Quantity': 15,
        'Min Stock Alert': 4,
        'Supplier': 'Quiapo Electro Supply',
      },
      {
        'Part Name': 'R410A Refrigerant Tank 11.3kg',
        'Part Number': 'FREON-410A',
        'Category': 'Refrigerant',
        'Cost Price': 3800,
        'Selling Price': 7200,
        'Quantity': 3,
        'Min Stock Alert': 1,
        'Supplier': 'Cooling Master Trading',
      },
    ];

    exportToExcel(
      [
        { sheetName: 'Collections & Revenue', data: sampleRevenue },
        { sheetName: 'Expenses & Disbursements', data: sampleExpenses },
        { sheetName: 'Parts & Inventory', data: sampleParts },
      ],
      'COMPUTATION_TEMPLATE_Standard'
    );
  };

  const handleJSONFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importDatabaseJSON(content);
        if (ok) {
          setSuccessMessage('Database successfully restored from JSON backup file.');
        } else {
          setErrorMessage('Invalid JSON backup file.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Excel Migration & Database Backup</h1>
            <p className="text-xs text-slate-500">
              Compatible with COMPUTATION TEMPLATE.xlsx & TEMPLATE.xlsx sheets
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadSampleTemplate}
          className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span>Download Standard Template .xlsx</span>
        </button>
      </div>

      {/* FEEDBACK BANNERS */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* UPLOAD DROP ZONE */}
      <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-emerald-500 transition-colors">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">
            Upload Existing Excel Workbook (.xlsx, .xls, .csv)
          </h2>
          <p className="text-xs text-slate-500">
            The intelligent parser detects Date, Amount, Particulars, Category, Payment Method, and Parts rows from your existing sheets.
          </p>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>Select Excel File to Inspect</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isLoading}
              />
            </label>
          </div>

          {isLoading && (
            <p className="text-xs text-slate-500 animate-pulse">Inspecting and mapping spreadsheet sheets...</p>
          )}
        </div>
      </div>

      {/* INSPECTION PREVIEW MODAL / SECTION (CORE OBJECTIVE 16) */}
      {inspectionResult && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-md p-6 space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                Spreadsheet Inspection Results
              </span>
              <h3 className="text-base font-bold text-slate-900">{inspectionResult.fileName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sheets found: {inspectionResult.sheetNames.join(', ')} · Total Records: <strong>{inspectionResult.totalRecords}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setInspectionResult(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Save to Database</span>
              </button>
            </div>
          </div>

          {/* INSPECTED METRICS PILL */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Detected Revenue</span>
              <p className="text-base font-bold font-mono text-emerald-900 tabular-nums">
                {formatPHP(inspectionResult.totalRevenueAmount)}
              </p>
              <span className="text-[11px] text-emerald-700">{inspectionResult.detectedRevenue.length} invoice rows</span>
            </div>

            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
              <span className="text-[10px] uppercase font-bold text-rose-800 block">Detected Expenses</span>
              <p className="text-base font-bold font-mono text-rose-900 tabular-nums">
                {formatPHP(inspectionResult.totalExpenseAmount)}
              </p>
              <span className="text-[11px] text-rose-700">{inspectionResult.detectedExpenses.length} expense rows</span>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Detected Parts</span>
              <p className="text-base font-bold font-mono text-amber-900 tabular-nums">
                {inspectionResult.detectedParts.length} Parts SKUs
              </p>
              <span className="text-[11px] text-amber-700">Inventory items</span>
            </div>
          </div>

          {/* Detected Categories List */}
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Detected Categories: </span>
            {inspectionResult.detectedCategories.map((c) => (
              <span key={c} className="inline-block px-2 py-0.5 m-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                {c}
              </span>
            ))}
          </div>

          {/* SAMPLE DETECTED REVENUE TABLE */}
          {inspectionResult.detectedRevenue.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-2.5 bg-slate-50 font-bold text-xs text-slate-800 border-b border-slate-200 flex items-center justify-between">
                <span>Revenue Preview (First 5 Rows)</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Showing {Math.min(5, inspectionResult.detectedRevenue.length)} of {inspectionResult.detectedRevenue.length}
                </span>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase">
                  <tr>
                    <th className="py-1.5 px-3">Date</th>
                    <th className="py-1.5 px-3">Invoice #</th>
                    <th className="py-1.5 px-3">Category</th>
                    <th className="py-1.5 px-3">Description</th>
                    <th className="py-1.5 px-3 text-right">Amount (₱)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inspectionResult.detectedRevenue.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-3">{r.date}</td>
                      <td className="py-1.5 px-3 font-semibold text-slate-800">{r.invoiceNumber}</td>
                      <td className="py-1.5 px-3 font-sans">{r.category}</td>
                      <td className="py-1.5 px-3 font-sans truncate max-w-xs">{r.description}</td>
                      <td className="py-1.5 px-3 text-right text-emerald-700 font-bold">{formatPHP(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* SAMPLE DETECTED EXPENSES TABLE */}
          {inspectionResult.detectedExpenses.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-2.5 bg-slate-50 font-bold text-xs text-slate-800 border-b border-slate-200 flex items-center justify-between">
                <span>Expenses Preview (First 5 Rows)</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Showing {Math.min(5, inspectionResult.detectedExpenses.length)} of {inspectionResult.detectedExpenses.length}
                </span>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase">
                  <tr>
                    <th className="py-1.5 px-3">Date</th>
                    <th className="py-1.5 px-3">Category</th>
                    <th className="py-1.5 px-3">Description</th>
                    <th className="py-1.5 px-3 text-right">Amount (₱)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inspectionResult.detectedExpenses.slice(0, 5).map((e, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-3">{e.date}</td>
                      <td className="py-1.5 px-3 font-sans font-semibold text-slate-800">{e.category}</td>
                      <td className="py-1.5 px-3 font-sans truncate max-w-xs">{e.description}</td>
                      <td className="py-1.5 px-3 text-right text-rose-700 font-bold">{formatPHP(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULL DATABASE BACKUP & RESTORE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-4 h-4 text-slate-700" />
            Complete Database Backup & Emergency Reset
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Export a full encrypted JSON archive of all transactions, customers, parts, and audit logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={exportDatabaseJSON}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Database JSON Backup</span>
          </button>

          <label className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Restore JSON Backup</span>
            <input type="file" accept=".json" onChange={handleJSONFileRestore} className="hidden" />
          </label>

          {userRole === 'admin' && (
            <button
              onClick={() => {
                if (window.confirm('Clear all database records and settings?')) {
                  resetToDefaultData();
                  setSuccessMessage('Database cleared successfully.');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold cursor-pointer ml-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Clear Database</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
