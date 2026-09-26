import React, { useState } from 'react';
import { CreditCard, Plus, Trash2, Edit2, CheckCircle2, X } from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';

interface EditingPm {
  id: string;
  name: string;
  accountNumber: string;
  accountHolder: string;
}

export const PaymentMethodsCard: React.FC = () => {
  const {
    paymentMethods,
    userRole,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
  } = useAccounting();

  const [newPmName, setNewPmName] = useState('');
  const [newPmAcc, setNewPmAcc] = useState('');
  const [newPmHolder, setNewPmHolder] = useState('');
  const [editing, setEditing] = useState<EditingPm | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPmName.trim()) return;
    addPaymentMethod(newPmName.trim(), newPmAcc.trim(), newPmHolder.trim());
    setNewPmName('');
    setNewPmAcc('');
    setNewPmHolder('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name.trim()) return;
    updatePaymentMethod(editing.id, {
      name: editing.name.trim(),
      accountNumber: editing.accountNumber.trim(),
      accountHolder: editing.accountHolder.trim(),
    });
    setEditing(null);
  };

  const startEdit = (pm: { id: string; name: string; accountNumber?: string; accountHolder?: string }) => {
    setEditing({
      id: pm.id,
      name: pm.name,
      accountNumber: pm.accountNumber || '',
      accountHolder: pm.accountHolder || '',
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
        <CreditCard className="w-4 h-4 text-slate-700" />
        Payment Categories & Channels ({paymentMethods.length})
      </h2>
      <p className="text-[11px] text-slate-500 mb-3">
        Cash, Banks (BDO, BPI), E-Wallets (GCash, Maya) — add what payment methods your business accepts
      </p>

      {userRole === 'admin' && (
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          <input
            type="text"
            value={newPmName}
            onChange={(e) => setNewPmName(e.target.value)}
            placeholder="Name (e.g. GCash, Metrobank)"
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg"
            required
          />
          <input
            type="text"
            value={newPmAcc}
            onChange={(e) => setNewPmAcc(e.target.value)}
            placeholder="Account # (optional)"
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
          />
          <input
            type="text"
            value={newPmHolder}
            onChange={(e) => setNewPmHolder(e.target.value)}
            placeholder="Account holder (optional)"
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      )}

      {paymentMethods.length === 0 ? (
        <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
          No payment methods yet. Add your first one above.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col gap-2"
            >
              {editing?.id === pm.id ? (
                <form onSubmit={handleSaveEdit} className="space-y-1.5">
                  <input
                    autoFocus
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                    placeholder="Name"
                    required
                  />
                  <input
                    value={editing.accountNumber}
                    onChange={(e) => setEditing({ ...editing, accountNumber: e.target.value })}
                    className="w-full text-xs px-2 py-1 border border-slate-300 rounded font-mono"
                    placeholder="Account #"
                  />
                  <input
                    value={editing.accountHolder}
                    onChange={(e) => setEditing({ ...editing, accountHolder: e.target.value })}
                    className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                    placeholder="Holder"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
                      title="Save"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 block truncate">{pm.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono block truncate">
                      {pm.accountNumber || 'Primary Drawer'}
                    </span>
                    {pm.accountHolder && (
                      <span className="text-[10px] text-slate-400 block truncate">{pm.accountHolder}</span>
                    )}
                  </div>
                  {userRole === 'admin' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(pm)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Edit payment method"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deletePaymentMethod(pm.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete payment method"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
