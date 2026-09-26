import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActiveTab,
  AccountingAccount,
  Area,
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
import { useToast } from '../components/layout/ToastProvider';
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
  areas: Area[];
  paymentMethods: PaymentMethodItem[]; companySettings: CompanySettings; auditLogs: AuditLog[];
  financialSummary: FinancialSummary; getSummaryForRange: (range: DateFilterRange) => FinancialSummary;
  getYearlyMatrix: (year: number) => Array<{ monthIndex: number; monthName: string; revenue: number; expenses: number; netIncome: number }>;
  addRevenueTransaction: (data: Omit<RevenueTransaction, 'id' | 'createdAt'>) => Promise<string>;
  updateRevenueTransaction: (id: string, updates: Partial<RevenueTransaction>) => void;
  voidRevenueTransaction: (id: string) => void;
  addExpense: (data: Omit<Expense, 'id' | 'createdAt'>) => Promise<string>;
  updateExpense: (id: string, updates: Partial<Expense>) => void; voidExpense: (id: string) => void;
  createServiceJob: (job: Omit<ServiceJob, 'id' | 'createdAt'>) => Promise<string | null>;
  updateServiceJob: (id: string, updates: Partial<ServiceJob>) => void; deleteServiceJob: (id: string) => void;
  addEmployee: (employee: Omit<Employee, 'id'>) => void; updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void; processPayroll: (record: Omit<PayrollRecord, 'id' | 'createdAt'>) => void;
  updatePayroll: (id: string, record: Partial<PayrollRecord>) => void; deletePayroll: (id: string) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void; updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void; addVehicleExpense: (vexp: Omit<VehicleExpense, 'id'>) => Promise<boolean>;
  deleteVehicleExpense: (id: string) => void;
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
  updatePaymentMethod: (id: string, updates: { name?: string; accountNumber?: string; accountHolder?: string }) => void;
  deletePaymentMethod: (id: string) => void; updateCompanySettings: (settings: CompanySettings) => void;
  addArea: (name: string) => Promise<void>;
  updateArea: (id: string, name: string) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;
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
    relatedId: entry.relatedId,
    isVoid: false, voidReason: '',
    createdAt: entry.createdAt || new Date().toISOString(),
    area: entry.area || '',
  };
}

function mapBackendExpense(entry: any): Expense {
  return {
    id: entry._id || entry.id,
    date: entry.date ? entry.date.split('T')[0] : entry.date,
    category: entry.category || entry.categoryId || '',
    description: entry.description || '', amount: entry.amount || 0,
    paymentMethodId: entry.paymentMethod || 'Cash',
    area: entry.area || '',
    vendorSupplier: '', employeeId: entry.createdBy, employeeName: '',
    referenceNumber: entry.referenceNo || '', notes: '',
    relatedModule: entry.relatedModule || 'general', relatedId: entry.relatedId,
    isVoid: false, voidReason: '',
    createdAt: entry.createdAt || new Date().toISOString(),
  };
}

function mapBackendJob(order: any): ServiceJob {
  const partsUsed = Array.isArray(order.partsUsed)
    ? order.partsUsed.map((p: any) => ({
        partId: p.partId || p._id || '',
        partName: p.partName || '',
        partNumber: p.partNumber || '',
        quantity: Number(p.qty ?? p.quantity ?? 1),
        costPrice: Number(p.costPrice ?? p.unitPrice ?? 0),
        sellingPrice: Number(p.unitPrice ?? p.totalSelling ?? 0),
        totalCost: Number(p.totalCost ?? 0),
        totalSelling: Number(p.totalSelling ?? (Number(p.unitPrice ?? 0) * Number(p.qty ?? 1))),
      }))
    : [];
  const labor = Number(order.laborCost ?? order.laborAmount ?? 0);
  const total = Number(order.totalAmount ?? order.total ?? 0);
  return {
    id: order._id || order.id, jobNumber: order.jobNumber || `JOB-${order._id?.slice(-6) || Date.now()}`,
    customerId: order.customerId || '', customerName: order.customerName || '',
    date: order.date ? String(order.date).split('T')[0] : new Date().toISOString().split('T')[0],
    technicianId: order.assignedTechnician || order.technicianId || '', technicianName: order.technicianName || '',
    serviceCategory: order.serviceCategory || order.serviceCategoryId || '', description: order.description || '',
    laborAmount: labor, partsUsed, partsAmount: Number(order.partsAmount ?? 0), partsCostAmount: Number(order.partsCostAmount ?? 0),
    otherCharges: Number(order.otherCharges ?? 0),
    discountType: order.discountType === 'amount' ? 'amount' : 'percentage',
    discountValue: Number(order.discountValue ?? 0), discountAmount: Number(order.discountAmount ?? 0),
    subtotal: Number(order.subtotal ?? total), total,
    amountPaid: Number(order.amountPaid ?? 0), paymentMethodId: order.paymentMethodId || '',
    paymentStatus: (order.paymentStatus as ServiceJob['paymentStatus']) || 'Unpaid',
    status: (order.status as ServiceJob['status']) || 'open',
    notes: order.notes || '', revenueId: order.revenueId || undefined, expenseId: order.expenseId || undefined,
    area: order.area || '',
    customers: Array.isArray(order.customers)
      ? order.customers.map((c: any) => ({ customerId: c.customerId || '', name: c.name || '', amountCollected: Number(c.amountCollected || 0) }))
      : [],
    createdAt: order.createdAt || new Date().toISOString(),
  };
}

