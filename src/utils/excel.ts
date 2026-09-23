import * as XLSX from 'xlsx';
import {
  RevenueTransaction,
  Expense,
  Part,
  PayrollRecord,
  Customer,
} from '../types';

export interface ImportInspectionResult {
  fileName: string;
  sheetNames: string[];
  totalRecords: number;
  detectedRevenue: RevenueTransaction[];
  detectedExpenses: Expense[];
  detectedParts: Part[];
  detectedCategories: string[];
  detectedPaymentMethods: string[];
  detectedEmployees: string[];
  totalRevenueAmount: number;
  totalExpenseAmount: number;
  warnings: string[];
}

export const exportToExcel = (
  sheets: { sheetName: string; data: any[] }[],
  fileName: string
) => {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, data }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  });

  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const exportToCSV = (data: any[], fileName: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseExcelFile = async (
  file: File
): Promise<ImportInspectionResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const detectedRevenue: RevenueTransaction[] = [];
        const detectedExpenses: Expense[] = [];
        const detectedParts: Part[] = [];
        const categoriesSet = new Set<string>();
        const paymentMethodsSet = new Set<string>();
        const employeesSet = new Set<string>();
        const warnings: string[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          const ws = workbook.Sheets[sheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

          if (!rawRows || rawRows.length === 0) return;

          const sheetUpper = sheetName.toUpperCase();

          rawRows.forEach((row, idx) => {
            // Find common columns regardless of exact header casing
            const findCol = (possibleNames: string[]): any => {
              for (const key of Object.keys(row)) {
                const norm = key.trim().toLowerCase();
                for (const target of possibleNames) {
                  if (norm === target.toLowerCase() || norm.includes(target.toLowerCase())) {
                    return row[key];
                  }
                }
              }
              return '';
            };

            const rawDate = findCol(['date', 'petsa', 'trans date', 'invoice date']);
            const rawCategory = findCol(['category', 'kategorya', 'type', 'service category', 'expense category']) || 'GENERAL';
            const rawDescription = findCol(['description', 'details', 'particulars', 'remarks', 'service', 'job', 'item']) || 'Imported Entry';
            const rawAmount = findCol(['amount', 'halaga', 'total', 'net', 'price', 'cost']);
            const rawPaymentMethod = findCol(['payment method', 'payment', 'method', 'bank', 'mode']) || 'Cash';
            const rawCustomer = findCol(['customer', 'client', 'customer name', 'name']);
            const rawTechnician = findCol(['technician', 'employee', 'tech', 'person', 'staff', 'assigned']);
            const rawInvoice = findCol(['invoice', 'inv #', 'job #', 'ref #', 'reference', 'or #']) || `IMP-${Date.now().toString().slice(-4)}-${idx + 1}`;

            // Parse clean amount
            let amount = 0;
            if (typeof rawAmount === 'number') {
              amount = rawAmount;
            } else if (rawAmount) {
              const cleaned = String(rawAmount).replace(/[^0-9.-]/g, '');
              amount = parseFloat(cleaned) || 0;
            }

            if (amount <= 0 && !rawDescription) return;

            // Normalize Date
            let dateStr = new Date().toISOString().split('T')[0];
            if (rawDate instanceof Date) {
              dateStr = rawDate.toISOString().split('T')[0];
            } else if (typeof rawDate === 'string' && rawDate.trim()) {
              const d = new Date(rawDate);
              if (!isNaN(d.getTime())) {
                dateStr = d.toISOString().split('T')[0];
              }
            }

            // Detect if this sheet or row is an expense or revenue
            const isExpenseSheet =
              sheetUpper.includes('EXPENSE') ||
              sheetUpper.includes('GASTOS') ||
              sheetUpper.includes('SASAKYAN') ||
              sheetUpper.includes('GAS') ||
              sheetUpper.includes('SALARY') ||
              sheetUpper.includes('PETTY');

            const isRevenueSheet =
              sheetUpper.includes('COLLECTION') ||
              sheetUpper.includes('REVENUE') ||
              sheetUpper.includes('INCOME') ||
              sheetUpper.includes('SERVICE') ||
              sheetUpper.includes('SALES');

            const isPartsSheet =
              sheetUpper.includes('PART') ||
              sheetUpper.includes('OW') ||
              sheetUpper.includes('INVENTORY');

            if (isPartsSheet) {
              const partName = rawDescription || 'Spare Part';
              const partNum = findCol(['part number', 'part #', 'item code', 'code']) || `OW-IMP-${idx + 1}`;
              const costPrice = findCol(['cost', 'cost price', 'capital']) || amount;
              const sellPrice = findCol(['selling', 'selling price', 'srp', 'price']) || (Number(costPrice) * 1.5);
              const qty = Number(findCol(['qty', 'quantity', 'stock', 'inventory']) || 5);

              detectedParts.push({
                id: `imp-part-${Date.now()}-${idx}`,
                partNumber: String(partNum),
                name: String(partName),
                category: String(findCol(['category', 'type']) || 'Replacement Part'),
                description: String(rawDescription),
                supplier: String(findCol(['supplier', 'vendor']) || 'Direct Supplier'),
                standardPrice: Number(sellPrice),
                costPrice: Number(costPrice) || 100,
                sellingPrice: Number(sellPrice) || 150,
                quantity: isNaN(qty) ? 1 : qty,
                minimumStock: 2,
                dateAdded: dateStr,
              });
              return;
            }

            if (isExpenseSheet || (!isRevenueSheet && sheetUpper.includes('OUT'))) {
              const expCategory = String(rawCategory).toUpperCase();
              categoriesSet.add(expCategory);
              paymentMethodsSet.add(String(rawPaymentMethod));
              if (rawTechnician) employeesSet.add(String(rawTechnician));

              detectedExpenses.push({
                id: `imp-exp-${Date.now()}-${idx}`,
                date: dateStr,
                category: expCategory,
                description: String(rawDescription),
                amount: Math.abs(amount),
                paymentMethodId: String(rawPaymentMethod),
                vendorSupplier: String(findCol(['supplier', 'vendor', 'store']) || ''),
                employeeName: rawTechnician ? String(rawTechnician) : undefined,
                referenceNumber: String(rawInvoice),
                notes: `Imported from sheet: ${sheetName}`,
                relatedModule: expCategory.includes('GAS') || expCategory.includes('SASAKYAN')
                  ? 'vehicle'
                  : expCategory.includes('SALARY')
                  ? 'salary'
                  : 'general',
                createdAt: new Date().toISOString(),
              });
            } else {
              // Default to revenue
              const revCategory = String(rawCategory).toUpperCase();
              categoriesSet.add(revCategory);
              paymentMethodsSet.add(String(rawPaymentMethod));
              if (rawTechnician) employeesSet.add(String(rawTechnician));

              detectedRevenue.push({
                id: `imp-rev-${Date.now()}-${idx}`,
                date: dateStr,
                invoiceNumber: String(rawInvoice),
                customerName: String(rawCustomer || 'Walk-in Customer'),
                serviceType: String(rawDescription),
                category: revCategory,
                description: String(rawDescription),
                originalAmount: Math.abs(amount),
                discount: 0,
                amount: Math.abs(amount),
                paymentMethodId: String(rawPaymentMethod),
                employeeName: rawTechnician ? String(rawTechnician) : undefined,
                notes: `Imported from sheet: ${sheetName}`,
                createdAt: new Date().toISOString(),
              });
            }
          });
        });

        const totalRevenueAmount = detectedRevenue.reduce((s, r) => s + r.amount, 0);
        const totalExpenseAmount = detectedExpenses.reduce((s, e) => s + e.amount, 0);

        resolve({
          fileName: file.name,
          sheetNames: workbook.SheetNames,
          totalRecords: detectedRevenue.length + detectedExpenses.length + detectedParts.length,
          detectedRevenue,
          detectedExpenses,
          detectedParts,
          detectedCategories: Array.from(categoriesSet),
          detectedPaymentMethods: Array.from(paymentMethodsSet),
          detectedEmployees: Array.from(employeesSet),
          totalRevenueAmount,
          totalExpenseAmount,
          warnings,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse Excel workbook. Please check file format.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsArrayBuffer(file);
  });
};

export const inspectExcelFile = parseExcelFile;
