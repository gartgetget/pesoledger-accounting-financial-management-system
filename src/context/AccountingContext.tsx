import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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
import { useAuth, BackendUser, BackendWorkspace } from './AuthContext';
import api from '../api/client';

const defaultAccount: AccountingAccount = {
  id: 'main-admin',
  name: 'Main Admin Account',
  createdAt: new Date().toISOString(),
};

const emptyCompanySettings: CompanySettings = {
  name: '', address: '', phone: '', email: '', tinNumber: '',
  currencySymbol: '₱', currencyCode: 'PHP',
};

const defaultExpenseCategories: CategoryItem[] = [
  'GAS','SALARY','DAILY EXPENSES & SAVINGS','SASAKYAN','SHOP RENT',
  'FOOD ALLOWANCE','INCENTIVES','PERFECT ATTENDANCE','OT PAY','MOTOR','OTHER DEDUCTIONS','PARTS','OTHER EXPENSES',
].map((name, index) => ({ id: `cat-exp-default-${index + 1}`, name, isDefault: true }));

export interface FinancialSummary {
  totalRevenue: number; totalExpenses: number; netIncome: number; netMarginPercent: number;
  totalTransactionsCount: number; partsExpense: number; salaryExpense: number;
  gasExpense: number; sasakyanExpense: number; dailyExpenses: number; otherExpenses: number;
  revenueByCategory: Record<string, number>; expensesByCategory: Record<string, number>;
  revenueByPaymentMethod: Record<string, number>; expensesByPaymentMethod: Record<string, number>;
  paymentMethodBalances: Array<{ methodId: string; methodName: string; revenue: number; expenses: number; balance: number }>;
  categoryBalances: Array<{ category: string; type: 'revenue' | 'expense' | 'both'; revenue: number; expenses: number; net: number }>;
}

