import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  ActiveTab,
  AccountingAccount,
  AuditLog,
  CategoryItem,
  CompanySettings,
  Customer,
  Employee,
  Expense,
  Part,
  PaymentMethodItem,
  PayrollRecord,
  RevenueTransaction,
  ServiceJob,
  UserRole,
  Vehicle,
  VehicleExpense,
} from '../types';
import {
  DateFilterRange,
  DateRangePreset,
  getDateRangeFromPreset,
  getTodayDateString,
  getMonthName,
  isDateInRange,
} from '../utils/date';
import { ImportInspectionResult } from '../utils/excel';

const STORAGE_KEY = 'peso_ledger_db_v2';
const ACCOUNTS_KEY = 'chaching_accounts_v1';
const ACTIVE_ACCOUNT_KEY = 'chaching_active_account_v1';
const AUTH_ACCOUNT_KEY = 'chaching_authenticated_account_v1';

const defaultAccount: AccountingAccount = {
  id: 'main-admin',
  name: 'Main Admin Account',
  createdAt: new Date().toISOString(),
};

const emptyCompanySettings: CompanySettings = {
  name: '',
  address: '',
  phone: '',
  email: '',
  tinNumber: '',
  currencySymbol: '₱',
  currencyCode: 'PHP',
};

const defaultExpenseCategories: CategoryItem[] = [
  'GAS',
  'SALARY',
  'DAILY EXPENSES & SAVINGS',
  'SASAKYAN',
  'SHOP RENT',
  'FOOD ALLOWANCE',
  'INCENTIVES',
  'PERFECT ATTENDANCE',
  'OT PAY',
  'MOTOR',
  'OTHER DEDUCTIONS',
  'PARTS',
  'OTHER EXPENSES',
].map((name, index) => ({
  id: `cat-exp-default-${index + 1}`,
  name,
  isDefault: true,
}));

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  netMarginPercent: number;
  totalTransactionsCount: number;
  partsExpense: number;
  salaryExpense: number;
  gasExpense: number;
  sasakyanExpense: number;
  dailyExpenses: number;
  otherExpenses: number;
  revenueByCategory: Record<string, number>;
  expensesByCategory: Record<string, number>;
  revenueByPaymentMethod: Record<string, number>;
  expensesByPaymentMethod: Record<string, number>;
  paymentMethodBalances: Array<{
    methodId: string;
    methodName: string;
    revenue: number;
    expenses: number;
    balance: number;
  }>;
  categoryBalances: Array<{
    category: string;
    type: 'revenue' | 'expense' | 'both';
    revenue: number;
    expenses: number;
    net: number;
  }>;
}

export interface AccountingContextType {
  // Navigation & Role
  accounts: AccountingAccount[];
  activeAccount: AccountingAccount;
  isAuthenticated: boolean;
  login: (accountId: string, password: string) => boolean;
  logout: () => void;
  createAccount: (name: string, password?: string) => void;
  switchAccount: (id: string) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;

  // Global Date Filter
  dateFilterPreset: DateRangePreset;
  setDateFilterPreset: (preset: DateRangePreset) => void;
  dateRange: DateFilterRange;
  setCustomDateRange: (range: DateFilterRange) => void;

  // Master Data
  revenueTransactions: RevenueTransaction[];
  expenses: Expense[];
  customers: Customer[];
  employees: Employee[];
  payrollRecords: PayrollRecord[];
  vehicles: Vehicle[];
  vehicleExpenses: VehicleExpense[];
  parts: Part[];
  serviceJobs: ServiceJob[];
  serviceCategories: CategoryItem[];
  revenueCategories: CategoryItem[];
  expenseCategories: CategoryItem[];
  paymentMethods: PaymentMethodItem[];
  companySettings: CompanySettings;
  auditLogs: AuditLog[];

  // Summaries & Computations
  financialSummary: FinancialSummary;
  getSummaryForRange: (range: DateFilterRange) => FinancialSummary;
  getYearlyMatrix: (year: number) => Array<{
    monthIndex: number;
    monthName: string;
    revenue: number;
    expenses: number;
    netIncome: number;
  }>;

  // Revenue Actions
  addRevenueTransaction: (data: Omit<RevenueTransaction, 'id' | 'createdAt'>) => string;
  updateRevenueTransaction: (id: string, updates: Partial<RevenueTransaction>) => void;
  voidRevenueTransaction: (id: string, reason: string) => void;

