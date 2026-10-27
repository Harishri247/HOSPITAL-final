import React, { useState, useEffect } from 'react';
import { 
  Pill, Plus, Search, AlertTriangle, RefreshCw, Edit2, 
  Trash2, Package, ArrowUpDown, CheckCircle, XCircle,
  ShieldAlert, Truck, CheckCircle2, Lock, FileText, ClipboardList
} from 'lucide-react';
import { pharmacyApi } from '../api/apiService';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function PharmacyPage() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [controlledLogs, setControlledLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, LOW_STOCK, CONTROLLED_LOGS
  const [message, setMessage] = useState(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [dispenseMedicine, setDispenseMedicine] = useState(null);

  // Dispense Form State
  const [dispenseForm, setDispenseForm] = useState({
    quantity: 1,
    batchNumber: '',
    patientReference: '',
    pharmacistName: '',
    supervisorSignoff: '',
    notes: '',
  });
  const [dispenseSubmitting, setDispenseSubmitting] = useState(false);
  const [dispenseError, setDispenseError] = useState('');

  // Form States
  const [newMed, setNewMed] = useState({
    name: '',
    genericName: '',
    category: '',
    dosageForm: 'TABLET',
    strength: '',
    manufacturer: '',
    supplier: '',
    batchNumber: '',
    expiryDate: '',
    unitPrice: '',
    stockQuantity: 100,
    reorderLevel: 20,
    isControlled: false
  });

  const [stockAdjustment, setStockAdjustment] = useState({
    adjustment: 0,
    reason: 'RESTOCK'
  });

  const canManage = ['ADMIN', 'PHARMACIST', 'ROLE_ADMIN', 'ROLE_PHARMACIST'].includes(user?.role) ||
                    user?.role?.includes('ADMIN') || user?.role?.includes('PHARMACIST');

  useEffect(() => {
    fetchMedicines();
    if (canManage) {
      fetchControlledLogs();
    }
  }, []);

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const [allRes, lowRes] = await Promise.all([
        pharmacyApi.getAll(),
        pharmacyApi.getLowStock()
      ]);
      setMedicines(allRes.data || []);
      setLowStock(lowRes.data || []);
    } catch (err) {
      console.error('Error fetching medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchControlledLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await pharmacyApi.getControlledLogs();
      setControlledLogs(res.data || []);
    } catch (err) {
      console.error('Error fetching controlled logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      fetchMedicines();
      return;
    }
    try {
      setLoading(true);
      const res = await pharmacyApi.search(searchTerm);
      setMedicines(res.data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    try {
      await pharmacyApi.add({
        ...newMed,
        unitPrice: parseFloat(newMed.unitPrice),
        stockQuantity: parseInt(newMed.stockQuantity, 10),
        minThreshold: parseInt(newMed.reorderLevel, 10),
        supplier: newMed.supplier || (newMed.manufacturer ? newMed.manufacturer + ' Supply' : 'Direct Supply')
      });
      setMessage({ type: 'success', text: `Medicine ${newMed.name} added successfully!` });
      setShowAddModal(false);
      setNewMed({
        name: '', genericName: '', category: '', dosageForm: 'TABLET',
        strength: '', manufacturer: '', supplier: '', batchNumber: '', expiryDate: '',
        unitPrice: '', stockQuantity: 100, reorderLevel: 20, isControlled: false
      });
      fetchMedicines();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add medicine' });
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedMedicine) return;
    try {
      const adjustmentQty = parseInt(stockAdjustment.adjustment, 10);
      await pharmacyApi.updateStock(selectedMedicine.id, {
        quantityChange: adjustmentQty,
        remarks: stockAdjustment.reason
      });
      setMessage({ type: 'success', text: `Stock updated for ${selectedMedicine.name}!` });
      setShowStockModal(false);
      setSelectedMedicine(null);
      fetchMedicines();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to adjust stock' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from inventory?`)) return;
    try {
      await pharmacyApi.delete(id);
      setMessage({ type: 'success', text: `${name} removed from inventory` });
      fetchMedicines();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete medicine' });
    }
  };

  // Open Dispense Modal
  const openDispenseModal = (med) => {
    setDispenseMedicine(med);
    setDispenseForm({
      quantity: 1,
      batchNumber: med.batchNumber || '',
      patientReference: '',
      pharmacistName: user?.fullName || user?.username || 'Dispensing Pharmacist',
      supervisorSignoff: '',
      notes: '',
    });
    setDispenseError('');
    setShowDispenseModal(true);
  };

  // Handle Dispense Submit
  const handleDispenseSubmit = async (e) => {
    e.preventDefault();
    if (!dispenseMedicine) return;
    setDispenseError('');

    const qty = parseInt(dispenseForm.quantity, 10);
    if (!qty || qty <= 0) {
      setDispenseError('Please enter a valid quantity to dispense.');
      return;
    }
    if (qty > dispenseMedicine.stockQuantity) {
      setDispenseError(`Requested quantity (${qty}) exceeds available stock (${dispenseMedicine.stockQuantity}).`);
      return;
    }

    const isControlled = dispenseMedicine.isControlled || 
      dispenseMedicine.category?.toLowerCase().includes('controlled') || 
      dispenseMedicine.category?.toLowerCase().includes('opioid');

    if (isControlled && !dispenseForm.supervisorSignoff.trim()) {
      setDispenseError('Supervisor authorization / second sign-off PIN is strictly required for controlled substances.');
      return;
    }

    setDispenseSubmitting(true);
    try {
      await pharmacyApi.dispense(dispenseMedicine.id, {
        quantity: qty,
        batchNumber: dispenseForm.batchNumber,
        patientReference: dispenseForm.patientReference.trim(),
        pharmacistName: dispenseForm.pharmacistName.trim(),
        supervisorSignoff: dispenseForm.supervisorSignoff.trim(),
        notes: dispenseForm.notes.trim()
      });

      setMessage({
        type: 'success',
        text: `Successfully dispensed ${qty} unit(s) of ${dispenseMedicine.name} to patient ref: ${dispenseForm.patientReference}!`
      });
      setShowDispenseModal(false);
      setDispenseMedicine(null);
      fetchMedicines();
      if (canManage) {
        fetchControlledLogs();
      }
    } catch (err) {
      setDispenseError(err.response?.data?.message || 'Dispensing failed. Please verify authorization and try again.');
    } finally {
      setDispenseSubmitting(false);
    }
  };

  const isMedControlled = (med) => {
    return med.isControlled || 
      med.category?.toLowerCase().includes('controlled') || 
      med.category?.toLowerCase().includes('opioid');
  };

  const displayedMedicines = filter === 'LOW_STOCK'
    ? medicines.filter(m => m.stockQuantity <= (m.minThreshold ?? m.reorderLevel ?? 10))
    : medicines;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 font-display">
            <Pill className="text-blue-600 dark:text-sky-400" /> Pharmacy & Inventory Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor stock levels, batch numbers, supplier chains, and dispense medications with regulatory governance
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus size={16} /> Add Medicine
            </button>
          )}
          <button
            onClick={() => {
              fetchMedicines();
              if (canManage) fetchControlledLogs();
            }}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-sm ${
          message.type === 'success' 
            ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-sky-300 border border-blue-200 dark:border-blue-800' 
            : 'bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle size={16} className="text-blue-600" /> : <XCircle size={16} className="text-rose-600" />}
            <span className="font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600 font-bold ml-4">×</button>
        </div>
      )}

      {/* Low stock critical alert */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Low Stock Alert ({lowStock.length} items require reordering)
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
              The following medications are at or below reorder threshold: {' '}
              <span className="font-semibold">{lowStock.map(m => `${m.name} (${m.stockQuantity} left, min: ${m.minThreshold ?? m.reorderLevel ?? 10})`).join(', ')}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-4 items-center shadow-sm">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by medication name, generic name, category, supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            All Items ({medicines.length})
          </button>
          <button
            onClick={() => setFilter('LOW_STOCK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'LOW_STOCK'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            Low Stock ({lowStock.length})
          </button>
          {canManage && (
            <button
              onClick={() => setFilter('CONTROLLED_LOGS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filter === 'CONTROLLED_LOGS'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-700 text-purple-700 dark:text-purple-300 hover:bg-gray-200'
              }`}
            >
              <ShieldAlert size={13} /> Controlled Register ({controlledLogs.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {filter === 'CONTROLLED_LOGS' ? (
        /* Controlled Substance Regulatory Log Table (FR8) */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-purple-200 dark:border-purple-900/60 overflow-hidden shadow-sm">
          <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 border-b border-purple-200 dark:border-purple-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-purple-700 dark:text-purple-400" size={18} />
              <h2 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                Controlled Substance Dispense Register (Schedule II & Controlled Drugs Regulatory Audit Trail)
              </h2>
            </div>
            <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
              DEA / FDA Compliance Log
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700/50 uppercase font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Medication</th>
                  <th className="px-4 py-3 text-center">Qty Dispensed</th>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Patient / Prescription Ref</th>
                  <th className="px-4 py-3">Dispensed By</th>
                  <th className="px-4 py-3">Supervisor Authorization</th>
                  <th className="px-4 py-3">Clinical Indication / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      <RefreshCw className="animate-spin inline mr-2 text-purple-600" size={16} />
                      Loading regulatory audit trail...
                    </td>
                  </tr>
                ) : controlledLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No controlled substance dispensations recorded yet.
                    </td>
                  </tr>
                ) : (
                  controlledLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/20">
                      <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        <span className="inline-flex items-center gap-1">
                          <Lock size={12} className="text-purple-600 shrink-0" />
                          {log.medicineName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-purple-700 dark:text-purple-300 text-sm">
                        {log.quantity}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">
                        {log.batchNumber || '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">
                          {log.patientReference}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {log.pharmacistName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                          ✓ {log.supervisorSignoff}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {log.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Inventory Table */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3">Medicine</th>
                  <th className="px-5 py-3">Category & Form</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Batch / Expiry</th>
                  <th className="px-5 py-3 text-right">Unit Price (₹)</th>
                  <th className="px-5 py-3 text-center">Stock Level</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  {canManage && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={canManage ? 8 : 7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <RefreshCw className="animate-spin inline mr-2 text-blue-600" size={18} />
                      Loading pharmacy inventory...
                    </td>
                  </tr>
                ) : displayedMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 8 : 7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No medications found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  displayedMedicines.map((med) => {
                    const threshold = med.minThreshold ?? med.reorderLevel ?? 10;
                    const isLow = med.stockQuantity <= threshold;
                    const isOut = med.stockQuantity <= 0;
                    const isControlled = isMedControlled(med);

                    return (
                      <tr key={med.id} className="hover:bg-gray-50/75 dark:hover:bg-gray-750/50 transition-colors">
                        {/* Medicine Name with Controlled Badge */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 dark:text-white">{med.name}</span>
                            {isControlled && (
                              <span 
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300/80 dark:border-purple-700/80"
                                title="Controlled Substance (Schedule II/III / Opioid) - Requires Supervisor Sign-off"
                              >
                                <ShieldAlert size={10} /> Controlled
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {med.genericName} {med.strength && `• ${med.strength}`}
                          </div>
                        </td>

                        {/* Category & Dosage Form */}
                        <td className="px-5 py-4">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {med.category || 'General'}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {med.dosageForm || 'Tablet'}
                          </div>
                        </td>

                        {/* Supplier Column (FR8) */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 font-medium">
                            <Truck size={12} className="text-slate-400 shrink-0" />
                            <span>{med.supplier || med.manufacturer || 'Direct Supply'}</span>
                          </div>
                          {med.manufacturer && med.manufacturer !== med.supplier && (
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              Mfr: {med.manufacturer}
                            </div>
                          )}
                        </td>

                        {/* Batch & Expiry */}
                        <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-300">
                          <div>Batch: <span className="font-mono font-medium">{med.batchNumber || 'N/A'}</span></div>
                          <div className="text-gray-400">Exp: {med.expiryDate || 'N/A'}</div>
                        </td>

                        {/* Unit Price */}
                        <td className="px-5 py-4 text-right font-semibold text-gray-900 dark:text-white">
                          ₹{med.unitPrice ? Number(med.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </td>

                        {/* Stock Level with FIXED Reorder Threshold (FR8) */}
                        <td className="px-5 py-4 text-center">
                          <span className="font-bold text-gray-900 dark:text-white text-base">
                            {med.stockQuantity}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                            min: {threshold}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 text-center">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                              <XCircle size={12} /> Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              <AlertTriangle size={12} /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-sky-300">
                              <CheckCircle size={12} /> Normal
                            </span>
                          )}
                        </td>

                        {/* Actions Column with Dispense Button (FR8) */}
                        {canManage && (
                          <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => openDispenseModal(med)}
                              disabled={isOut}
                              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded font-semibold transition-colors shadow-xs ${
                                isOut
                                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                  : isControlled
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                              title={isOut ? 'Cannot dispense: Out of stock' : 'Dispense to patient'}
                            >
                              <CheckCircle2 size={12} /> Dispense
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMedicine(med);
                                setStockAdjustment({ adjustment: 0, reason: 'RESTOCK' });
                                setShowStockModal(true);
                              }}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 font-medium transition-colors"
                              title="Adjust Stock Quantity"
                            >
                              <ArrowUpDown size={12} /> Stock
                            </button>
                            <button
                              onClick={() => handleDelete(med.id, med.name)}
                              className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispense Medication Modal (FR8) */}
      <Modal
        isOpen={showDispenseModal}
        onClose={() => setShowDispenseModal(false)}
        title={dispenseMedicine ? `Dispense Medication: ${dispenseMedicine.name}` : 'Dispense Medication'}
      >
        {dispenseMedicine && (
          <form onSubmit={handleDispenseSubmit} className="space-y-4">
            {/* Medication Summary Header */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                  {dispenseMedicine.name}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  {dispenseMedicine.genericName} &bull; {dispenseMedicine.dosageForm}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Available Stock</span>
                <span className="text-base font-bold text-blue-600 dark:text-sky-400">
                  {dispenseMedicine.stockQuantity} units
                </span>
              </div>
            </div>

            {/* Controlled Substance Regulatory Notice */}
            {isMedControlled(dispenseMedicine) && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 rounded-xl flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-200">
                <ShieldAlert className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="font-bold">Controlled Substance Protocol (FR8 Regulatory Governance)</p>
                  <p className="mt-0.5 text-purple-800 dark:text-purple-300">
                    This medication is a classified controlled substance / opioid. Per DEA & hospital regulations, a supervisor authorization PIN / second sign-off is strictly required and will be recorded in the permanent regulatory audit log.
                  </p>
                </div>
              </div>
            )}

            {/* Dispense Error Alert */}
            {dispenseError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                <XCircle size={15} className="text-rose-600 shrink-0" />
                <span>{dispenseError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Quantity Dispensed */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Quantity to Dispense *
                </label>
                <input
                  type="number"
                  min="1"
                  max={dispenseMedicine.stockQuantity}
                  required
                  value={dispenseForm.quantity}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-semibold"
                  placeholder="e.g. 2"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Remaining stock after dispense: {Math.max(0, dispenseMedicine.stockQuantity - (parseInt(dispenseForm.quantity, 10) || 0))} units
                </span>
              </div>

              {/* Batch Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Batch Number *
                </label>
                <input
                  type="text"
                  required
                  value={dispenseForm.batchNumber}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, batchNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono"
                  placeholder="e.g. BATCH-2026-A"
                />
              </div>
            </div>

            {/* Patient or Prescription Reference */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Patient / Prescription Reference *
              </label>
              <input
                type="text"
                required
                value={dispenseForm.patientReference}
                onChange={(e) => setDispenseForm({ ...dispenseForm, patientReference: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                placeholder="e.g. Patient #PAT-2026-1001 or Rx #RX-502"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Link this dispensation to a verified patient record or electronic prescription identifier.
              </span>
            </div>

            {/* Dispensing Pharmacist (Auto-filled) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Dispensing Pharmacist (Auto-filled from Active Session)
              </label>
              <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <span className="font-semibold">{dispenseForm.pharmacistName}</span>
                <span className="text-xs text-blue-600 dark:text-sky-400 bg-sky-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-sky-200 dark:border-blue-800 ml-auto">
                  Staff ID: {user?.staffId || 'PHM-VERIFIED'}
                </span>
              </div>
            </div>

            {/* Mandatory Supervisor Sign-off PIN (Only if Controlled Substance) */}
            {isMedControlled(dispenseMedicine) && (
              <div>
                <label className="block text-xs font-bold text-purple-900 dark:text-purple-300 mb-1 flex items-center gap-1">
                  <Lock size={12} /> Supervisor Authorization / Sign-Off PIN *
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={dispenseForm.supervisorSignoff}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, supervisorSignoff: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-purple-300 dark:border-purple-700 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  placeholder="Enter Supervisor / Department Head Authorization PIN"
                />
                <span className="text-[11px] text-purple-700 dark:text-purple-400 mt-1 block">
                  Mandatory second verification per hospital controlled substance dispensing regulations.
                </span>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Clinical Indication / Dispensing Remarks
              </label>
              <input
                type="text"
                value={dispenseForm.notes}
                onChange={(e) => setDispenseForm({ ...dispenseForm, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                placeholder="e.g. Post-operative analgesic protocol, dosage verified"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowDispenseModal(false)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dispenseSubmitting}
                className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors flex items-center gap-1.5 shadow-sm ${
                  isMedControlled(dispenseMedicine)
                    ? 'bg-purple-700 hover:bg-purple-800 disabled:opacity-50'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
                }`}
              >
                {dispenseSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing Dispensation...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Confirm & Decrement Stock</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Medicine Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Medication to Inventory">
        <form onSubmit={handleAddMedicine} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Brand Name *</label>
              <input
                type="text"
                required
                value={newMed.name}
                onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                placeholder="e.g. Amoxicillin Trihydrate"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Generic Name *</label>
              <input
                type="text"
                required
                value={newMed.genericName}
                onChange={(e) => setNewMed({ ...newMed, genericName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                placeholder="e.g. Amoxicillin"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category *</label>
              <input
                type="text"
                required
                value={newMed.category}
                onChange={(e) => setNewMed({ ...newMed, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                placeholder="e.g. Antibiotic, Analgesic / Opioid"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Dosage Form *</label>
              <select
                value={newMed.dosageForm}
                onChange={(e) => setNewMed({ ...newMed, dosageForm: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              >
                <option value="TABLET">Tablet</option>
                <option value="CAPSULE">Capsule</option>
                <option value="SYRUP">Syrup / Suspension</option>
                <option value="INJECTION">Injection / IV</option>
                <option value="INHALER">Inhaler</option>
                <option value="DROPS">Drops</option>
                <option value="OINTMENT">Ointment / Cream</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Strength</label>
              <input
                type="text"
                value={newMed.strength}
                onChange={(e) => setNewMed({ ...newMed, strength: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                placeholder="e.g. 500mg, 10ml"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Manufacturer</label>
              <input
                type="text"
                value={newMed.manufacturer}
                onChange={(e) => setNewMed({ ...newMed, manufacturer: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                placeholder="e.g. Pfizer, Novartis"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Supplier Name *</label>
              <input
                type="text"
                value={newMed.supplier}
                onChange={(e) => setNewMed({ ...newMed, supplier: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                placeholder="e.g. Novartis Integrated Logistics"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Batch Number *</label>
              <input
                type="text"
                required
                value={newMed.batchNumber}
                onChange={(e) => setNewMed({ ...newMed, batchNumber: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                placeholder="e.g. BT-2026-981"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Expiry Date *</label>
              <input
                type="date"
                required
                value={newMed.expiryDate}
                onChange={(e) => setNewMed({ ...newMed, expiryDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Unit Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={newMed.unitPrice}
                onChange={(e) => setNewMed({ ...newMed, unitPrice: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Initial Stock *</label>
              <input
                type="number"
                min="0"
                required
                value={newMed.stockQuantity}
                onChange={(e) => setNewMed({ ...newMed, stockQuantity: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Reorder Level (Min Threshold) *</label>
              <input
                type="number"
                min="1"
                required
                value={newMed.reorderLevel}
                onChange={(e) => setNewMed({ ...newMed, reorderLevel: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newMed.isControlled}
                onChange={(e) => setNewMed({ ...newMed, isControlled: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <span className="text-xs font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1">
                <ShieldAlert size={12} /> Classify as Controlled Substance / Opioid (Requires supervisor authorization)
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save Medication
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal 
        isOpen={showStockModal} 
        onClose={() => setShowStockModal(false)} 
        title={`Adjust Stock: ${selectedMedicine?.name}`}
      >
        <form onSubmit={handleAdjustStock} className="space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
            <p className="text-gray-600 dark:text-gray-300">
              Current Stock: <span className="font-bold text-gray-900 dark:text-white">{selectedMedicine?.stockQuantity}</span> units
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Quantity to Add or Subtract (+ / -)
            </label>
            <input
              type="number"
              required
              value={stockAdjustment.adjustment}
              onChange={(e) => setStockAdjustment({ ...stockAdjustment, adjustment: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono"
              placeholder="+50 or -10"
            />
            <span className="text-xs text-gray-400 mt-1 block">
              New Projected Total: {(selectedMedicine?.stockQuantity || 0) + (parseInt(stockAdjustment.adjustment, 10) || 0)} units
            </span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Reason for Adjustment
            </label>
            <select
              value={stockAdjustment.reason}
              onChange={(e) => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            >
              <option value="RESTOCK">Supplier Restock / Delivery</option>
              <option value="DAMAGED">Damaged / Expired Goods Discard</option>
              <option value="AUDIT_CORRECTION">Physical Inventory Audit Correction</option>
              <option value="RETURN">Patient Return / Restock</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowStockModal(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Update Stock
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