export interface AccountingContextType {
  accounts: AccountingAccount[]; activeAccount: AccountingAccount; isAuthenticated: boolean;
  login: (accountId: string, password: string) => boolean; logout: () => void;
  createAccount: (name: string, password?: string) => void; switchAccount: (id: string) => void;
  activeTab: ActiveTab; setActiveTab: (tab: ActiveTab) => void; userRole: UserRole; setUserRole: (role: UserRole) => void;
  dateFilterPreset: DateRangePreset; setDateFilterPreset: (preset: DateRangePreset) => void;
  dateRange: DateFilterRange; setCustomDateRange: (range: DateFilterRange) => void;
  revenueTransactions: RevenueTransaction[]; expenses: Expense[]; customers: Customer[];
  employees: Employee[]; payrollRecords: PayrollRecord[]; vehicles: Vehicle[];
  vehicleExpenses: VehicleExpense[]; parts: Part[]; serviceJobs: ServiceJob[];
  serviceCategories: CategoryItem[]; revenueCategories: CategoryItem[]; expenseCategories: CategoryItem[];
  paymentMethods: PaymentMethodItem[]; companySettings: CompanySettings; auditLogs: AuditLog[];
  financialSummary: FinancialSummary; getSummaryForRange: (range: DateFilterRange) => FinancialSummary;
  getYearlyMatrix: (year: number) => Array<{ monthIndex: number; monthName: string; revenue: number; expenses: number; netIncome: number }>;
  addRevenueTransaction: (data: Omit<RevenueTransaction, 'id' | 'createdAt'>) => string;
  updateRevenueTransaction: (id: string, updates: Partial<RevenueTransaction>) => void;
  voidRevenueTransaction: (id: string, reason: string) => void;
  addExpense: (data: Omit<Expense, 'id' | 'createdAt'>) => string;
  updateExpense: (id: string, updates: Partial<Expense>) => void; voidExpense: (id: string, reason: string) => void;
  createServiceJob: (job: Omit<ServiceJob, 'id' | 'createdAt'>) => string;
  updateServiceJob: (id: string, updates: Partial<ServiceJob>) => void; deleteServiceJob: (id: string) => void;
  addEmployee: (employee: Omit<Employee, 'id'>) => void; updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void; processPayroll: (record: Omit<PayrollRecord, 'id' | 'createdAt'>) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void; updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void; addVehicleExpense: (vexp: Omit<VehicleExpense, 'id'>) => void;
  addPart: (part: Omit<Part, 'id'>) => void; updatePart: (id: string, updates: Partial<Part>) => void;
  deletePart: (id: string) => void; restockPart: (partId: string, quantityToAdd: number, unitCostPrice?: number) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => string;
  updateCustomer: (id: string, updates: Partial<Customer>) => void; deleteCustomer: (id: string) => void;
  addServiceCategory: (name: string, description?: string) => void;
  updateServiceCategory: (id: string, name: string) => void; deleteServiceCategory: (id: string) => void;
  addRevenueCategory: (name: string, description?: string) => void;
  updateRevenueCategory: (id: string, name: string) => void; deleteRevenueCategory: (id: string) => void;
  addExpenseCategory: (name: string, description?: string) => void;
  updateExpenseCategory: (id: string, name: string) => void; deleteExpenseCategory: (id: string) => void;
  addPaymentMethod: (name: string, accountNumber?: string, accountHolder?: string) => void;
  deletePaymentMethod: (id: string) => void; updateCompanySettings: (settings: CompanySettings) => void;
  batchImportData: (result: ImportInspectionResult) => void; resetToDefaultData: () => void;
  exportDatabaseJSON: () => void; importDatabaseJSON: (jsonString: string) => boolean;
  isApiLoading: boolean;
  workspaces: BackendWorkspace[]; activeWorkspace: BackendWorkspace | null;
  fetchWorkspaces: () => Promise<void>; selectWorkspace: (id: string) => void; createWorkspace: (name: string) => Promise<void>;
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

function mapBackendRevenue(entry: any): RevenueTransaction {
  return {
    id: entry._id || entry.id,
    date: entry.date ? entry.date.split('T')[0] : entry.date,
    invoiceNumber: entry.referenceNo || `INV-${entry._id?.slice(-6) || Date.now()}`,
    customerName: entry.customerId ? '' : '',
    serviceType: entry.description || '',
    category: entry.category || entry.categoryId || '',
    description: entry.description || '',
    originalAmount: entry.amount || 0,
    discount: 0, amount: entry.amount || 0,
    paymentMethodId: entry.paymentMethod || 'Cash',
    employeeId: entry.createdBy, employeeName: '',
    notes: '', serviceJobId: undefined,
    isVoid: false, voidReason: '',
    createdAt: entry.createdAt || new Date().toISOString(),
  };
}

function mapBackendExpense(entry: any): Expense {
  return {
    id: entry._id || entry.id,
    date: entry.date ? entry.date.split('T')[0] : entry.date,
    category: entry.category || entry.categoryId || '',
    description: entry.description || '', amount: entry.amount || 0,
    paymentMethodId: entry.paymentMethod || 'Cash',
    vendorSupplier: '', employeeId: entry.createdBy, employeeName: '',
    referenceNumber: entry.referenceNo || '', notes: '',
    relatedModule: 'general', relatedId: undefined,
    isVoid: false, voidReason: '',
    createdAt: entry.createdAt || new Date().toISOString(),
  };
}

function mapBackendJob(order: any): ServiceJob {
  return {
    id: order._id || order.id, jobNumber: order.jobNumber || `JOB-${order._id?.slice(-6) || Date.now()}`,
    customerId: order.customerId || '', customerName: order.customerName || '',
    date: order.date ? order.date.split('T')[0] : order.date,
    technicianId: order.assignedTechnician || '', technicianName: '',
    serviceCategory: order.serviceCategory || '', description: order.description || '',
    laborAmount: order.laborCost || 0, partsUsed: [], partsAmount: 0, partsCostAmount: 0,
    otherCharges: 0, discountType: 'percentage', discountValue: 0, discountAmount: 0,
    subtotal: order.totalAmount || 0, total: order.totalAmount || 0,
    amountPaid: 0, paymentMethodId: '', paymentStatus: order.status === 'Paid' ? 'Paid' : 'Unpaid',
    notes: '', revenueId: undefined, expenseId: undefined,
    createdAt: order.createdAt || new Date().toISOString(),
  };
}

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeWorkspaceId, activeWorkspace, isAuthenticated: authIsAuthenticated, isLoading: authIsLoading, login: authLogin, register: authRegister, logout: authLogout, selectWorkspace, createWorkspace: authCreateWorkspace, fetchWorkspaces } = useAuth();

  const [accounts, setAccounts] = useState<AccountingAccount[]>([defaultAccount]);
  const [activeAccount] = useState<AccountingAccount>(defaultAccount);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [dateFilterPreset, setDateFilterPreset] = useState<DateRangePreset>('this_month');
  const [customRange, setCustomRange] = useState<DateFilterRange | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [revenueTransactions, setRevenueTransactions] = useState<RevenueTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleExpenses, setVehicleExpenses] = useState<VehicleExpense[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [serviceJobs, setServiceJobs] = useState<ServiceJob[]>([]);
  const [serviceCategories, setServiceCategories] = useState<CategoryItem[]>([]);
  const [revenueCategories, setRevenueCategories] = useState<CategoryItem[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(emptyCompanySettings);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const dateRange = useMemo<DateFilterRange>(() => {
    if (dateFilterPreset === 'custom' && customRange) return customRange;
    return getDateRangeFromPreset(dateFilterPreset, getTodayDateString());
  }, [dateFilterPreset, customRange]);

  const setCustomDateRange = (range: DateFilterRange) => { setCustomRange(range); setDateFilterPreset('custom'); };

  const addAudit = useCallback((action: AuditLog['action'], module: string, details: string) => {
    const newLog: AuditLog = { id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, timestamp: new Date().toISOString(), userName: userRole === 'admin' ? 'System Administrator' : 'Staff Cashier', action, module, details };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 199)]);
  }, [userRole]);

  useEffect(() => {
    if (!activeWorkspaceId || !authIsAuthenticated) return;
    const fetchAllData = async () => {
      setIsLoadingData(true);
      try {
        const wsId = activeWorkspaceId;
        const [revData, expData, custData, jobData] = await Promise.all([
          api.get<any[]>(`/api/${wsId}/revenue`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/expenses`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/customers`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/job-orders`).catch(() => []),
        ]);
        setRevenueTransactions(revData.map(mapBackendRevenue));
        setExpenses(expData.map(mapBackendExpense));
        setCustomers(custData.map((c: any) => ({ id: c._id, name: c.name, contact: c.phone || '', address: c.address || '', email: c.email || '', notes: '', createdAt: c.createdAt || new Date().toISOString() })));
        setServiceJobs(jobData.map(mapBackendJob));
      } catch (e) {
        console.error('Failed to fetch workspace data', e);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchAllData();
  }, [activeWorkspaceId, authIsAuthenticated]);

  const createAccount = (name: string, password = '') => {
    const trimmedName = name.trim(); if (!trimmedName) return;
    const account: AccountingAccount = { id: `account-${Date.now()}`, name: trimmedName, createdAt: new Date().toISOString(), password };
    setAccounts((prev) => [...prev, account]);
  };

  const login = (accountId: string, password: string) => {
    const account = accounts.find((item) => item.id === accountId);
    if (!account || (account.password || '') !== password) return false;
    window.location.reload(); return true;
  };

  const logout = () => {
    authLogout(); window.location.reload();
  };

  const switchAccount = (id: string) => {
    if (!accounts.some((account) => account.id === id)) return;
  };

  const getSummaryForRange = (range: DateFilterRange): FinancialSummary => {
    const validRevenue = revenueTransactions.filter((r) => !r.isVoid && isDateInRange(r.date, range));
    const validExpenses = expenses.filter((e) => !e.isVoid && isDateInRange(e.date, range));
    const totalRevenue = validRevenue.reduce((s, r) => s + (r.amount || 0), 0);
    const totalExpenses = validExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const netIncome = totalRevenue - totalExpenses;
    const netMarginPercent = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
    let partsExpense = 0, salaryExpense = 0, gasExpense = 0, sasakyanExpense = 0, dailyExpenses = 0, otherExpenses = 0;
    const expensesByCategory: Record<string, number> = {};
    validExpenses.forEach((exp) => {
      const cat = exp.category.toUpperCase(); expensesByCategory[cat] = (expensesByCategory[cat] || 0) + exp.amount;
      if (cat.includes('PARTS')) partsExpense += exp.amount;
      else if (cat.includes('SALARY') || cat.includes('OT PAY')) salaryExpense += exp.amount;
      else if (cat.includes('GAS')) gasExpense += exp.amount;
      else if (cat.includes('SASAKYAN') || cat.includes('MOTOR')) sasakyanExpense += exp.amount;
      else if (cat.includes('DAILY EXPENSES')) dailyExpenses += exp.amount;
      else otherExpenses += exp.amount;
    });
    const revenueByCategory: Record<string, number> = {};
    validRevenue.forEach((rev) => { const cat = rev.category.toUpperCase(); revenueByCategory[cat] = (revenueByCategory[cat] || 0) + rev.amount; });
    const revenueByPaymentMethod: Record<string, number> = {};
    validRevenue.forEach((rev) => { const pm = rev.paymentMethodId || 'Cash'; revenueByPaymentMethod[pm] = (revenueByPaymentMethod[pm] || 0) + rev.amount; });
    const expensesByPaymentMethod: Record<string, number> = {};
    validExpenses.forEach((exp) => { const pm = exp.paymentMethodId || 'Cash'; expensesByPaymentMethod[pm] = (expensesByPaymentMethod[pm] || 0) + exp.amount; });
    const paymentMethodBalances = paymentMethods.map((pm) => {
      let revAmt = 0, expAmt = 0;
      Object.entries(revenueByPaymentMethod).forEach(([key, val]) => { if (key === pm.id || key.toLowerCase() === pm.name.toLowerCase()) revAmt += val; });
      Object.entries(expensesByPaymentMethod).forEach(([key, val]) => { if (key === pm.id || key.toLowerCase() === pm.name.toLowerCase()) expAmt += val; });
      return { methodId: pm.id, methodName: pm.name, revenue: revAmt, expenses: expAmt, balance: revAmt - expAmt };
    });
    const allCatNames = Array.from(new Set([...revenueCategories.map((c) => c.name.toUpperCase()), ...expenseCategories.map((c) => c.name.toUpperCase()), ...Object.keys(revenueByCategory), ...Object.keys(expensesByCategory)]));
    const categoryBalances = allCatNames.map((cat) => { const r = revenueByCategory[cat] || 0; const e = expensesByCategory[cat] || 0; const type: 'revenue' | 'expense' | 'both' = r > 0 && e > 0 ? 'both' : r > 0 ? 'revenue' : 'expense'; return { category: cat, type, revenue: r, expenses: e, net: r - e }; });
    return { totalRevenue, totalExpenses, netIncome, netMarginPercent, totalTransactionsCount: validRevenue.length + validExpenses.length, partsExpense, salaryExpense, gasExpense, sasakyanExpense, dailyExpenses, otherExpenses, revenueByCategory, expensesByCategory, revenueByPaymentMethod, expensesByPaymentMethod, paymentMethodBalances, categoryBalances };
  };

  const financialSummary = useMemo<FinancialSummary>(() => getSummaryForRange(dateRange), [revenueTransactions, expenses, paymentMethods, dateRange]);

  const getYearlyMatrix = (year: number) => {
    const result = [];
    for (let m = 0; m < 12; m++) {
      const start = new Date(year, m, 1).toISOString().split('T')[0];
      const end = new Date(year, m + 1, 0).toISOString().split('T')[0];
      const summary = getSummaryForRange({ startDate: start, endDate: end });
      result.push({ monthIndex: m, monthName: getMonthName(m), revenue: summary.totalRevenue, expenses: summary.totalExpenses, netIncome: summary.netIncome });
    }
    return result;
  };

  const addRevenueTransaction = (data: Omit<RevenueTransaction, 'id' | 'createdAt'>): string => {
    const id = `rev-${Date.now()}`;
    const invoiceNumber = data.invoiceNumber?.trim() ? data.invoiceNumber : `INV-${new Date().getFullYear()}-${String(revenueTransactions.length + 1).padStart(4, '0')}`;
    const newTx: RevenueTransaction = { ...data, id, invoiceNumber, createdAt: new Date().toISOString() };
    setRevenueTransactions((prev) => [newTx, ...prev]);
    addAudit('CREATE', 'Revenue', `Created invoice ${invoiceNumber} for ₱${data.amount.toLocaleString()}`);
    return id;
  };

  const updateRevenueTransaction = (id: string, updates: Partial<RevenueTransaction>) => {
    setRevenueTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    addAudit('UPDATE', 'Revenue', `Updated transaction ${id}`);
  };

  const voidRevenueTransaction = (id: string, reason: string) => {
    setRevenueTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, isVoid: true, voidReason: reason } : t)));
    addAudit('VOID', 'Revenue', `Voided revenue transaction ${id}: ${reason}`);
  };

  const addExpense = (data: Omit<Expense, 'id' | 'createdAt'>): string => {
    const id = `exp-${Date.now()}`;
    const newExp: Expense = { ...data, id, createdAt: new Date().toISOString() };
    setExpenses((prev) => [newExp, ...prev]);
    addAudit('CREATE', 'Expenses', `Logged expense ₱${data.amount.toLocaleString()} [${data.category}]`);
    return id;
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    addAudit('UPDATE', 'Expenses', `Updated expense ${id}`);
  };

  const voidExpense = (id: string, reason: string) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, isVoid: true, voidReason: reason } : e)));
    addAudit('VOID', 'Expenses', `Voided expense ${id}: ${reason}`);
  };

  const createServiceJob = (jobData: Omit<ServiceJob, 'id' | 'createdAt'>): string => {
    const jobId = `job-${Date.now()}`;
    const fullJob: ServiceJob = { ...jobData, id: jobId, createdAt: new Date().toISOString() };
    setServiceJobs((prev) => [fullJob, ...prev]);
    addAudit('CREATE', 'Jobs', `Created service job ${jobData.jobNumber} for ${jobData.customerName} (Total: ₱${jobData.total.toLocaleString()})`);
    return jobId;
  };

  const updateServiceJob = (id: string, updates: Partial<ServiceJob>) => {
    setServiceJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
    addAudit('UPDATE', 'Jobs', `Updated service job ${id}`);
  };

  const deleteServiceJob = (id: string) => {
    setServiceJobs((prev) => prev.filter((j) => j.id !== id));
    addAudit('VOID', 'Jobs', `Removed service job ${id}`);
  };

  const addEmployee = (emp: Omit<Employee, 'id'>) => {
    const newEmp: Employee = { ...emp, id: `emp-${Date.now()}` };
    setEmployees((prev) => [...prev, newEmp]);
    addAudit('CREATE', 'Employees', `Added employee ${emp.name} (${emp.position})`);
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    addAudit('UPDATE', 'Employees', `Updated employee ${id}`);
  };

  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    addAudit('VOID', 'Employees', `Deleted employee ${id}`);
  };

  const processPayroll = (record: Omit<PayrollRecord, 'id' | 'createdAt'>) => {
    const payrollId = `pay-${Date.now()}`;
    const expId = `exp-pay-${Date.now()}`;
    const salaryExpense: Expense = { id: expId, date: record.date, category: 'SALARY', description: `Payroll for ${record.employeeName} (${record.period})`, amount: record.netSalary, paymentMethodId: record.paymentMethodId, employeeId: record.employeeId, employeeName: record.employeeName, referenceNumber: `PAY-${record.employeeId}-${record.date.replace(/-/g, '')}`, relatedModule: 'salary', relatedId: payrollId, createdAt: new Date().toISOString() };
    const newRecord: PayrollRecord = { ...record, id: payrollId, expenseId: expId, createdAt: new Date().toISOString() };
    setPayrollRecords((prev) => [newRecord, ...prev]);
    setExpenses((prev) => [salaryExpense, ...prev]);
    addAudit('CREATE', 'Payroll', `Processed payroll for ${record.employeeName}: Net ₱${record.netSalary.toLocaleString()}`);
  };

  const addVehicle = (veh: Omit<Vehicle, 'id'>) => { const newVeh: Vehicle = { ...veh, id: `veh-${Date.now()}` }; setVehicles((prev) => [...prev, newVeh]); addAudit('CREATE', 'Vehicles', `Added vehicle ${veh.vehicleName} (${veh.plateNumber})`); };
  const updateVehicle = (id: string, updates: Partial<Vehicle>) => { setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v))); };
  const deleteVehicle = (id: string) => { setVehicles((prev) => prev.filter((v) => v.id !== id)); };
  const addVehicleExpense = (vexp: Omit<VehicleExpense, 'id'>) => {
    const expId = `exp-veh-${Date.now()}`; const vexpId = `ve-${Date.now()}`;
    const category = vexp.expenseType === 'Fuel/Gas' ? 'GAS' : 'SASAKYAN';
    const expenseEntry: Expense = { id: expId, date: vexp.date, category, description: `${vexp.vehicleName} - ${vexp.expenseType}: ${vexp.description}`, amount: vexp.amount, paymentMethodId: vexp.paymentMethodId, referenceNumber: `VEH-${vexp.vehicleId}`, relatedModule: 'vehicle', relatedId: vexp.vehicleId, notes: vexp.notes, createdAt: new Date().toISOString() };
    const newVehicleExp: VehicleExpense = { ...vexp, id: vexpId, expenseId: expId };
    setVehicleExpenses((prev) => [newVehicleExp, ...prev]); setExpenses((prev) => [expenseEntry, ...prev]);
    addAudit('CREATE', 'Vehicles', `Logged vehicle expense ₱${vexp.amount.toLocaleString()} for ${vexp.vehicleName} (${category})`);
  };

  const addPart = (part: Omit<Part, 'id'>) => { const newPart: Part = { ...part, id: `part-${Date.now()}` }; setParts((prev) => [...prev, newPart]); addAudit('CREATE', 'Inventory', `Added part ${part.name} [${part.partNumber}]`); };
  const updatePart = (id: string, updates: Partial<Part>) => { setParts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p))); addAudit('UPDATE', 'Inventory', `Updated part ${id}`); };
  const deletePart = (id: string) => { setParts((prev) => prev.filter((p) => p.id !== id)); addAudit('VOID', 'Inventory', `Removed part ${id}`); };
  const restockPart = (partId: string, quantityToAdd: number, unitCostPrice?: number) => {
    setParts((prev) => prev.map((p) => { if (p.id === partId) return { ...p, quantity: p.quantity + quantityToAdd, costPrice: unitCostPrice && unitCostPrice > 0 ? unitCostPrice : p.costPrice }; return p; }));
    addAudit('RESTOCK', 'Inventory', `Restocked part ${partId} by +${quantityToAdd} units`);
  };

  const addCustomer = (cust: Omit<Customer, 'id' | 'createdAt'>): string => {
    const id = `cust-${Date.now()}`; const newCust: Customer = { ...cust, id, createdAt: new Date().toISOString() };
    setCustomers((prev) => [...prev, newCust]); addAudit('CREATE', 'Customers', `Added customer ${cust.name}`); return id;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => { setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c))); };
  const deleteCustomer = (id: string) => { setCustomers((prev) => prev.filter((c) => c.id !== id)); };

  const addServiceCategory = (name: string, description?: string) => { setServiceCategories((prev) => [...prev, { id: `cat-service-${Date.now()}`, name: name.toUpperCase(), description }]); addAudit('SETTINGS', 'Categories', `Added service category ${name}`); };
  const deleteServiceCategory = (id: string) => { setServiceCategories((prev) => prev.filter((c) => c.id !== id)); };
  const updateServiceCategory = (id: string, name: string) => { setServiceCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: name.toUpperCase() } : c))); addAudit('SETTINGS', 'Categories', `Updated service category ${name}`); };
  const addRevenueCategory = (name: string, description?: string) => { setRevenueCategories((prev) => [...prev, { id: `cat-rev-${Date.now()}`, name: name.toUpperCase(), description }]); addAudit('SETTINGS', 'Categories', `Added revenue category ${name}`); };
  const deleteRevenueCategory = (id: string) => { setRevenueCategories((prev) => prev.filter((c) => c.id !== id)); };
  const updateRevenueCategory = (id: string, name: string) => { setRevenueCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: name.toUpperCase() } : c))); addAudit('SETTINGS', 'Categories', `Updated revenue category ${name}`); };
  const addExpenseCategory = (name: string, description?: string) => { setExpenseCategories((prev) => [...prev, { id: `cat-exp-${Date.now()}`, name: name.toUpperCase(), description }]); addAudit('SETTINGS', 'Categories', `Added expense category ${name}`); };
  const deleteExpenseCategory = (id: string) => { setExpenseCategories((prev) => prev.filter((c) => c.id !== id)); };
  const updateExpenseCategory = (id: string, name: string) => { setExpenseCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: name.toUpperCase() } : c))); addAudit('SETTINGS', 'Categories', `Updated expense category ${name}`); };
  const addPaymentMethod = (name: string, accountNumber?: string, accountHolder?: string) => { setPaymentMethods((prev) => [...prev, { id: `pm-${Date.now()}`, name, accountNumber, accountHolder }]); addAudit('SETTINGS', 'Payment', `Added payment method ${name}`); };
  const deletePaymentMethod = (id: string) => { setPaymentMethods((prev) => prev.filter((p) => p.id !== id)); };
  const updateCompanySettings = (settings: CompanySettings) => { setCompanySettings(settings); addAudit('SETTINGS', 'Company', 'Updated company profile information'); };

  const batchImportData = (result: ImportInspectionResult) => {
    if (result.detectedRevenue.length > 0) setRevenueTransactions((prev) => [...result.detectedRevenue, ...prev]);
    if (result.detectedExpenses.length > 0) setExpenses((prev) => [...result.detectedExpenses, ...prev]);
    if (result.detectedParts.length > 0) setParts((prev) => [...prev, ...result.detectedParts]);
    result.detectedCategories.forEach((catName) => {
      const upper = catName.toUpperCase();
      if (!revenueCategories.some((c) => c.name === upper)) setRevenueCategories((prev) => [...prev, { id: `cat-rev-${Date.now()}-${upper}`, name: upper }]);
      if (!expenseCategories.some((c) => c.name === upper)) setExpenseCategories((prev) => [...prev, { id: `cat-exp-${Date.now()}-${upper}`, name: upper }]);
    });
    result.detectedPaymentMethods.forEach((pmName) => {
      if (pmName && !paymentMethods.some((p) => p.name.toLowerCase() === pmName.toLowerCase())) setPaymentMethods((prev) => [...prev, { id: `pm-${Date.now()}-${pmName}`, name: pmName, accountNumber: 'Auto-imported' }]);
    });
    addAudit('IMPORT', 'Excel Import', `Imported ${result.totalRecords} records from ${result.fileName}: ₱${result.totalRevenueAmount.toLocaleString()} revenue, ₱${result.totalExpenseAmount.toLocaleString()} expenses.`);
  };

  const resetToDefaultData = () => { setRevenueTransactions([]); setExpenses([]); setCustomers([]); setEmployees([]); setPayrollRecords([]); setVehicles([]); setVehicleExpenses([]); setParts([]); setServiceJobs([]); setServiceCategories([]); setRevenueCategories([]); setExpenseCategories(defaultExpenseCategories); setPaymentMethods([]); setCompanySettings(emptyCompanySettings); setAuditLogs([]); };

  const exportDatabaseJSON = () => { const blob = new Blob([JSON.stringify({ exportDate: new Date().toISOString(), revenueTransactions, expenses, customers, employees, payrollRecords, vehicles, vehicleExpenses, parts, serviceJobs, serviceCategories, revenueCategories, expenseCategories, paymentMethods, companySettings, auditLogs }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `chaching-backup-${new Date().toISOString().split('T')[0]}.json`; link.click(); };

  const importDatabaseJSON = (jsonString: string): boolean => { try { const data = JSON.parse(jsonString); if (Array.isArray(data.revenueTransactions)) setRevenueTransactions(data.revenueTransactions); if (Array.isArray(data.expenses)) setExpenses(data.expenses); if (Array.isArray(data.customers)) setCustomers(data.customers); if (Array.isArray(data.employees)) setEmployees(data.employees); if (Array.isArray(data.payrollRecords)) setPayrollRecords(data.payrollRecords); if (Array.isArray(data.vehicles)) setVehicles(data.vehicles); if (Array.isArray(data.parts)) setParts(data.parts); if (Array.isArray(data.serviceJobs)) setServiceJobs(data.serviceJobs); if (Array.isArray(data.serviceCategories)) setServiceCategories(data.serviceCategories); if (Array.isArray(data.revenueCategories)) setRevenueCategories(data.revenueCategories); if (Array.isArray(data.expenseCategories)) setExpenseCategories(data.expenseCategories); if (Array.isArray(data.paymentMethods)) setPaymentMethods(data.paymentMethods); if (data.companySettings) setCompanySettings(data.companySettings); addAudit('SETTINGS', 'Database', 'Restored complete database backup from JSON file.'); return true; } catch (err) { console.error(err); return false; } };

  return (
    <AccountingContext.Provider value={{
      accounts, activeAccount, isAuthenticated: authIsAuthenticated, login, logout, createAccount, switchAccount,
      activeTab, setActiveTab, userRole, setUserRole, dateFilterPreset, setDateFilterPreset, dateRange, setCustomDateRange,
      revenueTransactions, expenses, customers, employees, payrollRecords, vehicles, vehicleExpenses, parts, serviceJobs,
      serviceCategories, revenueCategories, expenseCategories, paymentMethods, companySettings, auditLogs,
      financialSummary, getSummaryForRange, getYearlyMatrix,
      addRevenueTransaction, updateRevenueTransaction, voidRevenueTransaction,
      addExpense, updateExpense, voidExpense,
      createServiceJob, updateServiceJob, deleteServiceJob,
      addEmployee, updateEmployee, deleteEmployee, processPayroll,
      addVehicle, updateVehicle, deleteVehicle, addVehicleExpense,
      addPart, updatePart, deletePart, restockPart,
      addCustomer, updateCustomer, deleteCustomer,
      addServiceCategory, updateServiceCategory, deleteServiceCategory,
      addRevenueCategory, updateRevenueCategory, deleteRevenueCategory,
      addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
      addPaymentMethod, deletePaymentMethod, updateCompanySettings,
      batchImportData, resetToDefaultData, exportDatabaseJSON, importDatabaseJSON,
      isApiLoading: isLoadingData,
      workspaces: [], activeWorkspace,
      fetchWorkspaces, selectWorkspace, createWorkspace: authCreateWorkspace,
    }}>
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (!context) throw new Error('useAccounting must be used within an AccountingProvider');
  return context;
};