  // Expense Actions
  addExpense: (data: Omit<Expense, 'id' | 'createdAt'>) => string;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  voidExpense: (id: string, reason: string) => void;

  // Service Jobs Actions
  createServiceJob: (job: Omit<ServiceJob, 'id' | 'createdAt'>) => string;
  updateServiceJob: (id: string, updates: Partial<ServiceJob>) => void;
  deleteServiceJob: (id: string) => void;

  // Employee & Payroll Actions
  addEmployee: (employee: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  processPayroll: (record: Omit<PayrollRecord, 'id' | 'createdAt'>) => void;

  // Vehicles Actions
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  addVehicleExpense: (vexp: Omit<VehicleExpense, 'id'>) => void;

  // Inventory Actions
  addPart: (part: Omit<Part, 'id'>) => void;
  updatePart: (id: string, updates: Partial<Part>) => void;
  deletePart: (id: string) => void;
  restockPart: (partId: string, quantityToAdd: number, unitCostPrice?: number) => void;

  // Customer Actions
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => string;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Settings Actions
  addServiceCategory: (name: string, description?: string) => void;
  updateServiceCategory: (id: string, name: string) => void;
  deleteServiceCategory: (id: string) => void;
  addRevenueCategory: (name: string, description?: string) => void;
  updateRevenueCategory: (id: string, name: string) => void;
  deleteRevenueCategory: (id: string) => void;
  addExpenseCategory: (name: string, description?: string) => void;
  updateExpenseCategory: (id: string, name: string) => void;
  deleteExpenseCategory: (id: string) => void;
  addPaymentMethod: (name: string, accountNumber?: string, accountHolder?: string) => void;
  deletePaymentMethod: (id: string) => void;
  updateCompanySettings: (settings: CompanySettings) => void;

  // Import / Export / Backup
  batchImportData: (result: ImportInspectionResult) => void;
  resetToDefaultData: () => void;
  exportDatabaseJSON: () => void;
  importDatabaseJSON: (jsonString: string) => boolean;
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<AccountingAccount[]>(() => {
    try {
      const saved = localStorage.getItem(ACCOUNTS_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [defaultAccount];
    } catch {
      return [defaultAccount];
    }
  });
  const [activeAccountId, setActiveAccountId] = useState(() => {
    return localStorage.getItem(ACTIVE_ACCOUNT_KEY) || defaultAccount.id;
  });
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || accounts[0] || defaultAccount;
  const accountStorageKey = activeAccount.id === defaultAccount.id
    ? STORAGE_KEY
    : `${STORAGE_KEY}_${activeAccount.id}`;
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(AUTH_ACCOUNT_KEY) === activeAccount.id;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('admin');

  const [dateFilterPreset, setDateFilterPreset] = useState<DateRangePreset>('this_month');
  const [customRange, setCustomRange] = useState<DateFilterRange | null>(null);

  // Load state from localStorage or initialize with empty data
  const [revenueTransactions, setRevenueTransactions] = useState<RevenueTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_rev`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_exp`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_cust`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_emp`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_payroll`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_veh`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [vehicleExpenses, setVehicleExpenses] = useState<VehicleExpense[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_vehexp`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [parts, setParts] = useState<Part[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_parts`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [serviceJobs, setServiceJobs] = useState<ServiceJob[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_jobs`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [serviceCategories, setServiceCategories] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_servicecat`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [revenueCategories, setRevenueCategories] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_revcat`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [expenseCategories, setExpenseCategories] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_expcat`);
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed : defaultExpenseCategories;
    } catch {
      return defaultExpenseCategories;
    }
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_pm`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_settings`);
      return saved ? JSON.parse(saved) : emptyCompanySettings;
    } catch {
      return emptyCompanySettings;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(`${accountStorageKey}_logs`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage when states change
  useEffect(() => {
    try {
      localStorage.setItem(`${accountStorageKey}_rev`, JSON.stringify(revenueTransactions));
      localStorage.setItem(`${accountStorageKey}_exp`, JSON.stringify(expenses));
      localStorage.setItem(`${accountStorageKey}_cust`, JSON.stringify(customers));
      localStorage.setItem(`${accountStorageKey}_emp`, JSON.stringify(employees));
      localStorage.setItem(`${accountStorageKey}_payroll`, JSON.stringify(payrollRecords));
      localStorage.setItem(`${accountStorageKey}_veh`, JSON.stringify(vehicles));
      localStorage.setItem(`${accountStorageKey}_vehexp`, JSON.stringify(vehicleExpenses));
      localStorage.setItem(`${accountStorageKey}_parts`, JSON.stringify(parts));
      localStorage.setItem(`${accountStorageKey}_jobs`, JSON.stringify(serviceJobs));
      localStorage.setItem(`${accountStorageKey}_servicecat`, JSON.stringify(serviceCategories));
      localStorage.setItem(`${accountStorageKey}_revcat`, JSON.stringify(revenueCategories));
      localStorage.setItem(`${accountStorageKey}_expcat`, JSON.stringify(expenseCategories));
      localStorage.setItem(`${accountStorageKey}_pm`, JSON.stringify(paymentMethods));
      localStorage.setItem(`${accountStorageKey}_settings`, JSON.stringify(companySettings));
      localStorage.setItem(`${accountStorageKey}_logs`, JSON.stringify(auditLogs));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }, [
    revenueTransactions,
    expenses,
    customers,
    employees,
    payrollRecords,
    vehicles,
    vehicleExpenses,
    parts,
    serviceJobs,
    serviceCategories,
    revenueCategories,
    expenseCategories,
    paymentMethods,
    companySettings,
    auditLogs,
    accountStorageKey,
  ]);

  const createAccount = (name: string, password = '') => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const account: AccountingAccount = {
      id: `account-${Date.now()}`,
      name: trimmedName,
      createdAt: new Date().toISOString(),
      password,
    };
    const nextAccounts = [...accounts, account];
    setAccounts(nextAccounts);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(nextAccounts));
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);
    sessionStorage.setItem(AUTH_ACCOUNT_KEY, account.id);
    window.location.reload();
  };

