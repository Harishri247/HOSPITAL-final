import React, { useState, useEffect } from 'react';
import { wardApi, patientApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  BedDouble,
  Users,
  PlusCircle,
  ArrowRightLeft,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Activity,
  Wrench,
  Check
} from 'lucide-react';

export const WardsPage = () => {
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole(['ROLE_DOCTOR']) || user?.role === 'ROLE_DOCTOR' || user?.role === 'DOCTOR';
  const isAdmin = hasRole(['ROLE_ADMIN']) || user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  const isNurse = hasRole(['ROLE_NURSE']) || user?.role === 'ROLE_NURSE' || user?.role === 'NURSE';
  const isReceptionist = hasRole(['ROLE_RECEPTIONIST']) || user?.role === 'ROLE_RECEPTIONIST' || user?.role === 'RECEPTIONIST';
  const canManageBeds = (hasRole(['ROLE_NURSE', 'ROLE_ADMIN']) || ['ROLE_NURSE', 'ROLE_ADMIN', 'NURSE', 'ADMIN'].includes(user?.role)) && !isReceptionist;

  const [wards, setWards] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState(null);
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createWardModalOpen, setCreateWardModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);
  const [assignPatientId, setAssignPatientId] = useState('');
  const [targetBedId, setTargetBedId] = useState('');
  const [modalError, setModalError] = useState('');

  // New Ward Form State
  const [newWard, setNewWard] = useState({
    wardName: '',
    wardType: 'GENERAL',
    totalBeds: 6,
    floorNumber: 1,
    nurseInCharge: ''
  });
  const [createWardError, setCreateWardError] = useState('');

  useEffect(() => {
    loadWardsAndPatients();
  }, []);

  useEffect(() => {
    if (selectedWardId) {
      loadWardBeds(selectedWardId);
    }
  }, [selectedWardId]);

  const loadWardsAndPatients = async () => {
    setLoading(true);
    try {
      const [wRes, pRes, availRes] = await Promise.all([
        wardApi.getAllWards(),
        patientApi.getAll(),
        wardApi.getAvailableBeds(),
      ]);
      setWards(wRes.data || []);
      setPatients(pRes.data || []);
      setAvailableBeds(availRes.data || []);
      if (wRes.data && wRes.data.length > 0) {
        setSelectedWardId(wRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadWardBeds = async (wardId) => {
    try {
      const res = await wardApi.getBedsByWard(wardId);
      setBeds(res.data || []);
      const availRes = await wardApi.getAvailableBeds();
      setAvailableBeds(availRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateWardSubmit = async (e) => {
    e.preventDefault();
    setCreateWardError('');
    try {
      const res = await wardApi.createWard({
        wardName: newWard.wardName,
        wardType: newWard.wardType,
        totalBeds: parseInt(newWard.totalBeds, 10),
        floorNumber: parseInt(newWard.floorNumber, 10),
        nurseInCharge: newWard.nurseInCharge || null
      });
      setCreateWardModalOpen(false);
      setNewWard({
        wardName: '',
        wardType: 'GENERAL',
        totalBeds: 6,
        floorNumber: 1,
        nurseInCharge: ''
      });
      await loadWardsAndPatients();
      if (res.data?.id) {
        setSelectedWardId(res.data.id);
      }
    } catch (err) {
      setCreateWardError(err.response?.data?.message || 'Failed to create ward');
    }
  };

  const handleToggleMaintenance = async (bed) => {
    const newStatus = bed.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
    try {
      await wardApi.updateBedStatus(bed.id, newStatus);
      await loadWardsAndPatients();
      await loadWardBeds(selectedWardId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update bed status');
    }
  };

  const handleOpenAssign = (bed) => {
    if (isReceptionist || !canManageBeds) {
      alert('Access Denied: Receptionists have view-only access to beds. Bed assignment must be performed by nursing staff or administrators.');
      return;
    }
    if (bed.status !== 'AVAILABLE') return;
    setSelectedBed(bed);
    setAssignPatientId(patients[0]?.id || '');
    setModalError('');
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (isReceptionist || !canManageBeds) {
      setModalError('Access Denied: Receptionists have view-only access to beds. Bed assignment must be performed by nursing staff.');
      return;
    }
    setModalError('');
    try {
      await wardApi.assignBed({
        bedId: selectedBed.id,
        patientId: assignPatientId,
      });
      setAssignModalOpen(false);
      loadWardsAndPatients();
      loadWardBeds(selectedWardId);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Bed assignment failed');
    }
  };

  const handleOpenTransfer = (bed) => {
    setSelectedBed(bed);
    setTargetBedId(availableBeds[0]?.id || '');
    setModalError('');
    setTransferModalOpen(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      await wardApi.transferBed({
        currentBedId: selectedBed.id,
        targetBedId: targetBedId,
      });
      setTransferModalOpen(false);
      loadWardsAndPatients();
      loadWardBeds(selectedWardId);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Bed transfer failed');
    }
  };

  const handleRelease = async (bed) => {
    if (window.confirm(`Release bed ${bed.bedNumber} and discharge ${bed.patientName || 'patient'}?`)) {
      try {
        await wardApi.releaseBed(bed.id);
        loadWardsAndPatients();
        loadWardBeds(selectedWardId);
      } catch (err) {
        alert(err.response?.data?.message || 'Bed release failed');
      }
    }
  };

  const currentWard = wards.find((w) => w.id === selectedWardId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">
              Ward & Bed Management
            </h1>
            {isDoctor && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                👁️ Doctor Read-Only View
              </span>
            )}
            {isReceptionist && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                👁️ Receptionist Directory (View-Only)
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-1">
            {isDoctor
              ? 'Live inpatient bed occupancy overview (Doctor View - Showing exclusively your admitted patients)'
              : isReceptionist
              ? 'Live hospital bed directory & availability overview (View-only. Bed assignment is handled by nursing staff).'
              : 'Intensive Care, Inpatient Admission Units, and Real-Time Bed Occupancy Tracking'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setCreateWardError('');
              setCreateWardModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            + Add New Ward
          </button>
        )}
      </div>

      {isDoctor && (
        <div className="mt-3 p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 flex items-start gap-3">
          <Activity className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-sky-900 dark:text-sky-200">
              Doctor's Admitted Patients Bed Monitoring
            </p>
            <p className="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5 leading-relaxed">
              As an attending physician, only the beds where your admitted patients reside are visible to you. Available beds and other doctors' patients' beds are hidden.
            </p>
          </div>
        </div>
      )}

      {isReceptionist && (
        <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
          <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              Receptionist Bed Directory (View-Only Access)
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5 leading-relaxed">
              You have full visibility of all ward beds, current occupancy rates, and patient ward locations to coordinate admissions and answer patient inquiries. Bed assignments and discharges are restricted to nursing staff.
            </p>
          </div>
        </div>
      )}

      {/* Ward Switcher Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {wards.map((w) => (
          <button
            key={w.id}
            onClick={() => setSelectedWardId(w.id)}
            className={`p-4 rounded-2xl border text-left transition ${
              selectedWardId === w.id
                ? 'bg-white dark:bg-slate-900 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{w.wardName}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Floor {w.floorNumber}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{w.wardType}</span>
              {isDoctor ? (
                <span className={`font-semibold ${(selectedWardId === w.id ? beds.length : w.occupiedBeds) > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>
                  <strong>{selectedWardId === w.id ? beds.length : w.occupiedBeds}</strong> {(selectedWardId === w.id ? beds.length : w.occupiedBeds) === 1 ? 'Patient Admitted' : 'Patients Admitted'}
                </span>
              ) : (
                <span><strong>{w.occupiedBeds}</strong> / {w.totalBeds} Occupied</span>
              )}
            </div>
            {/* Progress bar for staff, or patient indicator for doctors */}
            {!isDoctor ? (
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    w.occupiedBeds / w.totalBeds > 0.85 ? 'bg-rose-500' : 'bg-teal-500'
                  }`}
                  style={{ width: `${Math.min(100, (w.occupiedBeds / w.totalBeds) * 100)}%` }}
                />
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                <span>{w.occupiedBeds > 0 ? `Your patient admitted` : 'No patients admitted'}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Bed Matrix Layout */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {currentWard?.wardName || 'Ward Unit'} &bull; Bed Layout
            </h3>
            <span className="text-xs text-slate-500">Nurse In-Charge: {currentWard?.nurseInCharge || 'Assigned Staff'}</span>
          </div>

          {isDoctor ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800 text-[11px]">
                {beds.length} Admitted {beds.length === 1 ? 'Patient' : 'Patients'} in this Ward
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available
              </span>
              <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Maintenance
              </span>
              <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Occupied
              </span>
            </div>
          )}
        </div>

        {/* Beds Grid */}
        {beds.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30">
            <BedDouble className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {isDoctor
                ? 'No Admitted Patients in this Ward'
                : 'No Beds Registered in this Ward'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isDoctor
                ? 'None of your assigned patients are currently admitted to hospital beds in this ward.'
                : 'Beds will appear here once configured by the hospital administrator.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {beds.map((b) => {
              const isOcc = b.status === 'OCCUPIED';
              const isMaint = b.status === 'MAINTENANCE';
              const isAvail = b.status === 'AVAILABLE';

              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                    isOcc
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                      : isMaint
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                      : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                        {b.bedNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isOcc
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                          : isMaint
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Type: {b.bedType}
                    </span>

                    {isOcc ? (
                      <div className="mt-3 pt-2 border-t border-rose-100 dark:border-rose-900/40 text-xs">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{b.patientName || 'Admitted Patient'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{b.patientNumber}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Since: {b.assignmentDate ? new Date(b.assignmentDate).toLocaleDateString() : 'Active'}
                        </p>
                      </div>
                    ) : isMaint ? (
                      <div className="mt-4 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5" />
                        Under maintenance (Unavailable)
                      </div>
                    ) : (
                      <div className="mt-4 text-xs text-slate-400 italic">
                        Ready for patient intake
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!isDoctor && (
                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end gap-1.5 flex-wrap">
                      {isAvail && canManageBeds && (
                        <button
                          onClick={() => handleOpenAssign(b)}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                        >
                          Assign
                        </button>
                      )}

                      {isAvail && isReceptionist && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          Ready for Intake
                        </span>
                      )}

                      {/* Maintenance Toggle for Nurse / Admin */}
                      {canManageBeds && !isOcc && (
                        <button
                          onClick={() => handleToggleMaintenance(b)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition ${
                            isMaint
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                          }`}
                          title={isMaint ? "Mark bed as Available" : "Set bed to Maintenance"}
                        >
                          {isMaint ? <Check className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                          {isMaint ? 'Set Ready' : 'Service'}
                        </button>
                      )}

                      {isOcc && canManageBeds && (
                        <>
                          <button
                            onClick={() => handleOpenTransfer(b)}
                            className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            title="Transfer to another available bed"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRelease(b)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                            title="Discharge & Release Bed"
                          >
                            Release
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add New Ward Modal */}
      <Modal
        isOpen={createWardModalOpen}
        onClose={() => setCreateWardModalOpen(false)}
        title="Create New Hospital Ward"
        maxWidth="max-w-md"
      >
        {createWardError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {createWardError}
          </div>
        )}

        <form onSubmit={handleCreateWardSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ward Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Intensive Care Unit A, Cardiac Wing"
              value={newWard.wardName}
              onChange={(e) => setNewWard({ ...newWard, wardName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ward Type *
              </label>
              <select
                required
                value={newWard.wardType}
                onChange={(e) => setNewWard({ ...newWard, wardType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="GENERAL">General Ward</option>
                <option value="ICU">Intensive Care Unit (ICU)</option>
                <option value="EMERGENCY">Emergency Care</option>
                <option value="PRIVATE">Private Room</option>
                <option value="SEMI_PRIVATE">Semi-Private Room</option>
                <option value="POST_OPERATIVE">Post-Operative Recovery</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Configured Capacity (Total Beds) *
              </label>
              <input
                type="number"
                required
                min="1"
                max="50"
                value={newWard.totalBeds}
                onChange={(e) => setNewWard({ ...newWard, totalBeds: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Automatically provisions actual physical bed records in the database.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Floor Number
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={newWard.floorNumber}
                onChange={(e) => setNewWard({ ...newWard, floorNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nurse In-Charge
              </label>
              <input
                type="text"
                placeholder="Nurse Name"
                value={newWard.nurseInCharge}
                onChange={(e) => setNewWard({ ...newWard, nurseInCharge: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateWardModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
            >
              Provision Ward & Beds
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Bed Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign Patient to Bed ${selectedBed?.bedNumber}`}
        maxWidth="max-w-md"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {modalError}
          </div>
        )}

        <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Patient to Admit *
            </label>
            <select
              required
              value={assignPatientId}
              onChange={(e) => setAssignPatientId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.patientNumber}) - {p.phoneNumber}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
            >
              Confirm Admission
            </button>
          </div>
        </form>
      </Modal>

      {/* Transfer Bed Modal */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title={`Transfer Patient from Bed ${selectedBed?.bedNumber}`}
        maxWidth="max-w-md"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {modalError}
          </div>
        )}

        <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Available Bed *
            </label>
            {availableBeds.length === 0 ? (
              <p className="text-rose-500">No other beds are currently available in the hospital.</p>
            ) : (
              <select
                required
                value={targetBedId}
                onChange={(e) => setTargetBedId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bedNumber} ({b.wardName} - {b.bedType})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTransferModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={availableBeds.length === 0}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              Execute Transfer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WardsPage;
