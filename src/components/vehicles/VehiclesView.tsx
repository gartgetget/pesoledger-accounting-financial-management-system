import React, { useState, useEffect } from 'react';
import {
  Car,
  Fuel,
  Wrench,
  Plus,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatPHP, parseNumber } from '../../utils/currency';
import { getTodayDateString, formatDateDisplay } from '../../utils/date';
import { exportToExcel } from '../../utils/excel';

export const VehiclesView: React.FC = () => {
  const {
    vehicles,
    vehicleExpenses,
    paymentMethods,
    employees,
    areas,
    addVehicle,
    deleteVehicle,
    addVehicleExpense,
    deleteVehicleExpense,
    userRole,
  } = useAccounting();

  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showLogExpenseModal, setShowLogExpenseModal] = useState(false);

  // New vehicle form
  const [vehName, setVehName] = useState('');
  const [vehPlate, setVehPlate] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehDriver, setVehDriver] = useState('');

  // Log expense form
  const [logVehId, setLogVehId] = useState(vehicles[0]?.id || '');
  const [logDate, setLogDate] = useState(getTodayDateString());
  const [logType, setLogType] = useState<'Fuel/Gas' | 'Maintenance' | 'Repairs' | 'Toll' | 'Parking' | 'Other'>('Fuel/Gas');
  const [logDesc, setLogDesc] = useState('');
  const [logAmount, setLogAmount] = useState('');
  const [logDriver, setLogDriver] = useState('');
  const [logPaymentId, setLogPaymentId] = useState(paymentMethods[0]?.id || 'pm-1');
  const [logArea, setLogArea] = useState('');
  const [logNotes, setLogNotes] = useState('');

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehName.trim() || !vehPlate.trim()) return;

    addVehicle({
      vehicleName: vehName.trim(),
      plateNumber: vehPlate.trim().toUpperCase(),
      model: vehModel.trim(),
      assignedDriver: vehDriver.trim() || 'Eugene / Staff',
    });

    setVehName('');
    setVehPlate('');
    setVehModel('');
    setShowAddVehicleModal(false);
  };

  const handleLogVehicleExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseNumber(logAmount);
    const selectedVeh = vehicles.find((v) => v.id === logVehId);
    if (!selectedVeh || amt <= 0) {
      alert('Please enter valid vehicle and amount.');
      return;
    }

    const saved = await addVehicleExpense({
      vehicleId: selectedVeh.id,
      vehicleName: `${selectedVeh.vehicleName} (${selectedVeh.plateNumber})`,
      date: logDate,
      expenseType: logType,
      description: logDesc.trim() || `${logType} - ${selectedVeh.vehicleName}`,
      amount: amt,
      driverResponsible: logDriver.trim() || selectedVeh.assignedDriver || 'Driver',
      paymentMethodId: logPaymentId,
      area: logArea,
      notes: logNotes.trim(),
    });

    if (!saved) return;

    setLogDesc('');
    setLogAmount('');
    setLogDate(getTodayDateString());
    setLogType('Fuel/Gas');
    setLogDriver('');
    setLogArea('');
    setLogNotes('');
    if (paymentMethods.length > 0) setLogPaymentId(paymentMethods[0].id);
    setShowLogExpenseModal(false);
  };

  useEffect(() => {
    if (vehicles.length > 0 && (!logVehId || !vehicles.some((v) => v.id === logVehId))) {
      setLogVehId(vehicles[0].id);
    }
  }, [vehicles, logVehId]);

  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethods.some((p) => p.id === logPaymentId)) {
      setLogPaymentId(paymentMethods[0].id);
    }
  }, [paymentMethods, logPaymentId]);

  const totalFuel = vehicleExpenses
    .filter((v) => v.expenseType === 'Fuel/Gas')
    .reduce((s, v) => s + v.amount, 0);

  const totalMaint = vehicleExpenses
    .filter((v) => v.expenseType !== 'Fuel/Gas')
    .reduce((s, v) => s + v.amount, 0);

  const handleExport = () => {
    const exportData = vehicleExpenses.map((v) => ({
      'Date': v.date,
      'Vehicle': v.vehicleName,
      'Expense Type': v.expenseType,
      'Particulars': v.description,
      'Amount (PHP)': v.amount,
      'Driver': v.driverResponsible,
      'Area': v.area || '',
      'Remarks': v.notes || '',
    }));
    exportToExcel([{ sheetName: 'Vehicle Expenses', data: exportData }], `Vehicle_Expenses_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Vehicle & Fleet Expenses (Sasakyan)</h1>
            <p className="text-xs text-slate-500">
              Track fuel, oil change, tires, toll fees and auto-post to General Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddVehicleModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>+ Add Vehicle</span>
          </button>

          <button
            onClick={() => setShowLogExpenseModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Fuel className="w-4 h-4" />
            <span>Log Vehicle Expense</span>
          </button>
        </div>
      </div>

      {/* FLEET CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {vehicles.map((v) => {
          const vehExps = vehicleExpenses.filter((e) => e.vehicleId === v.id);
          const totalSpent = vehExps.reduce((s, e) => s + e.amount, 0);

          return (
            <div
              key={v.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-slate-900">{v.vehicleName}</h2>
                      <span className="text-[10px] font-mono text-slate-500">{v.plateNumber}</span>
                    </div>
                  </div>
                  {userRole === 'admin' && (
                    <button
                      onClick={() => deleteVehicle(v.id)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Remove vehicle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  <p>Model: <strong>{v.model || 'Commercial Van'}</strong></p>
                  <p>Assigned Driver: <strong>{v.assignedDriver}</strong></p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Spent</span>
                <span className="text-xs font-mono font-bold text-orange-700 tabular-nums">
                  {formatPHP(totalSpent)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SUMMARY BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-orange-700 tracking-wider">Total Gas / Fuel Outflow</span>
              <p className="text-xl font-bold font-mono text-orange-900 tabular-nums">{formatPHP(totalFuel)}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Maintenance, Toll & Repairs</span>
              <p className="text-xl font-bold font-mono text-slate-900 tabular-nums">{formatPHP(totalMaint)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* VEHICLE EXPENSES LOG TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900">Vehicle Logbook Transactions</h2>
            <p className="text-[11px] text-slate-500">Auto-synchronized with 'GAS' and 'SASAKYAN' categories</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-orange-600" />
            <span>Export Vehicle Logs</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Vehicle</th>
                <th className="py-2.5 px-4">Expense Type</th>
                <th className="py-2.5 px-4 hidden md:table-cell">Particulars</th>
                <th className="py-2.5 px-4">Driver / Person</th>
                <th className="py-2.5 px-4 hidden md:table-cell">Area</th>
                <th className="py-2.5 px-4 text-right">Amount (₱)</th>
                <th className="py-2.5 px-4 hidden md:table-cell">Remarks</th>
                <th className="py-2.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicleExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No vehicle expenses logged yet.
                  </td>
                </tr>
              ) : (
                vehicleExpenses.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 whitespace-nowrap font-medium text-slate-700">
                      {formatDateDisplay(v.date)}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {v.vehicleName}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-orange-800">{v.expenseType}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 truncate max-w-xs hidden md:table-cell">{v.description}</td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{v.driverResponsible}</td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap hidden md:table-cell">{v.area || '—'}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-orange-800 tabular-nums whitespace-nowrap text-sm">
                      {formatPHP(v.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-[140px] hidden md:table-cell">{v.notes || '—'}</td>
                    <td className="py-2.5 px-4 text-center">
                      {userRole === 'admin' && (
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this vehicle expense? Its General Ledger entry will be removed too.')) {
                              deleteVehicleExpense(v.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete vehicle expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: LOG VEHICLE EXPENSE */}
      {showLogExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 my-auto animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Fuel className="w-4 h-4 text-orange-600" />
              Log Vehicle Outflow (Sasakyan / Gas)
            </h3>
            <form onSubmit={handleLogVehicleExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Vehicle <span className="text-rose-500">*</span>
                </label>
                <select
                  value={logVehId}
                  onChange={(e) => setLogVehId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  required
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleName} ({v.plateNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Expense Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={logType}
                    onChange={(e) => setLogType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="Fuel/Gas">Fuel / Gas</option>
                    <option value="Maintenance">Maintenance / PMS</option>
                    <option value="Repairs">Repairs & Tires</option>
                    <option value="Toll">Toll Fees (RFID)</option>
                    <option value="Parking">Parking Fee</option>
                    <option value="Other">Other Sasakyan Cost</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Particulars / Description
                </label>
                <input
                  type="text"
                  value={logDesc}
                  onChange={(e) => setLogDesc(e.target.value)}
                  placeholder="e.g. Diesel full tank Shell Alabang"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Amount (₱) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={logAmount}
                    onChange={(e) => setLogAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-orange-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={logPaymentId}
                    onChange={(e) => setLogPaymentId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Driver / Responsible
                </label>
                <input
                  type="text"
                  value={logDriver}
                  onChange={(e) => setLogDriver(e.target.value)}
                  placeholder="e.g. Eugene / Arnel"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Area
                </label>
                <select
                  value={logArea}
                  onChange={(e) => setLogArea(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">No area</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogExpenseModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Save & Post to Expenses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD VEHICLE */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 my-auto animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Car className="w-4 h-4 text-orange-600" />
              Register Fleet Vehicle
            </h3>
            <form onSubmit={handleCreateVehicle} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Vehicle Name / Nickname <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={vehName}
                  onChange={(e) => setVehName(e.target.value)}
                  placeholder="e.g. Service Van 1"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Plate Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={vehPlate}
                  onChange={(e) => setVehPlate(e.target.value)}
                  placeholder="e.g. NDB-4821"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Model / Make
                </label>
                <input
                  type="text"
                  value={vehModel}
                  onChange={(e) => setVehModel(e.target.value)}
                  placeholder="e.g. Toyota Hiace Commuter"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Assigned Driver
                </label>
                <input
                  type="text"
                  value={vehDriver}
                  onChange={(e) => setVehDriver(e.target.value)}
                  placeholder="e.g. Eugene"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
