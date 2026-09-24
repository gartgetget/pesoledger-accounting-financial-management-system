import React from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { PaymentMethodsCard } from '../settings/PaymentMethodsCard';

export const AuditView: React.FC = () => {
  const { auditLogs, userRole } = useAccounting();

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Audit Trail & Payment Categories</h1>
            <p className="text-xs text-slate-500">
              Immutable activity logs and payment method configuration
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="px-2 py-1 bg-slate-100 rounded-md font-semibold capitalize">{userRole}</span>
          <span className="text-slate-400">{auditLogs.length} log entries</span>
        </div>
      </div>

      {/* Payment Methods Management */}
      <PaymentMethodsCard />

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold text-slate-900">System Audit Trail & Security Logs</h2>
          </div>
          <span className="text-[11px] text-slate-500">Immutable chronological activity tracking</span>
        </div>

        <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Operator</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Module</th>
                <th className="py-2.5 px-4">Activity Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    No audit entries yet. Actions like adding payment methods will appear here.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2 px-4 whitespace-nowrap text-slate-500 font-sans">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap font-sans font-semibold text-slate-800">
                      {log.userName}
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'CREATE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action === 'VOID'
                            ? 'bg-rose-100 text-rose-800'
                            : log.action === 'IMPORT'
                            ? 'bg-indigo-100 text-indigo-800'
                            : log.action === 'SETTINGS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-4 font-sans text-slate-700">{log.module}</td>
                    <td className="py-2 px-4 font-sans text-slate-600 truncate max-w-md" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
