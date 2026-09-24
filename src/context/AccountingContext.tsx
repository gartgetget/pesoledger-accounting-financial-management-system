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
  addRevenueTransaction: (data: Omit<RevenueTransaction, 'id' | 'createdAt'>) => Promise<string>;
  updateRevenueTransaction: (id: string, updates: Partial<RevenueTransaction>) => void;
  voidRevenueTransaction: (id: string, reason: string) => void;
  addExpense: (data: Omit<Expense, 'id' | 'createdAt'>) => Promise<string>;
  updateExpense: (id: string, updates: Partial<Expense>) => void; voidExpense: (id: string, reason: string) => void;
  createServiceJob: (job: Omit<ServiceJob, 'id' | 'createdAt'>) => Promise<string>;
  updateServiceJob: (id: string, updates: Partial<ServiceJob>) => void; deleteServiceJob: (id: string) => void;
  addEmployee: (employee: Omit<Employee, 'id'>) => void; updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void; processPayroll: (record: Omit<PayrollRecord, 'id' | 'createdAt'>) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void; updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void; addVehicleExpense: (vexp: Omit<VehicleExpense, 'id'>) => void;
  addPart: (part: Omit<Part, 'id'>) => void; updatePart: (id: string, updates: Partial<Part>) => void;
  deletePart: (id: string) => void; restockPart: (partId: string, quantityToAdd: number, unitCostPrice?: number) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<string>;
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
  const { user, workspaces, activeWorkspaceId, activeWorkspace, isAuthenticated: authIsAuthenticated, isLoading: authIsLoading, login: authLogin, register: authRegister, logout: authLogout, selectWorkspace, createWorkspace: authCreateWorkspace, fetchWorkspaces } = useAuth();

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
        const [revData, expData, custData, jobData, catData, invData, payData, vehData, empData, pmData] = await Promise.all([
          api.get<any[]>(`/api/${wsId}/revenue`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/expenses`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/customers`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/job-orders`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/categories`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/inventory`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/payroll`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/vehicles`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/employees`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/payment-methods`).catch(() => []),
        ]);
        setRevenueTransactions(revData.map(mapBackendRevenue));
        setExpenses(expData.map(mapBackendExpense));
        setCustomers(custData.map((c: any) => ({ id: c._id, name: c.name, contact: c.phone || '', address: c.address || '', email: c.email || '', notes: '', createdAt: c.createdAt || new Date().toISOString() })));
        setServiceJobs(jobData.map(mapBackendJob));
        setServiceCategories(catData.filter((c: any) => c.type === 'service').map((c: any) => ({ id: c._id, name: c.name, description: c.description, isDefault: false })));
        setRevenueCategories(catData.filter((c: any) => c.type === 'revenue').map((c: any) => ({ id: c._id, name: c.name, description: c.description, isDefault: false })));
        setExpenseCategories(catData.filter((c: any) => c.type === 'expense').map((c: any) => ({ id: c._id, name: c.name, description: c.description, isDefault: false })));
        setParts(invData.map((p: any) => ({ id: p._id, partNumber: p.sku, name: p.partName, category: p.category || '', description: '', supplier: '', standardPrice: p.unitPrice, costPrice: p.unitPrice, sellingPrice: p.unitPrice, quantity: p.stock, minimumStock: p.reorderLevel, dateAdded: p.createdAt })));
        setPayrollRecords(payData.map((p: any) => ({ ...p, id: p._id })));
        setVehicles(vehData.map((v: any) => ({ ...v, id: v._id })));
        setVehicleExpenses([]);
        setEmployees(empData.map((e: any) => ({ ...e, id: e._id })));
        setPaymentMethods(pmData.map((p: any) => ({ ...p, id: p._id })));
      } catch (e) {
        console.error('Failed to fetch workspace data', e);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchAllData();
  }, [activeWorkspaceId, authIsAuthenticated]);

  const refetchAllData = async () => {
    if (!activeWorkspaceId || !authIsAuthenticated) return;
    try {
      const wsId = activeWorkspaceId;
      const [revData, expData, custData, jobData, catData, invData, payData, vehData, empData, pmData] = await Promise.all([
        api.get<any[]>(`/api/${wsId}/revenue`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/expenses`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/customers`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/job-orders`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/categories`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/inventory`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/payroll`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/vehicles`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/employees`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/payment-methods`).catch(() => []),
      ]);
      setRevenueTransactions(revData.map(mapBackendRevenue));
      setExpenses(expData.map(mapBackendExpense));
      setCustomers(custData.map((c: any) => ({ id: c._id, name: c.name, contact: c.phone || '', address: c.address || '', email: c.email || '', notes: '', createdAt: c.createdAt || new Date().toISOString() })));
      setServiceJobs(jobData.map(mapBackendJob));
      setServiceCategories(catData.filter((c: any) => c.type === 'service').map((c: any) => ({ id: c._id, name: c.name, description: c.description, isDefault: false })));
      setRevenueCategories(catData.filter((c: any) => c.type === 'revenue').map((c: any) => ({ id: c._id, name: c.name, description: c.description, isDefault: false })));
      setExpenseCategories(catData.filter((c: any) => c.type === 'expense').map((c: any) => ({ id: c._id, name: c.name, description: c.description, isDefault: false })));
      setParts(invData.map((p: any) => ({ id: p._id, partNumber: p.sku, name: p.partName, category: p.category || '', description: '', supplier: '', standardPrice: p.unitPrice, costPrice: p.unitPrice, sellingPrice: p.unitPrice, quantity: p.stock, minimumStock: p.reorderLevel, dateAdded: p.createdAt })));
      setPayrollRecords(payData.map((p: any) => ({ ...p, id: p._id })));
      setVehicles(vehData.map((v: any) => ({ ...v, id: v._id })));
      setVehicleExpenses([]);
      setEmployees(empData.map((e: any) => ({ ...e, id: e._id })));
      setPaymentMethods(pmData.map((p: any) => ({ ...p, id: p._id })));
    } catch (e) {
      console.error('Failed to refetch workspace data', e);
    }
  };

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

  const addRevenueTransaction = async (data: Omit<RevenueTransaction, 'id' | 'createdAt'>): Promise<string> => {
    const invoiceNumber = data.invoiceNumber?.trim() ? data.invoiceNumber : `INV-${new Date().getFullYear()}-${String(revenueTransactions.length + 1).padStart(4, '0')}`;
    const entry = { ...data, referenceNo: invoiceNumber, amount: data.amount };
    try {
      const result = await api.post<{ _id?: string }>(`/api/${activeWorkspaceId}/revenue`, entry);
      addAudit('CREATE', 'Revenue', `Created invoice ${invoiceNumber} for ₱${data.amount.toLocaleString()}`);
      await refetchAllData();
      return result._id || invoiceNumber;
    } catch (e) { console.error(e); return invoiceNumber; }
  };

  const updateRevenueTransaction = async (id: string, updates: Partial<RevenueTransaction>) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/revenue/${id}`, updates);
      addAudit('UPDATE', 'Revenue', `Updated transaction ${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const voidRevenueTransaction = async (id: string, reason: string) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/revenue/${id}`, { isVoid: true, voidReason: reason });
      addAudit('VOID', 'Revenue', `Voided revenue transaction ${id}: ${reason}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const addExpense = async (data: Omit<Expense, 'id' | 'createdAt'>): Promise<string> => {
    const entry = { ...data, amount: data.amount };
    try {
      const result = await api.post<{ _id?: string }>(`/api/${activeWorkspaceId}/expenses`, entry);
      addAudit('CREATE', 'Expenses', `Logged expense ₱${data.amount.toLocaleString()} [${data.category}]`);
      await refetchAllData();
      return result._id || `exp-${Date.now()}`;
    } catch (e) { console.error(e); return `exp-${Date.now()}`; }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/expenses/${id}`, updates);
      addAudit('UPDATE', 'Expenses', `Updated expense ${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const voidExpense = async (id: string, reason: string) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/expenses/${id}`, { isVoid: true, voidReason: reason });
      addAudit('VOID', 'Expenses', `Voided expense ${id}: ${reason}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const createServiceJob = async (jobData: Omit<ServiceJob, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const result = await api.post<{ _id?: string }>(`/api/${activeWorkspaceId}/job-orders`, {
        customerId: jobData.customerId, serviceCategoryId: jobData.serviceCategory,
        jobNumber: jobData.jobNumber, assignedTechnician: jobData.technicianId,
        description: jobData.description, laborCost: jobData.laborAmount,
        partsUsed: jobData.partsUsed, totalAmount: jobData.total, status: 'open'
      });
      addAudit('CREATE', 'Jobs', `Created service job ${jobData.jobNumber}`);
      await refetchAllData();
      return result._id || `job-${Date.now()}`;
    } catch (e) { console.error(e); return `job-${Date.now()}`; }
  };

  const updateServiceJob = async (id: string, updates: Partial<ServiceJob>) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/job-orders/${id}`, updates);
      addAudit('UPDATE', 'Jobs', `Updated service job ${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const deleteServiceJob = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/job-orders/${id}`);
      addAudit('VOID', 'Jobs', `Removed service job ${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const addEmployee = async (emp: Omit<Employee, 'id'>) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/employees`, { name: emp.name, position: emp.position, dailyRate: emp.dailyRate, monthlySalary: emp.monthlySalary, basicSalary: emp.basicSalary, status: emp.status, dateStarted: emp.dateStarted, phone: emp.phone });
      addAudit('CREATE', 'Employees', `Added employee ${emp.name}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/employees/${id}`, updates);
      addAudit('UPDATE', 'Employees', `Updated employee ${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const deleteEmployee = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/employees/${id}`);
      addAudit('VOID', 'Employees', `Deleted employee ${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const processPayroll = async (record: Omit<PayrollRecord, 'id' | 'createdAt'>) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/payroll`, { employeeName: record.employeeName, period: record.period, grossPay: record.grossSalary, deductions: record.deductions, netPay: record.netSalary });
      addAudit('CREATE', 'Payroll', `Processed payroll for ${record.employeeName}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const addVehicle = async (veh: Omit<Vehicle, 'id'>) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/vehicles`, { vehicleName: veh.vehicleName, plateNumber: veh.plateNumber, model: veh.model, assignedDriver: veh.assignedDriver });
      addAudit('CREATE', 'Vehicles', `Added vehicle ${veh.vehicleName}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/vehicles/${id}`, updates);
      addAudit('UPDATE', 'Vehicles', `Updated vehicle ${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const deleteVehicle = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/vehicles/${id}`);
      addAudit('VOID', 'Vehicles', `Deleted vehicle ${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const addVehicleExpense = async (vexp: Omit<VehicleExpense, 'id'>) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/vehicle-expenses`, { vehicleId: vexp.vehicleId, vehicleName: vexp.vehicleName, date: vexp.date, expenseType: vexp.expenseType, amount: vexp.amount, paymentMethodId: vexp.paymentMethodId, driverResponsible: vexp.driverResponsible, odometer: vexp.odometer, description: vexp.description, notes: vexp.notes });
      addAudit('CREATE', 'Vehicles', `Logged vehicle expense ₱${vexp.amount}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const addPart = async (part: Omit<Part, 'id'>) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/inventory`, { partName: part.name, sku: part.partNumber, category: part.category, stock: part.quantity, unitPrice: part.sellingPrice, reorderLevel: part.minimumStock });
      addAudit('CREATE', 'Inventory', `Added part ${part.name}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const updatePart = async (id: string, updates: Partial<Part>) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/inventory/${id}`, updates);
      addAudit('UPDATE', 'Inventory', `Updated part ${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const deletePart = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/inventory/${id}`);
      addAudit('VOID', 'Inventory', `Removed part ${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const restockPart = async (partId: string, quantityToAdd: number, unitCostPrice?: number) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/inventory/${partId}/adjust-stock`, { quantity: quantityToAdd, reason: 'Restock' });
      addAudit('RESTOCK', 'Inventory', `Restocked part ${partId} by +${quantityToAdd} units`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const addCustomer = async (cust: Omit<Customer, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const result = await api.post<{ _id?: string }>(`/api/${activeWorkspaceId}/customers`, { name: cust.name, phone: cust.contact, email: cust.email, address: cust.address });
      addAudit('CREATE', 'Customers', `Added customer ${cust.name}`);
      await refetchAllData();
      return result._id || `cust-${Date.now()}`;
    } catch (e) { console.error(e); return `cust-${Date.now()}`; }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/customers/${id}`, updates);
      addAudit('UPDATE', 'Customers', `Updated customer ${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/customers/${id}`);
      addAudit('VOID', 'Customers', `Deleted customer ${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const addServiceCategory = async (name: string, description?: string) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/categories`, { workspaceId: activeWorkspaceId, type: 'service', name, description });
      addAudit('SETTINGS', 'Categories', `Added service category ${name}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const deleteServiceCategory = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/categories/${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const updateServiceCategory = async (id: string, name: string) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/categories/${id}`, { name });
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const addRevenueCategory = async (name: string, description?: string) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/categories`, { workspaceId: activeWorkspaceId, type: 'revenue', name, description });
      addAudit('SETTINGS', 'Categories', `Added revenue category ${name}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const deleteRevenueCategory = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/categories/${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const updateRevenueCategory = async (id: string, name: string) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/categories/${id}`, { name });
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const addExpenseCategory = async (name: string, description?: string) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/categories`, { workspaceId: activeWorkspaceId, type: 'expense', name, description });
      addAudit('SETTINGS', 'Categories', `Added expense category ${name}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const deleteExpenseCategory = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/categories/${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const updateExpenseCategory = async (id: string, name: string) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/categories/${id}`, { name });
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const addPaymentMethod = async (name: string, accountNumber?: string, accountHolder?: string) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/payment-methods`, { name, accountNumber, accountHolder });
      addAudit('SETTINGS', 'Payment', `Added payment method ${name}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/payment-methods/${id}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const updateCompanySettings = async (settings: CompanySettings) => {
    setCompanySettings(settings);
    addAudit('SETTINGS', 'Company', 'Updated company profile information');
  };

  const batchImportData = async (result: ImportInspectionResult) => {
    try {
      for (const rev of result.detectedRevenue) {
        await api.post(`/api/${activeWorkspaceId}/revenue`, { date: rev.date, amount: rev.amount, description: rev.description });
      }
      for (const exp of result.detectedExpenses) {
        await api.post(`/api/${activeWorkspaceId}/expenses`, { date: exp.date, amount: exp.amount, category: exp.category, description: exp.description });
      }
      addAudit('IMPORT', 'Excel Import', `Imported ${result.totalRecords} records: ₱${result.totalRevenueAmount.toLocaleString()} revenue, ₱${result.totalExpenseAmount.toLocaleString()} expenses.`);
      await refetchAllData();
    } catch (e) { console.error(e); }
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
      workspaces, activeWorkspace,
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
