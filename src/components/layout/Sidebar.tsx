import React from 'react';
import {
  LayoutDashboard,
  PhilippinePeso,
  CreditCard,
  CalendarDays,
  Wrench,
  Users,
  Car,
  Package,
  UserCheck,
  FileBarChart2,
  CalendarRange,
  FileSpreadsheet,
  Settings,
  History,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  LogOut,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { useAuth } from '../../context/AuthContext';
import { ActiveTab } from '../../types';

export const Sidebar: React.FC<{ isOpen?: boolean; onNavigate?: () => void }> = ({ isOpen, onNavigate }) => {
  const { activeTab, setActiveTab, userRole, setUserRole, parts, companySettings, logout } = useAccounting();
  const { workspaces, activeWorkspace, selectWorkspace, isAuthenticated } = useAuth();

  const lowStockCount = parts.filter((p) => p.quantity <= p.minimumStock).length;

  const [showWorkspaceList, setShowWorkspaceList] = React.useState(false);

  const navItems: { id: ActiveTab; label: string; icon: React.FC<any>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'revenue', label: 'Revenue / Collections', icon: PhilippinePeso },
    { id: 'daily', label: 'Daily Accounting', icon: CalendarDays },
    { id: 'expenses', label: 'Expenses Ledger', icon: CreditCard },
    { id: 'jobs', label: 'Services & Jobs', icon: Wrench },
    { id: 'payroll', label: 'Payroll & Wages', icon: Users },
    { id: 'vehicles', label: 'Vehicles / Sasakyan', icon: Car },
    { id: 'inventory', label: 'Parts & Inventory', icon: Package, badge: lowStockCount },
    { id: 'customers', label: 'Customers', icon: UserCheck },
    { id: 'reports', label: 'Financial Reports', icon: FileBarChart2 },
    { id: 'monthly', label: 'Monthly Accounting', icon: CalendarRange },
    { id: 'yearly', label: 'Yearly Matrix (12-Mo)', icon: CalendarRange },
    { id: 'migration', label: 'Excel Import / Backup', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'audit', label: 'Audit Trail', icon: History },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none overflow-hidden transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="px-5 py-3 border-b border-slate-800">
        <div className="flex justify-center">
          <img
            src="/img/logo.png"
            alt="ChaChing Accounting & Financial System"
            className="w-full max-w-[140px] h-auto rounded-lg bg-white object-contain p-1"
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5 justify-center">
          <Building2 className="w-3 h-3 text-emerald-400" />
          <p className="text-[11px] text-emerald-400 font-semibold truncate" title={activeWorkspace?.name}>
            {activeWorkspace?.name || companySettings.name || 'Your business ledger'}
          </p>
        </div>
        {workspaces.length > 1 && (
          <div className="relative mt-1">
            <button
              onClick={() => setShowWorkspaceList(!showWorkspaceList)}
              className="w-full text-[10px] text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 cursor-pointer"
            >
              <ChevronDown className="w-3 h-3" />
              {workspaces.length} workspaces
            </button>
            {showWorkspaceList && (
              <div className="absolute bottom-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl mb-1 overflow-hidden z-50">
                {workspaces.map((ws) => (
                  <button
                    key={ws._id}
                    onClick={() => { selectWorkspace(ws._id); setShowWorkspaceList(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition-colors ${
                      activeWorkspace?._id === ws._id ? 'bg-emerald-600/20 text-emerald-300' : 'text-slate-300'
                    }`}
                  >
                    {ws.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          {userRole === 'admin' ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>Role: <strong className="text-slate-200 capitalize">{userRole}</strong></span>
        </div>
        <button
          onClick={() => setUserRole(userRole === 'admin' ? 'staff' : 'admin')}
          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer transition-colors"
          title="Toggle role to test permission restrictions"
        >
          Switch to {userRole === 'admin' ? 'Staff' : 'Admin'}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Accounting Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onNavigate?.();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-emerald-600/20 text-emerald-300 border-l-2 border-emerald-500 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                  <AlertTriangle className="w-3 h-3" />
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3.5 border-t border-slate-800 text-[11px] text-slate-400 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="truncate" title={activeWorkspace?.name}>{activeWorkspace?.name || 'Unknown'}</span>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-300 cursor-pointer" title="Log out">
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span>PHP (₱) Active Ledger</span>
          <span className="text-[10px] text-slate-400 font-mono">v1.0-Relational</span>
        </div>
      </div>
    </aside>
  );
};
