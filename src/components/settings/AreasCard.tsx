import React, { useState } from 'react';
import { MapPin, Plus, Trash2, Edit2, CheckCircle2, X } from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';

export const AreasCard: React.FC = () => {
  const { areas, userRole, addArea, updateArea, deleteArea } = useAccounting();

  const [newAreaName, setNewAreaName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    addArea(newAreaName.trim());
    setNewAreaName('');
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editingName.trim()) return;
    updateArea(editingId, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
        <MapPin className="w-4 h-4 text-slate-700" />
        Service Areas / Tech Zones ({areas.length})
      </h2>
      <p className="text-[11px] text-slate-500 mb-3">
        Areas assigned to technicians; job orders inherit the tech's area and collections can be filtered per area
      </p>

      {userRole === 'admin' && (
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            placeholder="e.g. Parañaque, Las Piñas"
            className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg"
            required
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      )}

      {areas.length === 0 ? (
        <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
          No areas yet. Add your first service area above.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {areas.map((area) => (
            <div
              key={area.id}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2"
            >
              {editingId === area.id ? (
                <form onSubmit={saveEdit} className="flex items-center gap-1.5 w-full">
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 min-w-0 text-xs px-2 py-1 border border-slate-300 rounded"
                    required
                  />
                  <button type="submit" className="text-emerald-600 hover:text-emerald-800 cursor-pointer" title="Save">
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <>
                  <span className="text-xs font-bold text-slate-800 truncate">{area.name}</span>
                  {userRole === 'admin' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(area.id, area.name)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Rename area"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteArea(area.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete area"
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
