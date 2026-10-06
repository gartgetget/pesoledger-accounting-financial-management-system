export type UserRole = 'admin' | 'staff';

export interface AccountingAccount {
  id: string;
  name: string;
  createdAt: string;
  password?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  address: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  dailyRate: number;
  monthlySalary?: number;
  basicSalary?: number;
  status?: 'Active' | 'Inactive';
  dateStarted?: string;
  phone?: string;
  contact?: string;
  area?: string;
}

export interface Area {
  id: string;
  name: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  period: string; // e.g. "Sept 1 - Sept 15, 2026"
  daysWorked?: number;
  dailyRate?: number;
  foodRate?: number;
  coop?: number;
  basicSalary: number;
  overtimeHours?: number;
  overtimePay: number;
  incentives: number;
  foodAllowance: number;
  perfectAttendance?: number;
  otherAdditions?: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  paymentMethodId: string;
  notes?: string;
  expenseId?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  vehicleName: string;
  plateNumber: string;
  model: string;
  assignedDriver?: string;
  status?: 'Active' | 'Under Maintenance' | 'Inactive';
}

export interface VehicleExpense {
  id: string;
  vehicleId: string;
  vehicleName: string;
  date: string;
  expenseType: 'Fuel/Gas' | 'Maintenance' | 'Repairs' | 'Toll' | 'Parking' | 'Other';
  amount: number;
  paymentMethodId: string;
  area?: string;
  driverResponsible?: string;
  odometer?: number;
  description: string;
  notes?: string;
  expenseId?: string;
}

export interface Part {
  id: string;
  partNumber: string;
  name: string;
  category: string;
  description?: string;
  supplier?: string;
  standardPrice?: number;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  minimumStock: number;
  dateAdded?: string;
}

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid';
export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export interface JobCustomer {
  customerId: string;
  name: string;
  amountCollected: number;
  paymentMethodId: string;
  serviceCategory: string;
  parts: JobPartLine[];
  installationMaterials: string;
  installationMaterialsPrice: number;
  referral: string;
  referralAmount: number;
}

export interface JobPartLine {
  sku: string;
  invoice: string;
  description: string;
  price: number;
}

export interface ServiceJob {
  id: string;
  jobNumber: string; // e.g. "JOB-2026-001"
  customerId: string;
  customerName: string;
  area?: string;
  customers?: JobCustomer[];
  date: string;
  technicianId: string;
  technicianName: string;
  description: string;
  laborAmount: number;
  otherCharges: number;
  discountType: 'percentage' | 'amount';
  discountValue: number;
  discountAmount: number;
  subtotal: number;
  total: number;
  amountPaid: number;
  paymentMethodId: string;
  paymentStatus: PaymentStatus;
  status: JobStatus;
  notes?: string;
  revenueId?: string;
  expenseId?: string;
  jobPartsExpense?: number;
  jobReferralExpense?: number;
  createdAt: string;
}

export interface RevenueTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  serviceType: string;
  category: string; // REF/AC, WM/TV, PARAÑAQUE, JIM/EUGENE, etc.
  description: string;
  originalAmount: number;
  discount: number;
  amount: number; // final net amount
  paymentMethodId: string;
  employeeId?: string;
  employeeName?: string;
  notes?: string;
  serviceJobId?: string;
  relatedId?: string;
  area?: string;
  isVoid?: boolean;
  voidReason?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: string; // GAS, SALARY, DAILY EXPENSES & SAVINGS, SASAKYAN, etc.
  description: string;
  amount: number;
  paymentMethodId: string;
  area?: string;
  vendorSupplier?: string;
  employeeId?: string;
  employeeName?: string;
  referenceNumber?: string;
  notes?: string;
  relatedModule?: 'salary' | 'vehicle' | 'daily' | 'job' | 'general';
  relatedId?: string;
  isVoid?: boolean;
  voidReason?: string;
  createdAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface PaymentMethodItem {
  id: string;
  name: string;
  accountNumber?: string;
  accountHolder?: string;
  isDefault?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'VOID' | 'IMPORT' | 'RESTOCK' | 'SETTINGS';
  module: string;
  details: string;
}

export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  tin?: string;
  tinNumber: string;
  currencySymbol: string;
  currencyCode: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'revenue'
  | 'expenses'
  | 'daily'
  | 'jobs'
  | 'payroll'
  | 'vehicles'
  | 'customers'
  | 'reports'
  | 'monthly'
  | 'yearly'
  | 'migration'
  | 'settings';
