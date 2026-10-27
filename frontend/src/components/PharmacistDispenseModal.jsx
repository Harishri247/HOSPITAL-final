import React, { useState, useEffect } from 'react';
import {
  X,
  Pill,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Stethoscope,
  User,
  Package,
  Layers,
  Calendar,
  Lock,
  FileText,
  AlertCircle,
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import { prescriptionApi, pharmacyApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';

export const PharmacistDispenseModal = ({
  isOpen,
  onClose,
  prescription,
  onDispensed
}) => {
  const { user } = useAuth();
  const [safetyData, setSafetyData] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [dispenseQuantity, setDispenseQuantity] = useState(1);
  const [batchNumber, setBatchNumber] = useState('');
  const [pharmacistNotes, setPharmacistNotes] = useState('');
  const [supervisorSignoff, setSupervisorSignoff] = useState('');

  useEffect(() => {
    if (isOpen && prescription?.id) {
      setErrorMessage('');
      setSuccessMessage('');
      loadPrescriptionSafetyAndInventory();
    }
  }, [isOpen, prescription]);

  const loadPrescriptionSafetyAndInventory = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [safetyRes, medsRes] = await Promise.all([
        prescriptionApi.getSafetyCheck(prescription.id),
        pharmacyApi.getAll().catch(() => ({ data: [] }))
      ]);

      const safety = safetyRes.data;
      setSafetyData(safety);
      setMedicines(medsRes.data || []);

      // Pre-fill form from safety check
      setSelectedMedicineId(safety.matchedMedicineId ? String(safety.matchedMedicineId) : '');
      setDispenseQuantity(safety.suggestedQuantity || 10);
      setBatchNumber(safety.batchNumber || '');
      const assignedNurse = safety.assignedNurseName || prescription.assignedNurseName;
      const bedInfo = safety.bedNumber || prescription.bedNumber;
      const wardInfo = safety.wardName || prescription.wardName;
      if (assignedNurse) {
        setPharmacistNotes(`Dispensed to Nurse ${assignedNurse} for inpatient bedside administration (Bed ${bedInfo || 'Assigned'}, ${wardInfo || 'Ward'}). Prescribed regimen: ${prescription.dosage}, ${prescription.frequency}.`);
      } else {
        setPharmacistNotes(`Patient counseled on proper administration: ${prescription.dosage}, ${prescription.frequency} for ${prescription.duration}.`);
      }
      setSupervisorSignoff('');
    } catch (err) {
      console.error('Failed to load safety data for prescription:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to verify prescription safety and inventory catalog.');
    } finally {
      setLoading(false);
    }
  };

  const handleMedicineChange = (e) => {
    const medId = e.target.value;
    setSelectedMedicineId(medId);
    const selected = medicines.find((m) => String(m.id) === String(medId));
    if (selected) {
      setBatchNumber(selected.batchNumber || '');
    }
  };

  const handleDispenseSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const qty = parseInt(dispenseQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMessage('Please enter a valid positive quantity to dispense.');
      return;
    }

    const currentMed = medicines.find((m) => String(m.id) === String(selectedMedicineId)) || 
      (safetyData?.matchedMedicineId ? {
        id: safetyData.matchedMedicineId,
        stockQuantity: safetyData.stockQuantity,
        isControlled: safetyData.isControlled,
        name: safetyData.matchedMedicineName
      } : null);

    if (currentMed && currentMed.stockQuantity < qty) {
      setErrorMessage(`Insufficient inventory stock for ${currentMed.name || 'this medicine'}. Available: ${currentMed.stockQuantity}, Requested: ${qty}`);
      return;
    }

    if (safetyData?.isControlled && !supervisorSignoff.trim()) {
      setErrorMessage('Controlled Substance Safety Policy: A supervisor sign-off authorization PIN is required prior to dispensing.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        status: 'DISPENSED',
        medicineId: selectedMedicineId ? parseInt(selectedMedicineId, 10) : (safetyData?.matchedMedicineId || null),
        quantity: qty,
        batchNumber: batchNumber.trim() || undefined,
        notes: pharmacistNotes.trim() || undefined,
        supervisorSignoff: supervisorSignoff.trim() || undefined
      };

      const res = await prescriptionApi.dispense(prescription.id, payload);
      setSuccessMessage('Medication successfully verified, dispensed, and inventory stock updated!');
      window.dispatchEvent(new Event('notification-updated'));

      setTimeout(() => {
        if (onDispensed) onDispensed(res.data);
        onClose();
      }, 1300);
    } catch (err) {
      console.error('Dispense failed:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Dispensing failed. Please verify inventory stock and parameters.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !prescription) return null;

  const activeMed = medicines.find((m) => String(m.id) === String(selectedMedicineId));
  const isControlled = activeMed ? activeMed.isControlled : (safetyData?.isControlled || false);
  const currentStock = activeMed ? activeMed.stockQuantity : (safetyData?.stockQuantity ?? null);
  const unitPrice = activeMed ? Number(activeMed.unitPrice || 0) : 0;
  const totalPrice = unitPrice * (parseInt(dispenseQuantity, 10) || 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* ========================================================= */}
        {/* HEADER: CLINICAL PHARMACY DISPENSING BANNER */}
        {/* ========================================================= */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-800 via-blue-900 to-slate-900 text-white flex items-center justify-between gap-4 border-b border-blue-600/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-sky-300 font-bold flex-shrink-0">
              <Pill className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-widest font-extrabold text-sky-300">
                  Pharmacy Dispensing & Safety Verification
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30">
                  Rx #{prescription.id} &bull; Pending Review
                </span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight font-display text-white">
                {prescription.medicationName}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* BODY */}
        {/* ========================================================= */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-100 flex-1">
          
          {/* Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-200 text-xs flex items-center gap-2.5 font-bold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-blue-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Verifying pharmacy inventory catalog & safety contraindications...</span>
            </div>
          ) : (
            <>
              {/* Patient & Doctor Context Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-50 dark:bg-blue-950 text-blue-600 dark:text-sky-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Patient</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100 block">
                      {prescription.patientName}
                    </span>
                    <span className="text-[10px] font-mono text-blue-600 dark:text-sky-400 font-semibold">
                      MRN: {prescription.patientNumber}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Prescribing Physician</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100 block">
                      Dr. {prescription.doctorName}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Ordered: {prescription.prescriptionDate || 'Today'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Prescribed Regimen</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block">
                      {prescription.dosage} &bull; {prescription.frequency}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      Duration: {prescription.duration} ({prescription.route || 'Oral'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Inpatient Delivery & Assigned Nurse Dispatch Card */}
              {(safetyData?.isAdmitted || safetyData?.assignedNurseName || prescription?.assignedNurseName || prescription?.bedNumber) && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-sky-500/10 to-sky-500/5 border border-sky-200 dark:border-blue-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                      🏥
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-blue-900 dark:text-sky-200 text-xs">
                          Inpatient Clinical Delivery Destination
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-blue-900 text-blue-800 dark:text-sky-300">
                          Bed {safetyData?.bedNumber || prescription?.bedNumber || 'Assigned'} &bull; {safetyData?.wardName || prescription?.wardName || 'Inpatient Ward'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        Assigned Duty Nurse: <strong className="text-blue-700 dark:text-sky-300">{safetyData?.assignedNurseName || prescription?.assignedNurseName || 'Attending Ward Nurse'}</strong> (allocated by reception desk).
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-sky-300 font-bold text-[11px] border border-sky-300 dark:border-blue-800 shrink-0">
                    Direct Nurse Handover
                  </span>
                </div>
              )}

              {/* Clinical Safety & Inventory Alerts */}
              {safetyData?.safetyAlerts && safetyData.safetyAlerts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>Clinical Pharmacy Safety & Inventory Findings:</span>
                  </div>
                  <div className="space-y-1.5">
                    {safetyData.safetyAlerts.map((alt, i) => {
                      const isCritical = alt.includes('CRITICAL') || alt.includes('EXPIRED') || alt.includes('SCHEDULED');
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                            isCritical
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 font-medium'
                              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200'
                          }`}
                        >
                          <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isCritical ? 'text-rose-600' : 'text-amber-600'}`} />
                          <span className="leading-relaxed">{alt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pharmacy Inventory Matching & Dispense Form */}
              <form onSubmit={handleDispenseSubmit} className="space-y-4 pt-1">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        Step 1: Match Inventory Formulation & Verify Stock
                      </h3>
                    </div>
                    {currentStock != null && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                        currentStock > 10
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300'
                          : currentStock > 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {currentStock > 0 ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {currentStock > 0 ? `Available: ${currentStock} units` : 'Out of Stock'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
                        Pharmacy Catalog Formulation
                      </label>
                      <select
                        value={selectedMedicineId}
                        onChange={handleMedicineChange}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium text-slate-800 dark:text-slate-100"
                        required
                      >
                        <option value="">-- Select from Inventory Catalog --</option>
                        {medicines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.strength || m.dosageForm || 'Formulation'}) &bull; Stock: {m.stockQuantity} &bull; ₹{m.unitPrice || '0.00'}/unit
                          </option>
                        ))}
                      </select>
                      {activeMed && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          Generic: {activeMed.genericName || 'N/A'} &bull; Category: {activeMed.category}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
                        Inventory Lot / Batch Number
                      </label>
                      <input
                        type="text"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        placeholder="e.g. LOT-2026-A1"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium text-slate-800 dark:text-slate-100"
                      />
                      {activeMed?.expiryDate && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          Manufacturer Expiration: {activeMed.expiryDate}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        Step 2: Dispense Units & Patient Counseling
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-slate-500 dark:text-slate-400 font-semibold">
                            Quantity to Dispense (Units / Tablets)
                          </label>
                          <span className="text-[10px] text-blue-600 dark:text-sky-400 font-semibold">
                            Calculated: ~{safetyData?.suggestedQuantity || 10} units
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDispenseQuantity((q) => Math.max(1, (parseInt(q, 10) || 1) - 1))}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-base flex items-center justify-center transition"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={currentStock != null && currentStock > 0 ? currentStock : 9999}
                            value={dispenseQuantity}
                            onChange={(e) => setDispenseQuantity(e.target.value)}
                            className="flex-1 p-2.5 text-center text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setDispenseQuantity((q) => (parseInt(q, 10) || 0) + 1)}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-base flex items-center justify-center transition"
                          >
                            +
                          </button>
                        </div>
                        {unitPrice > 0 && (
                          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                            <span>Unit Price: ₹{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            <span className="font-bold text-blue-600 dark:text-sky-400">Total Rx Cost: ₹{totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
                          Pharmacist Instructions & Patient Counseling Notes
                        </label>
                        <textarea
                          rows="2"
                          value={pharmacistNotes}
                          onChange={(e) => setPharmacistNotes(e.target.value)}
                          placeholder="Counseling points, side-effects warnings, or administration instructions..."
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Controlled Substance Supervisor Authorization Gate (FR8) */}
                  {isControlled && (
                    <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-2">
                      <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
                        <Lock className="w-4 h-4 text-rose-600" />
                        <span>Controlled Substance Dispensing Protocol (Hospital Regulation FR8)</span>
                      </div>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                        This drug is classified as a controlled substance. Dispensing requires dual-authorization and a supervisor sign-off authorization PIN to log into the regulatory controlled substance audit vault.
                      </p>
                      <div className="pt-1">
                        <label className="block text-[11px] font-bold text-rose-900 dark:text-rose-200 mb-1">
                          Supervisor Authorization / Sign-off PIN <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Enter 4-6 digit supervisor signoff authorization PIN"
                          value={supervisorSignoff}
                          onChange={(e) => setSupervisorSignoff(e.target.value)}
                          className="w-full sm:w-80 px-3 py-2 text-xs rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono tracking-widest focus:ring-2 focus:ring-rose-500 focus:outline-none"
                          required={isControlled}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ========================================================= */}
                {/* FOOTER ACTIONS */}
                {/* ========================================================= */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-sky-500"></span>
                    <span>
                      Pharmacist on Duty: <strong>{user?.fullName || 'Staff Pharmacist'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || (currentStock != null && currentStock < parseInt(dispenseQuantity, 10))}
                      className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95 ${
                        currentStock != null && currentStock < parseInt(dispenseQuantity, 10)
                          ? 'bg-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 shadow-blue-600/20'
                      }`}
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Dispensing & Deducting Stock...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify & Dispense Medication</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default PharmacistDispenseModal;
