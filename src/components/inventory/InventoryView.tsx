import React, { useState } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  Search,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP, parseNumber } from '../../utils/currency';
import { Part } from '../../types';
import { exportToExcel } from '../../utils/excel';

export const InventoryView: React.FC = () => {
  const { parts, addPart, updatePart, deletePart, restockPart, userRole } = useAccounting();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [restockModalTarget, setRestockModalTarget] = useState<Part | null>(null);
  const [restockQty, setRestockQty] = useState('5');

  // Form states for new part
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [category, setCategory] = useState('Washing Machine');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [minStock, setMinStock] = useState('3');
  const [supplier, setSupplier] = useState('');

  const filteredParts = parts.filter((p) => {
    if (showLowStockOnly && p.quantity > p.minimumStock) return false;
    if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchNumber = p.partNumber.toLowerCase().includes(q);
      const matchCat = p.category.toLowerCase().includes(q);
      if (!matchName && !matchNumber && !matchCat) return false;
    }
    return true;
  });

  const totalInventoryCost = parts.reduce((s, p) => s + p.quantity * p.costPrice, 0);
  const totalInventorySellingVal = parts.reduce((s, p) => s + p.quantity * p.sellingPrice, 0);
  const lowStockCount = parts.filter((p) => p.quantity <= p.minimumStock).length;

  const handleCreatePart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !partNumber.trim()) return;

    addPart({
      name: name.trim(),
      partNumber: partNumber.trim().toUpperCase(),
      category: category.trim(),
      costPrice: parseNumber(costPrice),
      sellingPrice: parseNumber(sellingPrice),
      quantity: parseInt(quantity) || 0,
      minimumStock: parseInt(minStock) || 3,
      supplier: supplier.trim(),
    });

    setName('');
    setPartNumber('');
    setCategory('Washing Machine');
    setCostPrice('');
    setSellingPrice('');
    setQuantity('10');
    setMinStock('3');
    setSupplier('');
    setShowAddModal(false);
  };

  const handleApplyRestock = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(restockQty) || 0;
    if (restockModalTarget && qty > 0) {
      restockPart(restockModalTarget.id, qty);
      setRestockModalTarget(null);
    }
  };

  const handleExport = () => {
    const exportData = parts.map((p) => ({
      'Part Name': p.name,
      'Part Number': p.partNumber,
      'Category': p.category,
      'Quantity In Stock': p.quantity,
      'Min Stock Alert': p.minimumStock,
      'Cost Price (PHP)': p.costPrice,
      'Selling Price (PHP)': p.sellingPrice,
      'Total Value (Cost)': p.quantity * p.costPrice,
      'Supplier': p.supplier || '',
    }));
    exportToExcel([{ sheetName: 'Parts Inventory', data: exportData }], `Inventory_OW_Parts_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-amber-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-amber-700">Stock control</p>
            <h1 className="text-lg font-bold text-slate-900">Parts & Inventory</h1>
            <p className="text-xs text-slate-500">
              Track stock levels, margins, suppliers, and job-order consumption.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <span className="font-bold text-slate-900">{filteredParts.length}</span> visible of {parts.length} parts
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Part</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-amber-500 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
            Total Inventory Valuation (Cost)
          </span>
          <p className="text-xl font-bold font-mono text-slate-900 tabular-nums mt-1">
            {formatPHP(totalInventoryCost)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Selling Value: {formatPHP(totalInventorySellingVal)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-slate-400 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
            Total Unique Parts
          </span>
          <p className="text-xl font-bold font-mono text-slate-900 tabular-nums mt-1">
            {parts.length} SKUs
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {new Set(parts.map((p) => p.category)).size} Categories
          </span>
        </div>

        <div className={`p-4 rounded-xl border border-l-4 shadow-xs ${lowStockCount > 0 ? 'bg-amber-50 border-amber-200 border-l-amber-500' : 'bg-white border-slate-200 border-l-emerald-500'}`}>
          <span className="text-[10px] uppercase font-bold text-amber-800 block tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Alerts
          </span>
          <p className="text-xl font-bold font-mono text-amber-900 tabular-nums mt-1">
            {lowStockCount} Items
          </p>
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold mt-1 block cursor-pointer underline"
          >
            {showLowStockOnly ? 'Show All Parts' : 'Filter Low Stock Only'}
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Find a part</h2>
            <p className="text-[11px] text-slate-400">Search by name, SKU, or category.</p>
          </div>
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${showLowStockOnly ? 'bg-amber-100 text-amber-900' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {showLowStockOnly ? 'Showing low stock' : 'Low stock only'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search part name, number, category..."
              className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-2.5 border border-slate-200 rounded-lg bg-white sm:w-48"
          >
            <option value="ALL">All Categories</option>
            {Array.from(new Set(parts.map((p) => p.category))).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-medium cursor-pointer sm:w-auto"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
          <span>Export Inventory</span>
        </button>
      </div>

      {/* PARTS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4">Part Name</th>
                <th className="py-3 px-4">Part #</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-right">Cost Price (₱)</th>
                <th className="py-3 px-4 text-right">Selling Price (₱)</th>
                <th className="py-3 px-4 text-right">Margin</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-600">
                      {parts.length === 0 ? 'Your inventory is empty' : 'No parts match these filters'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 mb-3">
                      {parts.length === 0 ? 'Add your first part to start tracking stock.' : 'Try clearing the search or category filter.'}
                    </p>
                    {parts.length === 0 && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add first part
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredParts.map((p) => {
                  const isLow = p.quantity <= p.minimumStock;
                  const margin = p.sellingPrice - p.costPrice;
                  const marginPct = p.sellingPrice > 0 ? ((margin / p.sellingPrice) * 100).toFixed(0) : '0';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {p.name}
                        {p.supplier && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Supplier: {p.supplier}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-600 whitespace-nowrap">
                        {p.partNumber}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                        {p.category}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                            isLow
                              ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {isLow && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {p.quantity} units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums">
                        {formatPHP(p.costPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatPHP(p.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 tabular-nums">
                        +{formatPHP(margin)} <span className="text-[10px] text-slate-400">({marginPct}%)</span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setRestockModalTarget(p)}
                            className="flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-xs font-semibold cursor-pointer"
                            title="Restock part"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Restock</span>
                          </button>
                          {userRole === 'admin' && (
                            <button
                              onClick={() => deletePart(p.id)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete part"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESTOCK MODAL */}
      {restockModalTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 my-auto animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600" />
              Restock {restockModalTarget.name}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Current stock: <strong>{restockModalTarget.quantity}</strong> units
            </p>
            <form onSubmit={handleApplyRestock} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quantity to Add
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-center font-mono font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestockModalTarget(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PART MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 my-auto animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              Register New Appliance Part
            </h3>
            <form onSubmit={handleCreatePart} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Part Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dual Run Capacitor 45+5uF"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Part / SKU # <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    placeholder="e.g. CAP-45-5"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Washing Machine">Washing Machine</option>
                    <option value="Aircon">Aircon</option>
                    <option value="Refrigerator">Refrigerator</option>
                    <option value="TV">TV</option>
                    <option value="Microwave">Microwave</option>
                    <option value="Vacuum">Vacuum</option>
                    <option value="Styler">Styler</option>
                    <option value="Home Theater">Home Theater</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cost Price (₱) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Selling Price (₱) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Low Stock Alert Qty
                  </label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Supplier Name
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Quiapo Electro Parts"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Save Part to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