function mapBackendVehicleExpense(entry: any): VehicleExpense {
  return {
    id: entry._id || entry.id,
    vehicleId: entry.vehicleId,
    vehicleName: entry.vehicleName || '',
    date: entry.date ? String(entry.date).split('T')[0] : '',
    expenseType: entry.expenseType,
    amount: Number(entry.amount || 0),
    paymentMethodId: entry.paymentMethodId || 'Cash',
    area: entry.area || '',
    driverResponsible: entry.driverResponsible || '',
    odometer: Number(entry.odometer || 0),
    description: entry.description || '',
    notes: entry.notes || '',
    expenseId: entry.expenseId || undefined,
  };
}

function mapBackendPayroll(entry: any): PayrollRecord {
  return {
    ...entry,
    id: entry._id || entry.id,
    date: entry.date ? String(entry.date).split('T')[0] : '',
    employeeId: entry.employeeId || '',
    daysWorked: Number(entry.daysWorked || 0),
    dailyRate: Number(entry.dailyRate || 0),
    foodRate: Number(entry.foodRate || 0),
    coop: Number(entry.coop || 0),
    basicSalary: Number(entry.basicSalary || 0),
    overtimePay: Number(entry.overtimePay || 0),
    incentives: Number(entry.incentives || 0),
    foodAllowance: Number(entry.foodAllowance || 0),
    deductions: Number(entry.deductions || 0),
    grossSalary: Number(entry.grossSalary ?? entry.grossPay ?? 0),
    netSalary: Number(entry.netSalary ?? entry.netPay ?? 0),
    paymentMethodId: entry.paymentMethodId || '',
    createdAt: entry.createdAt || new Date().toISOString(),
  };
}

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, workspaces, activeWorkspaceId, activeWorkspace, isAuthenticated: authIsAuthenticated, isLoading: authIsLoading, login: authLogin, register: authRegister, logout: authLogout, selectWorkspace, createWorkspace: authCreateWorkspace, fetchWorkspaces } = useAuth();
  const toast = useToast();

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
  const [areas, setAreas] = useState<Area[]>([]);
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
        const [revData, expData, custData, jobData, catData, invData, payData, vehData, vexpData, empData, pmData, areaData] = await Promise.all([
          api.get<any[]>(`/api/${wsId}/revenue`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/expenses`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/customers`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/job-orders`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/categories`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/inventory`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/payroll`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/vehicles`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/vehicle-expenses`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/employees`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/payment-methods`).catch(() => []),
          api.get<any[]>(`/api/${wsId}/areas`).catch(() => []),
        ]);
        setRevenueTransactions(revData.map(mapBackendRevenue));
        setExpenses(expData.map(mapBackendExpense));
        setCustomers(custData.map((c: any) => ({ id: c._id, name: c.name, contact: c.phone || '', address: c.address || '', email: c.email || '', notes: '', createdAt: c.createdAt || new Date().toISOString() })));
        setServiceJobs(jobData.map(mapBackendJob));
        setServiceCategories(catData.filter((c: any) => c.type === 'service').map((c: any) => ({ id: c._id, name: c.name, description: c.description, isDefault: false })));
        setRevenueCategories(catData.filter((c: any) => c.type === 'revenue').map((c: any) => ({ id: c._id, name: c.name, description: c.description, isDefault: false })));
        setExpenseCategories(catData.filter((c: any) => c.type === 'expense').map((c: any) => ({ id: c._id, name: c.name, description: c.description, isDefault: false })));
        setParts(invData.map((p: any) => ({ id: p._id, partNumber: p.sku, name: p.partName, category: p.category || '', description: '', supplier: '', standardPrice: p.unitPrice, costPrice: p.unitPrice, sellingPrice: p.unitPrice, quantity: p.stock, minimumStock: p.reorderLevel, dateAdded: p.createdAt })));
        setPayrollRecords(payData.map(mapBackendPayroll));
        setVehicles(vehData.map((v: any) => ({ ...v, id: v._id })));
        setVehicleExpenses(vexpData.map(mapBackendVehicleExpense));
        setEmployees(empData.map((e: any) => ({ ...e, id: e._id })));
        setPaymentMethods(pmData.map((p: any) => ({ ...p, id: p._id })));
        setAreas(areaData.map((a: any) => ({ id: a._id, name: a.name })));
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
      const [revData, expData, custData, jobData, catData, invData, payData, vehData, vexpData, empData, pmData, areaData] = await Promise.all([
        api.get<any[]>(`/api/${wsId}/revenue`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/expenses`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/customers`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/job-orders`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/categories`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/inventory`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/payroll`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/vehicles`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/vehicle-expenses`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/employees`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/payment-methods`).catch(() => []),
        api.get<any[]>(`/api/${wsId}/areas`).catch(() => []),
      ]);
      setRevenueTransactions(revData.map(mapBackendRevenue));
      setExpenses(expData.map(mapBackendExpense));
      setCustomers(custData.map((c: any) => ({ id: c._id, name: c.name, contact: c.phone || '', address: c.address || '', email: c.email || '', notes: '', createdAt: c.createdAt || new Date().toISOString() })));
      setServiceJobs(jobData.map(mapBackendJob));
      setServiceCategories(catData.filter((c: any) => c.type === 'service').map((c: any) => ({ id: c._id, name: c.name, description: c.description, isDefault: false })));
      setRevenueCategories(catData.filter((c: any) => c.type === 'revenue').map((c: any) => ({ id: c._id, name: c.name, description: c.description, isDefault: false })));
      setExpenseCategories(catData.filter((c: any) => c.type === 'expense').map((c: any) => ({ id: c._id, name: c.name, description: c.description, isDefault: false })));
      setParts(invData.map((p: any) => ({ id: p._id, partNumber: p.sku, name: p.partName, category: p.category || '', description: '', supplier: '', standardPrice: p.unitPrice, costPrice: p.unitPrice, sellingPrice: p.unitPrice, quantity: p.stock, minimumStock: p.reorderLevel, dateAdded: p.createdAt })));
      setPayrollRecords(payData.map(mapBackendPayroll));
      setVehicles(vehData.map((v: any) => ({ ...v, id: v._id })));
      setVehicleExpenses(vexpData.map(mapBackendVehicleExpense));
      setEmployees(empData.map((e: any) => ({ ...e, id: e._id })));
      setPaymentMethods(pmData.map((p: any) => ({ ...p, id: p._id })));
      setAreas(areaData.map((a: any) => ({ id: a._id, name: a.name })));
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
      toast.success('Collection updated');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to update collection'); }
  };

  const voidRevenueTransaction = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/revenue/${id}`);
      addAudit('VOID', 'Revenue', `Deleted revenue transaction ${id}`);
      toast.success('Collection deleted');
      await refetchAllData();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to delete collection');
    }
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
      toast.success('Expense updated');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to update expense'); }
  };

  const voidExpense = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/expenses/${id}`);
      addAudit('VOID', 'Expenses', `Deleted expense ${id}`);
      toast.success('Expense deleted');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to delete expense'); }
  };

  const createServiceJob = async (jobData: Omit<ServiceJob, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const result = await api.post<{ _id?: string }>(`/api/${activeWorkspaceId}/job-orders`, {
        customerId: jobData.customerId,
        customerName: jobData.customerName,
        serviceCategoryId: jobData.serviceCategory,
        serviceCategory: jobData.serviceCategory,
        jobNumber: jobData.jobNumber,
        assignedTechnician: jobData.technicianId,
        technicianName: jobData.technicianName,
        area: jobData.area || '',
        customers: jobData.customers || [],
        description: jobData.description,
        laborCost: jobData.laborAmount,
        laborAmount: jobData.laborAmount,
        partsUsed: jobData.partsUsed,
        partsAmount: jobData.partsAmount,
        partsCostAmount: jobData.partsCostAmount,
        otherCharges: jobData.otherCharges,
        discountType: jobData.discountType,
        discountValue: jobData.discountValue,
        discountAmount: jobData.discountAmount,
        subtotal: jobData.subtotal,
        totalAmount: jobData.total,
        total: jobData.total,
        amountPaid: jobData.amountPaid,
        paymentMethodId: jobData.paymentMethodId,
        paymentStatus: jobData.paymentStatus,
        status: jobData.status || 'open',
        date: jobData.date,
        notes: jobData.notes || '',
      });
      addAudit('CREATE', 'Jobs', `Created service job ${jobData.jobNumber}`);
      await refetchAllData();
      return result._id || `job-${Date.now()}`;
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to create job order');
      return null;
    }
  };

  const updateServiceJob = async (id: string, updates: Partial<ServiceJob>) => {
    try {
      const payload: Record<string, unknown> = { ...updates };
      if (updates.laborAmount !== undefined) payload.laborCost = updates.laborAmount;
      if (updates.total !== undefined) payload.totalAmount = updates.total;
      if (updates.technicianId !== undefined) payload.assignedTechnician = updates.technicianId;
      await api.put(`/api/${activeWorkspaceId}/job-orders/${id}`, payload);
      addAudit('UPDATE', 'Jobs', `Updated service job ${updates.jobNumber || id}`);
      toast.success('Job order updated');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to update job order'); }
  };

  const deleteServiceJob = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/job-orders/${id}`);
      addAudit('VOID', 'Jobs', `Removed service job ${id}`);
      toast.success('Job order deleted');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to delete job order'); }
  };

  const addEmployee = async (emp: Omit<Employee, 'id'>) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/employees`, { name: emp.name, position: emp.position, dailyRate: emp.dailyRate, monthlySalary: emp.monthlySalary, basicSalary: emp.basicSalary, status: emp.status, dateStarted: emp.dateStarted, phone: emp.phone, area: emp.area });
      addAudit('CREATE', 'Employees', `Added employee ${emp.name}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/employees/${id}`, updates);
      addAudit('UPDATE', 'Employees', `Updated employee ${id}`);
      toast.success('Employee updated');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to update employee'); }
  };

  const deleteEmployee = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/employees/${id}`);
      addAudit('VOID', 'Employees', `Deleted employee ${id}`);
      toast.success('Employee deleted');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to delete employee'); }
  };

  const processPayroll = async (record: Omit<PayrollRecord, 'id' | 'createdAt'>) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/payroll`, {
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        date: record.date,
        period: record.period,
        daysWorked: record.daysWorked,
        dailyRate: record.dailyRate,
        foodRate: record.foodRate,
        basicSalary: record.basicSalary,
        overtimePay: record.overtimePay,
        incentives: record.incentives,
        coop: record.coop,
        foodAllowance: record.foodAllowance,
        deductions: record.deductions,
        grossSalary: record.grossSalary,
        netSalary: record.netSalary,
        paymentMethodId: record.paymentMethodId,
        notes: record.notes || '',
      });
      addAudit('CREATE', 'Payroll', `Processed payroll for ${record.employeeName}`);
      toast.success('Payroll processed and posted to expenses');
      await refetchAllData();
    } catch (e) {
      console.error(e);
      toast.error('Failed to process payroll');
    }
  };

  const updatePayroll = async (id: string, record: Partial<PayrollRecord>) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/payroll/${id}`, {
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        date: record.date,
        period: record.period,
        daysWorked: record.daysWorked,
        dailyRate: record.dailyRate,
        foodRate: record.foodRate,
        basicSalary: record.basicSalary,
        overtimePay: record.overtimePay,
        incentives: record.incentives,
        coop: record.coop,
        foodAllowance: record.foodAllowance,
        deductions: record.deductions,
        grossSalary: record.grossSalary,
        netSalary: record.netSalary,
        paymentMethodId: record.paymentMethodId,
        notes: record.notes || '',
      });
      addAudit('UPDATE', 'Payroll', `Updated payroll voucher for ${record.employeeName || id}`);
      toast.success('Payroll voucher updated and ledger re-synced');
      await refetchAllData();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update payroll voucher');
    }
  };

  const deletePayroll = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/payroll/${id}`);
      addAudit('VOID', 'Payroll', `Deleted payroll voucher ${id}`);
      toast.success('Payroll voucher deleted');
      await refetchAllData();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete payroll voucher');
    }
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
      toast.success('Vehicle updated');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to update vehicle'); }
  };

  const deleteVehicle = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/vehicles/${id}`);
      addAudit('VOID', 'Vehicles', `Deleted vehicle ${id}`);
      toast.success('Vehicle deleted');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to delete vehicle'); }
  };

  const addVehicleExpense = async (vexp: Omit<VehicleExpense, 'id'>): Promise<boolean> => {
    try {
      await api.post(`/api/${activeWorkspaceId}/vehicle-expenses`, { vehicleId: vexp.vehicleId, vehicleName: vexp.vehicleName, date: vexp.date, expenseType: vexp.expenseType, amount: vexp.amount, paymentMethodId: vexp.paymentMethodId, area: vexp.area || '', driverResponsible: vexp.driverResponsible, odometer: vexp.odometer, description: vexp.description, notes: vexp.notes });
      addAudit('CREATE', 'Vehicles', `Logged vehicle expense ₱${vexp.amount}`);
      toast.success('Vehicle expense logged and posted to expenses');
      await refetchAllData();
      return true;
    } catch (e) {
      console.error(e);
      toast.error('Failed to log vehicle expense');
      return false;
    }
  };

  const deleteVehicleExpense = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/vehicle-expenses/${id}`);
      addAudit('VOID', 'Vehicles', `Deleted vehicle expense ${id}`);
      toast.success('Vehicle expense deleted');
      await refetchAllData();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete vehicle expense');
    }
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
      toast.success('Inventory item updated');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to update inventory item'); }
  };

  const deletePart = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/inventory/${id}`);
      addAudit('VOID', 'Inventory', `Removed part ${id}`);
      toast.success('Inventory item deleted');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to delete inventory item'); }
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
      toast.success('Customer updated');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to update customer'); }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await api.delete(`/api/${activeWorkspaceId}/customers/${id}`);
      addAudit('VOID', 'Customers', `Deleted customer ${id}`);
      toast.success('Customer deleted');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to delete customer'); }
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
      toast.success('Service category deleted');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to delete service category'); }
  };

  const updateServiceCategory = async (id: string, name: string) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/categories/${id}`, { name });
      toast.success('Service category updated');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to update service category'); }
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
      toast.success('Revenue category deleted');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to delete revenue category'); }
  };

  const updateRevenueCategory = async (id: string, name: string) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/categories/${id}`, { name });
      toast.success('Revenue category updated');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to update revenue category'); }
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
      toast.success('Expense category deleted');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to delete expense category'); }
  };

  const updateExpenseCategory = async (id: string, name: string) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/categories/${id}`, { name });
      toast.success('Expense category updated');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to update expense category'); }
  };

  const addPaymentMethod = async (name: string, accountNumber?: string, accountHolder?: string) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/payment-methods`, { name, accountNumber, accountHolder });
      addAudit('SETTINGS', 'Payment', `Added payment method ${name}`);
      await refetchAllData();
    } catch (e) { console.error(e); }
  };

  const updatePaymentMethod = async (id: string, updates: { name?: string; accountNumber?: string; accountHolder?: string }) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/payment-methods/${id}`, updates);
      addAudit('SETTINGS', 'Payment', `Updated payment method ${updates.name || id}`);
      toast.success('Payment method updated');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to update payment method'); }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      const pm = paymentMethods.find((p) => p.id === id);
      await api.delete(`/api/${activeWorkspaceId}/payment-methods/${id}`);
      addAudit('VOID', 'Payment', `Deleted payment method ${pm?.name || id}`);
      toast.success('Payment method deleted');
      await refetchAllData();
    } catch (e) { console.error(e); toast.error('Failed to delete payment method'); }
  };

  const addArea = async (name: string) => {
    try {
      await api.post(`/api/${activeWorkspaceId}/areas`, { name });
      addAudit('SETTINGS', 'Areas', `Added area ${name}`);
      toast.success('Area added');
      await refetchAllData();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to add area');
    }
  };

  const updateArea = async (id: string, name: string) => {
    try {
      await api.put(`/api/${activeWorkspaceId}/areas/${id}`, { name });
      addAudit('SETTINGS', 'Areas', `Renamed area to ${name}`);
      toast.success('Area updated');
      await refetchAllData();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update area');
    }
  };

  const deleteArea = async (id: string) => {
    try {
      const area = areas.find((a) => a.id === id);
      await api.delete(`/api/${activeWorkspaceId}/areas/${id}`);
      addAudit('VOID', 'Areas', `Deleted area ${area?.name || id}`);
      toast.success('Area deleted');
      await refetchAllData();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to delete area');
    }
  };

  const updateCompanySettings = async (settings: CompanySettings) => {
    setCompanySettings(settings);
    addAudit('SETTINGS', 'Company', 'Updated company profile information');
    toast.success('Company profile updated');
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

  const resetToDefaultData = () => { setRevenueTransactions([]); setExpenses([]); setCustomers([]); setEmployees([]); setPayrollRecords([]); setVehicles([]); setVehicleExpenses([]); setParts([]); setServiceJobs([]); setServiceCategories([]); setRevenueCategories([]); setExpenseCategories(defaultExpenseCategories); setPaymentMethods([]); setAreas([]); setCompanySettings(emptyCompanySettings); setAuditLogs([]); };

  const exportDatabaseJSON = () => { const blob = new Blob([JSON.stringify({ exportDate: new Date().toISOString(), revenueTransactions, expenses, customers, employees, payrollRecords, vehicles, vehicleExpenses, parts, serviceJobs, serviceCategories, revenueCategories, expenseCategories, paymentMethods, companySettings, auditLogs }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `chaching-backup-${new Date().toISOString().split('T')[0]}.json`; link.click(); };

  const importDatabaseJSON = (jsonString: string): boolean => { try { const data = JSON.parse(jsonString); if (Array.isArray(data.revenueTransactions)) setRevenueTransactions(data.revenueTransactions); if (Array.isArray(data.expenses)) setExpenses(data.expenses); if (Array.isArray(data.customers)) setCustomers(data.customers); if (Array.isArray(data.employees)) setEmployees(data.employees); if (Array.isArray(data.payrollRecords)) setPayrollRecords(data.payrollRecords); if (Array.isArray(data.vehicles)) setVehicles(data.vehicles); if (Array.isArray(data.vehicleExpenses)) setVehicleExpenses(data.vehicleExpenses); if (Array.isArray(data.parts)) setParts(data.parts); if (Array.isArray(data.serviceJobs)) setServiceJobs(data.serviceJobs); if (Array.isArray(data.serviceCategories)) setServiceCategories(data.serviceCategories); if (Array.isArray(data.revenueCategories)) setRevenueCategories(data.revenueCategories); if (Array.isArray(data.expenseCategories)) setExpenseCategories(data.expenseCategories); if (Array.isArray(data.paymentMethods)) setPaymentMethods(data.paymentMethods); if (data.companySettings) setCompanySettings(data.companySettings); addAudit('SETTINGS', 'Database', 'Restored complete database backup from JSON file.'); return true; } catch (err) { console.error(err); return false; } };

  return (
    <AccountingContext.Provider value={{
      accounts, activeAccount, isAuthenticated: authIsAuthenticated, login, logout, createAccount, switchAccount,
      activeTab, setActiveTab, userRole, setUserRole, dateFilterPreset, setDateFilterPreset, dateRange, setCustomDateRange,
      revenueTransactions, expenses, customers, employees, payrollRecords, vehicles, vehicleExpenses, parts, serviceJobs,
      serviceCategories, revenueCategories, expenseCategories, paymentMethods, companySettings, auditLogs,
      areas,
      financialSummary, getSummaryForRange, getYearlyMatrix,
      addRevenueTransaction, updateRevenueTransaction, voidRevenueTransaction,
      addExpense, updateExpense, voidExpense,
      createServiceJob, updateServiceJob, deleteServiceJob,
      addEmployee, updateEmployee, deleteEmployee, processPayroll, updatePayroll, deletePayroll,
      addVehicle, updateVehicle, deleteVehicle, addVehicleExpense, deleteVehicleExpense,
      addPart, updatePart, deletePart, restockPart,
      addCustomer, updateCustomer, deleteCustomer,
      addServiceCategory, updateServiceCategory, deleteServiceCategory,
      addRevenueCategory, updateRevenueCategory, deleteRevenueCategory,
      addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
      addPaymentMethod, updatePaymentMethod, deletePaymentMethod, updateCompanySettings,
      addArea, updateArea, deleteArea,
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
