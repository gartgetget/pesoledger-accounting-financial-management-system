import React, { useState } from 'react';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { DailyAccountingView } from './components/daily/DailyAccountingView';
import { RevenueView } from './components/revenue/RevenueView';
import { RevenueModal } from './components/revenue/RevenueModal';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ExpenseModal } from './components/expenses/ExpenseModal';
import { JobsView } from './components/jobs/JobsView';
import { JobModal } from './components/jobs/JobModal';
import { PayrollView } from './components/payroll/PayrollView';
import { VehiclesView } from './components/vehicles/VehiclesView';
import { InventoryView } from './components/inventory/InventoryView';
import { CustomersView } from './components/customers/CustomersView';
import { MonthlyAccountingView } from './components/monthly/MonthlyAccountingView';
import { YearlyAccountingView } from './components/yearly/YearlyAccountingView';
import { ReportsView } from './components/reports/ReportsView';
import { MigrationView } from './components/migration/MigrationView';
import { SettingsView } from './components/settings/SettingsView';
import { LoginView } from './components/auth/LoginView';
import { RevenueTransaction, Expense, ServiceJob } from './types';

const MainAppContent: React.FC = () => {
  const { activeTab, isAuthenticated } = useAccounting();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Global Modals State
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<RevenueTransaction | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ServiceJob | null>(null);

  const handleOpenRevenueModal = () => {
    setEditingRevenue(null);
    setIsRevenueModalOpen(true);
  };

  const handleEditRevenue = (item: RevenueTransaction) => {
    setEditingRevenue(item);
    setIsRevenueModalOpen(true);
  };

  const handleOpenExpenseModal = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (item: Expense) => {
    setEditingExpense(item);
    setIsExpenseModalOpen(true);
  };

  const handleOpenJobModal = () => {
    setEditingJob(null);
    setIsJobModalOpen(true);
  };

  const handleEditJob = (item: ServiceJob) => {
    setEditingJob(item);
    setIsJobModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">
      {/* 1. SIDEBAR NAVIGATION */}
      <Sidebar />

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Persistent Global Header with Date Filters & Global Add Buttons */}
        <Header
          onOpenRevenueModal={handleOpenRevenueModal}
          onOpenExpenseModal={handleOpenExpenseModal}
          onOpenJobModal={handleOpenJobModal}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-7xl min-w-0 mx-auto pb-12">
            {activeTab === 'dashboard' && (
              <DashboardView
                onOpenRevenueModal={handleOpenRevenueModal}
                onOpenExpenseModal={handleOpenExpenseModal}
                onOpenJobModal={handleOpenJobModal}
              />
            )}

            {activeTab === 'daily' && (
              <DailyAccountingView
                onOpenRevenueModal={handleOpenRevenueModal}
                onOpenExpenseModal={handleOpenExpenseModal}
              />
            )}

            {activeTab === 'revenue' && (
              <RevenueView
                onOpenRevenueModal={handleOpenRevenueModal}
                onEditRevenue={handleEditRevenue}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesView
                onOpenExpenseModal={handleOpenExpenseModal}
                onEditExpense={handleEditExpense}
              />
            )}

            {activeTab === 'jobs' && (
              <JobsView
                onOpenJobModal={handleOpenJobModal}
                onEditJob={handleEditJob}
              />
            )}

            {activeTab === 'payroll' && <PayrollView />}

            {activeTab === 'vehicles' && <VehiclesView />}

            {activeTab === 'inventory' && <InventoryView />}

            {activeTab === 'customers' && <CustomersView />}

            {activeTab === 'monthly' && <MonthlyAccountingView />}

            {activeTab === 'yearly' && <YearlyAccountingView />}

            {activeTab === 'reports' && <ReportsView />}

            {activeTab === 'migration' && <MigrationView />}

            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* GLOBAL TRANSACTION ENTRY MODALS */}
      <RevenueModal
        isOpen={isRevenueModalOpen}
        onClose={() => {
          setIsRevenueModalOpen(false);
          setEditingRevenue(null);
        }}
        editItem={editingRevenue}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        editItem={editingExpense}
      />

      <JobModal
        isOpen={isJobModalOpen}
        onClose={() => {
          setIsJobModalOpen(false);
          setEditingJob(null);
        }}
        editItem={editingJob}
      />
    </div>
  );
};

export default function App() {
  return (
    <AccountingProvider>
      <MainAppContent />
    </AccountingProvider>
  );
}
