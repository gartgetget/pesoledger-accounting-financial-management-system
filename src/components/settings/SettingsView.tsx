import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  ShieldAlert,
  Building,
  Layers,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { PaymentMethodsCard } from './PaymentMethodsCard';

export const SettingsView: React.FC = () => {
  const {
    accounts,
    activeAccount,
    createAccount,
    switchAccount,
    companySettings,
    updateCompanySettings,
    serviceCategories,
    revenueCategories,
    expenseCategories,
    userRole,
    setUserRole,
    addServiceCategory,
    updateServiceCategory,
    deleteServiceCategory,
    addRevenueCategory,
    updateRevenueCategory,
    deleteRevenueCategory,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
  } = useAccounting();

  // Settings form states
  const [compName, setCompName] = useState(companySettings.name);
  const [compAddress, setCompAddress] = useState(companySettings.address);
  const [compPhone, setCompPhone] = useState(companySettings.phone);
  const [compEmail, setCompEmail] = useState(companySettings.email);
  const [compTin, setCompTin] = useState(companySettings.tin);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  // New category inputs
  const [newServiceCat, setNewServiceCat] = useState('');
  const [newRevCat, setNewRevCat] = useState('');
  const [newExpCat, setNewExpCat] = useState('');
  const [editingCategory, setEditingCategory] = useState<{
    type: 'service' | 'revenue' | 'expense';
    id: string;
    name: string;
  } | null>(null);

  const [newAccountName, setNewAccountName] = useState('');

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings({
      ...companySettings,
      name: compName.trim(),
      address: compAddress.trim(),
      phone: compPhone.trim(),
      email: compEmail.trim(),
      tin: (compTin || '').trim(),
    });
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 3000);
  };

  const handleAddRevCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRevCat.trim()) return;
    addRevenueCategory(newRevCat.trim().toUpperCase());
    setNewRevCat('');
  };

  const handleAddServiceCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceCat.trim()) return;
    addServiceCategory(newServiceCat.trim().toUpperCase());
    setNewServiceCat('');
  };

  const handleAddExpCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpCat.trim()) return;
    addExpenseCategory(newExpCat.trim().toUpperCase());
    setNewExpCat('');
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    createAccount(newAccountName);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name.trim()) return;

    if (editingCategory.type === 'service') updateServiceCategory(editingCategory.id, editingCategory.name);
    if (editingCategory.type === 'revenue') updateRevenueCategory(editingCategory.id, editingCategory.name);
    if (editingCategory.type === 'expense') updateExpenseCategory(editingCategory.id, editingCategory.name);
    setEditingCategory(null);
  };

  const renderCategoryName = (type: 'service' | 'revenue' | 'expense', id: string, name: string) => {
    if (editingCategory?.type === type && editingCategory.id === id) {
      return (
        <form onSubmit={handleSaveCategory} className="flex min-w-0 flex-1 items-center gap-2">
          <input
            autoFocus
            value={editingCategory.name}
            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
            className="min-w-0 flex-1 text-xs px-2 py-1 border border-slate-300 rounded uppercase"
          />
          <button type="submit" className="text-emerald-600 hover:text-emerald-800 cursor-pointer" title="Save category">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        </form>
      );
    }

    return <span className="font-semibold text-slate-800 truncate">{name}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">System Configuration</h1>
            <p className="text-xs text-slate-500">
              Manage chart of accounts, business parameters, roles, and payment categories
            </p>
          </div>
        </div>

        {/* Role toggle badge */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-600">Simulate Role:</span>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setUserRole('admin')}
              className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${
                userRole === 'admin' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Admin (Owner)
            </button>
            <button
              onClick={() => setUserRole('staff')}
              className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${
                userRole === 'staff' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Staff (Technician)
            </button>
          </div>
        </div>
      </div>

      {savedSettingsNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Company profile information updated successfully.</span>
        </div>
      )}

      {/* ACCOUNTING WORKSPACES */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              Accounting Admin Accounts
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Each account has separate transactions, customers, payroll, inventory, and settings.
            </p>
          </div>

          {userRole === 'admin' && (
            <form onSubmit={handleCreateAccount} className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="New admin account name"
                className="w-full sm:w-56 text-xs px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
              <button type="submit" className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Add Account
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-xs font-semibold text-slate-700" htmlFor="active-account">
            Active accounting workspace
          </label>
          <select
            id="active-account"
            value={activeAccount.id}
            onChange={(e) => switchAccount(e.target.value)}
            disabled={userRole !== 'admin'}
            className="w-full sm:w-72 text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 1: COMPANY PROFILE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Building className="w-4 h-4 text-slate-600" />
          Company Letterhead & Official Receipt Details
        </h2>

        <form onSubmit={handleSaveCompany} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Company / Business Name</label>
            <input
              type="text"
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              disabled={userRole !== 'admin'}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Business Address</label>
            <input
              type="text"
              value={compAddress}
              onChange={(e) => setCompAddress(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              disabled={userRole !== 'admin'}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Phone / Mobile</label>
            <input
              type="text"
              value={compPhone}
              onChange={(e) => setCompPhone(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              disabled={userRole !== 'admin'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={compEmail}
              onChange={(e) => setCompEmail(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              disabled={userRole !== 'admin'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tax Identification Number (TIN)</label>
            <input
              type="text"
              value={compTin}
              onChange={(e) => setCompTin(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
              disabled={userRole !== 'admin'}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={userRole !== 'admin'}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              Update Profile
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: CATEGORY CUSTOMIZATION (Section 20) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Service Categories */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            Service Categories ({serviceCategories.length})
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">Categories used for service jobs and work orders.</p>

          {userRole === 'admin' && (
            <form onSubmit={handleAddServiceCat} className="flex gap-2 mb-3">
              <input
                type="text"
                value={newServiceCat}
                onChange={(e) => setNewServiceCat(e.target.value)}
                placeholder="NEW SERVICE CATEGORY"
                className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg uppercase"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                + Add
              </button>
            </form>
          )}

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {serviceCategories.map((c) => (
              <div key={c.id} className="py-2 px-3 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                {renderCategoryName('service', c.id, c.name)}
                {userRole === 'admin' && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingCategory({ type: 'service', id: c.id, name: c.name })} className="text-slate-400 hover:text-slate-700 cursor-pointer" title="Edit category">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteServiceCategory(c.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer" title="Delete category">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Categories */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            Revenue Categories ({revenueCategories.length})
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">Categories used for revenue transactions.</p>

          {userRole === 'admin' && (
            <form onSubmit={handleAddRevCat} className="flex gap-2 mb-3">
              <input
                type="text"
                value={newRevCat}
                onChange={(e) => setNewRevCat(e.target.value)}
                placeholder="NEW SERVICE CATEGORY"
                className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg uppercase"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                + Add
              </button>
            </form>
          )}

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {revenueCategories.map((c) => (
              <div key={c.id} className="py-2 px-3 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                {renderCategoryName('revenue', c.id, c.name)}
                {userRole === 'admin' && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingCategory({ type: 'revenue', id: c.id, name: c.name })} className="text-slate-400 hover:text-slate-700 cursor-pointer" title="Edit category">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteRevenueCategory(c.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer" title="Delete category">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-rose-600" />
            Expense / Disbursement Categories ({expenseCategories.length})
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">Operational codes (GAS, SALARY, SASAKYAN, SHOP RENT, etc.)</p>

          {userRole === 'admin' && (
            <form onSubmit={handleAddExpCat} className="flex gap-2 mb-3">
              <input
                type="text"
                value={newExpCat}
                onChange={(e) => setNewExpCat(e.target.value)}
                placeholder="NEW EXPENSE CATEGORY"
                className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg uppercase"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                + Add
              </button>
            </form>
          )}

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {expenseCategories.map((c) => (
              <div key={c.id} className="py-2 px-3 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                {renderCategoryName('expense', c.id, c.name)}
                {userRole === 'admin' && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingCategory({ type: 'expense', id: c.id, name: c.name })} className="text-slate-400 hover:text-slate-700 cursor-pointer" title="Edit category">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteExpenseCategory(c.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer" title="Delete category">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: PAYMENT METHODS */}
      <PaymentMethodsCard />
    </div>
  );
};