  const login = (accountId: string, password: string) => {
    const account = accounts.find((item) => item.id === accountId);
    if (!account || (account.password || '') !== password) return false;
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);
    sessionStorage.setItem(AUTH_ACCOUNT_KEY, account.id);
    setIsAuthenticated(true);
    window.location.reload();
    return true;
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_ACCOUNT_KEY);
    setIsAuthenticated(false);
    window.location.reload();
  };

  const switchAccount = (id: string) => {
    if (!accounts.some((account) => account.id === id) || id === activeAccount.id) return;
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
    window.location.reload();
  };

  // Compute active date range
  const dateRange = useMemo<DateFilterRange>(() => {
    if (dateFilterPreset === 'custom' && customRange) {
      return customRange;
    }
    return getDateRangeFromPreset(dateFilterPreset, getTodayDateString());
  }, [dateFilterPreset, customRange]);

  const setCustomDateRange = (range: DateFilterRange) => {
    setCustomRange(range);
    setDateFilterPreset('custom');
  };

  const addAudit = (action: AuditLog['action'], module: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      userName: userRole === 'admin' ? 'System Administrator' : 'Staff Cashier',
      action,
      module,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 199)]);
  };

  // Financial Summary calculator for any range
  const getSummaryForRange = (range: DateFilterRange): FinancialSummary => {
    const validRevenue = revenueTransactions.filter(
      (r) => !r.isVoid && isDateInRange(r.date, range)
    );
    const validExpenses = expenses.filter(
      (e) => !e.isVoid && isDateInRange(e.date, range)
    );

    const totalRevenue = validRevenue.reduce((s, r) => s + (r.amount || 0), 0);
    const totalExpenses = validExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const netIncome = totalRevenue - totalExpenses;
    const netMarginPercent = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    let partsExpense = 0;
    let salaryExpense = 0;
    let gasExpense = 0;
    let sasakyanExpense = 0;
    let dailyExpenses = 0;
    let otherExpenses = 0;

    const expensesByCategory: Record<string, number> = {};
    validExpenses.forEach((exp) => {
      const cat = exp.category.toUpperCase();
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + exp.amount;

      if (cat.includes('PARTS')) partsExpense += exp.amount;
      else if (cat.includes('SALARY') || cat.includes('OT PAY')) salaryExpense += exp.amount;
      else if (cat.includes('GAS')) gasExpense += exp.amount;
      else if (cat.includes('SASAKYAN') || cat.includes('MOTOR')) sasakyanExpense += exp.amount;
      else if (cat.includes('DAILY EXPENSES')) dailyExpenses += exp.amount;
      else otherExpenses += exp.amount;
    });

    const revenueByCategory: Record<string, number> = {};
    validRevenue.forEach((rev) => {
      const cat = rev.category.toUpperCase();
      revenueByCategory[cat] = (revenueByCategory[cat] || 0) + rev.amount;
    });

    const revenueByPaymentMethod: Record<string, number> = {};
    validRevenue.forEach((rev) => {
      const pm = rev.paymentMethodId || 'Cash';
      revenueByPaymentMethod[pm] = (revenueByPaymentMethod[pm] || 0) + rev.amount;
    });

    const expensesByPaymentMethod: Record<string, number> = {};
    validExpenses.forEach((exp) => {
      const pm = exp.paymentMethodId || 'Cash';
      expensesByPaymentMethod[pm] = (expensesByPaymentMethod[pm] || 0) + exp.amount;
    });

    // Payment Method balances
    const paymentMethodBalances = paymentMethods.map((pm) => {
      // Find matches either by id or by name
      let revAmt = 0;
      let expAmt = 0;

      Object.entries(revenueByPaymentMethod).forEach(([key, val]) => {
        if (key === pm.id || key.toLowerCase() === pm.name.toLowerCase()) {
          revAmt += val;
        }
      });

      Object.entries(expensesByPaymentMethod).forEach(([key, val]) => {
        if (key === pm.id || key.toLowerCase() === pm.name.toLowerCase()) {
          expAmt += val;
        }
      });

      return {
        methodId: pm.id,
        methodName: pm.name,
        revenue: revAmt,
        expenses: expAmt,
        balance: revAmt - expAmt,
      };
    });

    // Category Balances
    const allCatNames = Array.from(
      new Set([
        ...revenueCategories.map((c) => c.name.toUpperCase()),
        ...expenseCategories.map((c) => c.name.toUpperCase()),
        ...Object.keys(revenueByCategory),
        ...Object.keys(expensesByCategory),
      ])
    );

    const categoryBalances = allCatNames.map((cat) => {
      const r = revenueByCategory[cat] || 0;
      const e = expensesByCategory[cat] || 0;
      const type: 'revenue' | 'expense' | 'both' =
        r > 0 && e > 0 ? 'both' : r > 0 ? 'revenue' : 'expense';
      return {
        category: cat,
        type,
        revenue: r,
        expenses: e,
        net: r - e,
      };
    });

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      netMarginPercent,
      totalTransactionsCount: validRevenue.length + validExpenses.length,
      partsExpense,
      salaryExpense,
      gasExpense,
      sasakyanExpense,
      dailyExpenses,
      otherExpenses,
      revenueByCategory,
      expensesByCategory,
      revenueByPaymentMethod,
      expensesByPaymentMethod,
      paymentMethodBalances,
      categoryBalances,
    };
  };

  const financialSummary = useMemo<FinancialSummary>(() => {
    return getSummaryForRange(dateRange);
  }, [revenueTransactions, expenses, paymentMethods, dateRange]);

  // Yearly matrix Jan-Dec
  const getYearlyMatrix = (year: number) => {
    const result = [];
    for (let m = 0; m < 12; m++) {
      const start = new Date(year, m, 1).toISOString().split('T')[0];
      const end = new Date(year, m + 1, 0).toISOString().split('T')[0];
      const summary = getSummaryForRange({ startDate: start, endDate: end });
      result.push({
        monthIndex: m,
        monthName: getMonthName(m),
        revenue: summary.totalRevenue,
        expenses: summary.totalExpenses,
        netIncome: summary.netIncome,
      });
    }
    return result;
  };

  // REVENUE ACTIONS
  const addRevenueTransaction = (data: Omit<RevenueTransaction, 'id' | 'createdAt'>): string => {
    const id = `rev-${Date.now()}`;
    const invoiceNumber = data.invoiceNumber?.trim()
      ? data.invoiceNumber
      : `INV-${new Date().getFullYear()}-${String(revenueTransactions.length + 1).padStart(4, '0')}`;

    const newTx: RevenueTransaction = {
      ...data,
      id,
      invoiceNumber,
      createdAt: new Date().toISOString(),
    };

    setRevenueTransactions((prev) => [newTx, ...prev]);
    addAudit('CREATE', 'Revenue', `Created invoice ${invoiceNumber} for ₱${data.amount.toLocaleString()}`);
    return id;
  };

  const updateRevenueTransaction = (id: string, updates: Partial<RevenueTransaction>) => {
    setRevenueTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    addAudit('UPDATE', 'Revenue', `Updated transaction ${id}`);
  };

  const voidRevenueTransaction = (id: string, reason: string) => {
    setRevenueTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isVoid: true, voidReason: reason } : t))
    );
    addAudit('VOID', 'Revenue', `Voided revenue transaction ${id}: ${reason}`);
  };

  // EXPENSE ACTIONS
  const addExpense = (data: Omit<Expense, 'id' | 'createdAt'>): string => {
    const id = `exp-${Date.now()}`;
    const newExp: Expense = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };

    setExpenses((prev) => [newExp, ...prev]);
    addAudit('CREATE', 'Expenses', `Logged expense ₱${data.amount.toLocaleString()} [${data.category}]`);
    return id;
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    addAudit('UPDATE', 'Expenses', `Updated expense ${id}`);
  };

  const voidExpense = (id: string, reason: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isVoid: true, voidReason: reason } : e))
    );
    addAudit('VOID', 'Expenses', `Voided expense ${id}: ${reason}`);
  };

  // SERVICE JOB ACTIONS (with auto-deduction of parts and auto-ledger linking)
  const createServiceJob = (jobData: Omit<ServiceJob, 'id' | 'createdAt'>): string => {
    const jobId = `job-${Date.now()}`;
    let revenueId: string | undefined = undefined;
    let expenseId: string | undefined = undefined;

    // 1. Deduct parts from inventory
    if (jobData.partsUsed && jobData.partsUsed.length > 0) {
      setParts((prevParts) =>
        prevParts.map((p) => {
          const used = jobData.partsUsed.find((u) => u.partId === p.id);
          if (used) {
            const newQty = Math.max(0, p.quantity - used.quantity);
            return { ...p, quantity: newQty };
          }
          return p;
        })
      );

      // Automatically create an expense for parts cost
      if (jobData.partsCostAmount > 0) {
        const partsDesc = jobData.partsUsed
          .map((u) => `${u.quantity}x ${u.partName}`)
          .join(', ');

        expenseId = `exp-parts-${Date.now()}`;
        const partsExpense: Expense = {
          id: expenseId,
          date: jobData.date,
          category: 'PARTS',
          description: `Parts used for ${jobData.jobNumber}: ${partsDesc}`,
          amount: jobData.partsCostAmount,
          paymentMethodId: jobData.paymentMethodId || 'Cash',
          referenceNumber: jobData.jobNumber,
          relatedModule: 'parts',
          relatedId: jobId,
          createdAt: new Date().toISOString(),
        };
        setExpenses((prev) => [partsExpense, ...prev]);
      }
    }

    // 2. Automatically create revenue transaction if paid or partially paid
    const amountReceived = jobData.amountPaid || (jobData.paymentStatus === 'Paid' ? jobData.total : 0);
    if (amountReceived > 0) {
      revenueId = `rev-job-${Date.now()}`;
      const revTx: RevenueTransaction = {
        id: revenueId,
        date: jobData.date,
        invoiceNumber: jobData.jobNumber,
        customerId: jobData.customerId,
        customerName: jobData.customerName,
        serviceType: jobData.description,
        category: jobData.serviceCategory,
        description: `${jobData.serviceCategory} - ${jobData.description}`,
        originalAmount: jobData.subtotal,
        discount: jobData.discountAmount,
        amount: amountReceived,
        paymentMethodId: jobData.paymentMethodId,
        employeeId: jobData.technicianId,
        employeeName: jobData.technicianName,
        notes: `From Service Job ${jobData.jobNumber}`,
        serviceJobId: jobId,
        createdAt: new Date().toISOString(),
      };
      setRevenueTransactions((prev) => [revTx, ...prev]);
    }

    const fullJob: ServiceJob = {
      ...jobData,
      id: jobId,
      revenueId,
      expenseId,
      createdAt: new Date().toISOString(),
    };

    setServiceJobs((prev) => [fullJob, ...prev]);
    addAudit(
      'CREATE',
      'Jobs',
      `Created service job ${jobData.jobNumber} for ${jobData.customerName} (Total: ₱${jobData.total.toLocaleString()})`
    );

    return jobId;
  };

  const updateServiceJob = (id: string, updates: Partial<ServiceJob>) => {
    setServiceJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, ...updates } : j))
    );
    addAudit('UPDATE', 'Jobs', `Updated service job ${id}`);
  };

  const deleteServiceJob = (id: string) => {
    setServiceJobs((prev) => prev.filter((j) => j.id !== id));
    addAudit('VOID', 'Jobs', `Removed service job ${id}`);
  };

  // EMPLOYEE & PAYROLL
  const addEmployee = (emp: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...emp,
      id: `emp-${Date.now()}`,
    };
    setEmployees((prev) => [...prev, newEmp]);
    addAudit('CREATE', 'Employees', `Added employee ${emp.name} (${emp.position})`);
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    addAudit('UPDATE', 'Employees', `Updated employee ${id}`);
  };

  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    addAudit('VOID', 'Employees', `Deleted employee ${id}`);
  };

  const processPayroll = (record: Omit<PayrollRecord, 'id' | 'createdAt'>) => {
    const payrollId = `pay-${Date.now()}`;
    const expId = `exp-pay-${Date.now()}`;

    // Automatically create Salary Expense
    const salaryExpense: Expense = {
      id: expId,
      date: record.date,
      category: 'SALARY',
      description: `Payroll for ${record.employeeName} (${record.period})`,
      amount: record.netSalary,
      paymentMethodId: record.paymentMethodId,
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      referenceNumber: `PAY-${record.employeeId}-${record.date.replace(/-/g, '')}`,
      relatedModule: 'salary',
      relatedId: payrollId,
      createdAt: new Date().toISOString(),
    };

    const newRecord: PayrollRecord = {
      ...record,
      id: payrollId,
      expenseId: expId,
      createdAt: new Date().toISOString(),
    };

    setPayrollRecords((prev) => [newRecord, ...prev]);
    setExpenses((prev) => [salaryExpense, ...prev]);
    addAudit(
      'CREATE',
      'Payroll',
      `Processed payroll for ${record.employeeName}: Net ₱${record.netSalary.toLocaleString()} (Added to expenses)`
    );
  };

  // VEHICLES
  const addVehicle = (veh: Omit<Vehicle, 'id'>) => {
    const newVeh: Vehicle = {
      ...veh,
      id: `veh-${Date.now()}`,
    };
    setVehicles((prev) => [...prev, newVeh]);
    addAudit('CREATE', 'Vehicles', `Added vehicle ${veh.vehicleName} (${veh.plateNumber})`);
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const deleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const addVehicleExpense = (vexp: Omit<VehicleExpense, 'id'>) => {
    const expId = `exp-veh-${Date.now()}`;
    const vexpId = `ve-${Date.now()}`;

    // Expense category: 'GAS' if fuel, else 'SASAKYAN'
    const category = vexp.expenseType === 'Fuel/Gas' ? 'GAS' : 'SASAKYAN';

    const expenseEntry: Expense = {
      id: expId,
      date: vexp.date,
      category,
      description: `${vexp.vehicleName} - ${vexp.expenseType}: ${vexp.description}`,
      amount: vexp.amount,
      paymentMethodId: vexp.paymentMethodId,
      referenceNumber: `VEH-${vexp.vehicleId}`,
      relatedModule: 'vehicle',
      relatedId: vexp.vehicleId,
      notes: vexp.notes,
      createdAt: new Date().toISOString(),
    };

    const newVehicleExp: VehicleExpense = {
      ...vexp,
      id: vexpId,
      expenseId: expId,
    };

    setVehicleExpenses((prev) => [newVehicleExp, ...prev]);
    setExpenses((prev) => [expenseEntry, ...prev]);
    addAudit(
      'CREATE',
      'Vehicles',
      `Logged vehicle expense ₱${vexp.amount.toLocaleString()} for ${vexp.vehicleName} (${category})`
    );
  };

  // INVENTORY / PARTS
  const addPart = (part: Omit<Part, 'id'>) => {
    const newPart: Part = {
      ...part,
      id: `part-${Date.now()}`,
    };
    setParts((prev) => [...prev, newPart]);
    addAudit('CREATE', 'Inventory', `Added part ${part.name} [${part.partNumber}]`);
  };

  const updatePart = (id: string, updates: Partial<Part>) => {
    setParts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    addAudit('UPDATE', 'Inventory', `Updated part ${id}`);
  };

  const deletePart = (id: string) => {
    setParts((prev) => prev.filter((p) => p.id !== id));
    addAudit('VOID', 'Inventory', `Removed part ${id}`);
  };

  const restockPart = (partId: string, quantityToAdd: number, unitCostPrice?: number) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id === partId) {
          return {
            ...p,
            quantity: p.quantity + quantityToAdd,
            costPrice: unitCostPrice && unitCostPrice > 0 ? unitCostPrice : p.costPrice,
          };
        }
        return p;
      })
    );
    addAudit('RESTOCK', 'Inventory', `Restocked part ${partId} by +${quantityToAdd} units`);
  };

  // CUSTOMERS
  const addCustomer = (cust: Omit<Customer, 'id' | 'createdAt'>): string => {
    const id = `cust-${Date.now()}`;
    const newCust: Customer = {
      ...cust,
      id,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [...prev, newCust]);
    addAudit('CREATE', 'Customers', `Added customer ${cust.name}`);
    return id;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  // SETTINGS & CATEGORIES
  const addServiceCategory = (name: string, description?: string) => {
    const id = `cat-service-${Date.now()}`;
    setServiceCategories((prev) => [...prev, { id, name: name.toUpperCase(), description }]);
    addAudit('SETTINGS', 'Categories', `Added service category ${name}`);
  };

  const deleteServiceCategory = (id: string) => {
    setServiceCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const updateServiceCategory = (id: string, name: string) => {
    const normalizedName = name.trim().toUpperCase();
    if (!normalizedName) return;
    setServiceCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: normalizedName } : c)));
    addAudit('SETTINGS', 'Categories', `Updated service category ${normalizedName}`);
  };

  const addRevenueCategory = (name: string, description?: string) => {
    const id = `cat-rev-${Date.now()}`;
    setRevenueCategories((prev) => [...prev, { id, name: name.toUpperCase(), description }]);
    addAudit('SETTINGS', 'Categories', `Added revenue category ${name}`);
  };

  const deleteRevenueCategory = (id: string) => {
    setRevenueCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const updateRevenueCategory = (id: string, name: string) => {
    const normalizedName = name.trim().toUpperCase();
    if (!normalizedName) return;
    setRevenueCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: normalizedName } : c)));
    addAudit('SETTINGS', 'Categories', `Updated revenue category ${normalizedName}`);
  };

  const addExpenseCategory = (name: string, description?: string) => {
    const id = `cat-exp-${Date.now()}`;
    setExpenseCategories((prev) => [...prev, { id, name: name.toUpperCase(), description }]);
    addAudit('SETTINGS', 'Categories', `Added expense category ${name}`);
  };

  const deleteExpenseCategory = (id: string) => {
    setExpenseCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const updateExpenseCategory = (id: string, name: string) => {
    const normalizedName = name.trim().toUpperCase();
    if (!normalizedName) return;
    setExpenseCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: normalizedName } : c)));
    addAudit('SETTINGS', 'Categories', `Updated expense category ${normalizedName}`);
  };

  const addPaymentMethod = (name: string, accountNumber?: string, accountHolder?: string) => {
    const id = `pm-${Date.now()}`;
    setPaymentMethods((prev) => [...prev, { id, name, accountNumber, accountHolder }]);
    addAudit('SETTINGS', 'Payment', `Added payment method ${name}`);
  };

  const deletePaymentMethod = (id: string) => {
    setPaymentMethods((prev) => prev.filter((p) => p.id !== id));
  };

  const updateCompanySettings = (settings: CompanySettings) => {
    setCompanySettings(settings);
    addAudit('SETTINGS', 'Company', 'Updated company profile information');
  };

  // IMPORT & BACKUP
  const batchImportData = (result: ImportInspectionResult) => {
    if (result.detectedRevenue.length > 0) {
      setRevenueTransactions((prev) => [...result.detectedRevenue, ...prev]);
    }
    if (result.detectedExpenses.length > 0) {
      setExpenses((prev) => [...result.detectedExpenses, ...prev]);
    }
    if (result.detectedParts.length > 0) {
      setParts((prev) => [...prev, ...result.detectedParts]);
    }

    // Auto add detected categories
    result.detectedCategories.forEach((catName) => {
      const upper = catName.toUpperCase();
      if (!revenueCategories.some((c) => c.name === upper)) {
        setRevenueCategories((prev) => [...prev, { id: `cat-rev-${Date.now()}-${upper}`, name: upper }]);
      }
      if (!expenseCategories.some((c) => c.name === upper)) {
        setExpenseCategories((prev) => [...prev, { id: `cat-exp-${Date.now()}-${upper}`, name: upper }]);
      }
    });

    // Auto add payment methods
    result.detectedPaymentMethods.forEach((pmName) => {
      if (pmName && !paymentMethods.some((p) => p.name.toLowerCase() === pmName.toLowerCase())) {
        setPaymentMethods((prev) => [
          ...prev,
          { id: `pm-${Date.now()}-${pmName}`, name: pmName, accountNumber: 'Auto-imported' },
        ]);
      }
    });

    addAudit(
      'IMPORT',
      'Excel Import',
      `Imported ${result.totalRecords} records from ${result.fileName}: ₱${result.totalRevenueAmount.toLocaleString()} revenue, ₱${result.totalExpenseAmount.toLocaleString()} expenses.`
    );
  };

  const resetToDefaultData = () => {
    setRevenueTransactions([]);
    setExpenses([]);
    setCustomers([]);
    setEmployees([]);
    setPayrollRecords([]);
    setVehicles([]);
    setVehicleExpenses([]);
    setParts([]);
    setServiceJobs([]);
    setServiceCategories([]);
    setRevenueCategories([]);
    setExpenseCategories(defaultExpenseCategories);
    setPaymentMethods([]);
    setCompanySettings(emptyCompanySettings);
    setAuditLogs([]);
  };

  const exportDatabaseJSON = () => {
    const payload = {
      exportDate: new Date().toISOString(),
      revenueTransactions,
      expenses,
      customers,
      employees,
      payrollRecords,
      vehicles,
      vehicleExpenses,
      parts,
      serviceJobs,
      serviceCategories,
      revenueCategories,
      expenseCategories,
      paymentMethods,
      companySettings,
      auditLogs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chaching-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importDatabaseJSON = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.revenueTransactions)) setRevenueTransactions(data.revenueTransactions);
      if (Array.isArray(data.expenses)) setExpenses(data.expenses);
      if (Array.isArray(data.customers)) setCustomers(data.customers);
      if (Array.isArray(data.employees)) setEmployees(data.employees);
      if (Array.isArray(data.payrollRecords)) setPayrollRecords(data.payrollRecords);
      if (Array.isArray(data.vehicles)) setVehicles(data.vehicles);
      if (Array.isArray(data.parts)) setParts(data.parts);
      if (Array.isArray(data.serviceJobs)) setServiceJobs(data.serviceJobs);
      if (Array.isArray(data.serviceCategories)) setServiceCategories(data.serviceCategories);
      if (Array.isArray(data.revenueCategories)) setRevenueCategories(data.revenueCategories);
      if (Array.isArray(data.expenseCategories)) setExpenseCategories(data.expenseCategories);
      if (Array.isArray(data.paymentMethods)) setPaymentMethods(data.paymentMethods);
      if (data.companySettings) setCompanySettings(data.companySettings);
      addAudit('SETTINGS', 'Database', 'Restored complete database backup from JSON file.');
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  return (
    <AccountingContext.Provider
      value={{
        accounts,
        activeAccount,
        isAuthenticated,
        login,
        logout,
        createAccount,
        switchAccount,
        activeTab,
        setActiveTab,
        userRole,
        setUserRole,
        dateFilterPreset,
        setDateFilterPreset,
        dateRange,
        setCustomDateRange,
        revenueTransactions,
        expenses,
        customers,
        employees,
        payrollRecords,
        vehicles,
        vehicleExpenses,
        parts,
        serviceJobs,
        serviceCategories,
        revenueCategories,
        expenseCategories,
        paymentMethods,
        companySettings,
        auditLogs,
        financialSummary,
        getSummaryForRange,
        getYearlyMatrix,
        addRevenueTransaction,
        updateRevenueTransaction,
        voidRevenueTransaction,
        addExpense,
        updateExpense,
        voidExpense,
        createServiceJob,
        updateServiceJob,
        deleteServiceJob,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        processPayroll,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addVehicleExpense,
        addPart,
        updatePart,
        deletePart,
        restockPart,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addServiceCategory,
        updateServiceCategory,
        deleteServiceCategory,
        addRevenueCategory,
        updateRevenueCategory,
        deleteRevenueCategory,
        addExpenseCategory,
        updateExpenseCategory,
        deleteExpenseCategory,
        addPaymentMethod,
        deletePaymentMethod,
        updateCompanySettings,
        batchImportData,
        resetToDefaultData,
        exportDatabaseJSON,
        importDatabaseJSON,
      }}
    >
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
};
