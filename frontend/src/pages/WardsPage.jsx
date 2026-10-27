import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wardApi, patientApi, admissionApi, adminApi, userApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { DischargeSummaryModal } from '../components/DischargeSummaryModal';
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
  Check,
  ClipboardList,
  Stethoscope,
  Clock,
  AlertTriangle,
  FilePlus,
  ShieldAlert,
  Calendar,
  FileText,
  ShieldCheck
} from 'lucide-react';

export const WardsPage = () => {
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole(['ROLE_DOCTOR']) || user?.role === 'ROLE_DOCTOR' || user?.role === 'DOCTOR';
  const isAdmin = hasRole(['ROLE_ADMIN']) || user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  const isNurse = hasRole(['ROLE_NURSE']) || user?.role === 'ROLE_NURSE' || user?.role === 'NURSE';
  const isReceptionist = hasRole(['ROLE_RECEPTIONIST']) || user?.role === 'ROLE_RECEPTIONIST' || user?.role === 'RECEPTIONIST';
  const canManageBeds = isAdmin || isReceptionist;
  const canOrderAdmission = isDoctor || isAdmin;

  const [wards, setWards] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState(null);
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createWardModalOpen, setCreateWardModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [createOrderModalOpen, setCreateOrderModalOpen] = useState(false);
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [dischargeBed, setDischargeBed] = useState(null);
  const [dischargePatient, setDischargePatient] = useState(null);
  const [dischargeAdmissionOrderId, setDischargeAdmissionOrderId] = useState(null);
  
  const [selectedBed, setSelectedBed] = useState(null);
  const [assignPatientId, setAssignPatientId] = useState('');
  const [targetBedId, setTargetBedId] = useState('');
  const [modalError, setModalError] = useState('');
  const [nursesList, setNursesList] = useState([]);
  const [assignNurseId, setAssignNurseId] = useState('');

  // Doctor Admission Order Form
  const [orderForm, setOrderForm] = useState({
    patientId: '',
    diagnosis: '',
    recommendedWardType: 'GENERAL',
    priority: 'ROUTINE',
    notes: ''
  });
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');

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
      const [wRes, pRes, availRes, ordersRes] = await Promise.all([
        wardApi.getAllWards(),
        patientApi.getAll(),
        wardApi.getAvailableBeds(),
        admissionApi.getPendingOrders().catch(() => ({ data: [] })),
      ]);
      const loadedWards = wRes.data || [];
      setWards(loadedWards);
      setPatients(pRes.data || []);
      setAvailableBeds(availRes.data || []);
      setPendingOrders(ordersRes.data || []);
      if (loadedWards.length > 0 && !selectedWardId) {
        setSelectedWardId(loadedWards[0].id);
      }
    } catch (e) {
      console.error('Error loading ward data:', e);
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
      console.error('Error loading beds:', e);
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

  const handleOpenAssign = async (bed = null, order = null) => {
    if (bed && bed.status !== 'AVAILABLE') return;

    try {
      const res = await userApi.getNurses();
      const nurses = res.data || [];
      setNursesList(nurses);
      if (nurses.length > 0) {
        setAssignNurseId(String(nurses[0].id));
      }
    } catch {
      setNursesList([]);
      setAssignNurseId('');
    }

    setSelectedBed(bed);
    if (order) {
      setAssignPatientId(order.patientId);
      if (!bed && availableBeds.length > 0) {
        const matchingBed = availableBeds.find(b => b.wardType === order.recommendedWardType) || availableBeds[0];
        setTargetBedId(matchingBed.id);
      }
    } else if (pendingOrders.length > 0) {
      setAssignPatientId(pendingOrders[0].patientId);
      if (!bed && availableBeds.length > 0) {
        setTargetBedId(availableBeds[0].id);
      }
    } else {
      setAssignPatientId('');
    }
    setModalError('');
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    const finalBedId = selectedBed ? selectedBed.id : targetBedId;
    if (!finalBedId) {
      setModalError('Please select a target available bed.');
      return;
    }
    if (!assignPatientId) {
      setModalError('Please select a patient with a physician admission order.');
      return;
    }

    setModalError('');
    try {
      await wardApi.assignBed({
        bedId: finalBedId,
        patientId: assignPatientId,
        nurseId: assignNurseId ? Number(assignNurseId) : null,
      });
      setAssignModalOpen(false);
      setSelectedBed(null);
      await loadWardsAndPatients();
      if (selectedWardId) {
        await loadWardBeds(selectedWardId);
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Bed assignment failed. An active Doctor Admission Order is required.');
    }
  };

  const handleOpenCreateOrder = () => {
    setOrderError('');
    // Pick first non-inpatient patient as default
    const eligiblePatients = patients.filter(p => p.status !== 'INPATIENT');
    setOrderForm({
      patientId: eligiblePatients[0]?.id || '',
      diagnosis: '',
      recommendedWardType: 'GENERAL',
      priority: 'ROUTINE',
      notes: ''
    });
    setCreateOrderModalOpen(true);
  };

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();
    setOrderError('');
    if (!orderForm.patientId) {
      setOrderError('Please select a patient to admit.');
      return;
    }
    if (!orderForm.diagnosis.trim()) {
      setOrderError('Please enter a clinical diagnosis / indication for admission.');
      return;
    }
    try {
      await admissionApi.createOrder({
        patientId: orderForm.patientId,
        diagnosis: orderForm.diagnosis.trim(),
        recommendedWardType: orderForm.recommendedWardType,
        priority: orderForm.priority,
        notes: orderForm.notes.trim()
      });
      setCreateOrderModalOpen(false);
      setOrderSuccess('Admission order successfully created. Nursing staff have been notified for bed assignment.');
      setTimeout(() => setOrderSuccess(''), 6000);
      await loadWardsAndPatients();
    } catch (err) {
      setOrderError(err.response?.data?.message || 'Failed to submit admission order');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('Cancel this admission order?')) {
      try {
        await admissionApi.cancelOrder(orderId);
        await loadWardsAndPatients();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to cancel order');
      }
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

  const handleOpenDischarge = (bed) => {
    setDischargeBed(bed);
    const pat = patients.find(p => p.id === bed.patientId) || { id: bed.patientId, name: bed.patientName, patientNumber: bed.patientNumber };
    setDischargePatient(pat);
    const order = pendingOrders.find(o => o.patientId === bed.patientId) || null;
    setDischargeAdmissionOrderId(order?.id || null);
    setDischargeModalOpen(true);
  };

  const handleRelease = async (bed) => {
    handleOpenDischarge(bed);
  };

  const currentWard = wards.find((w) => w.id === selectedWardId);
  const selectedOrderDetails = pendingOrders.find(o => String(o.patientId) === String(assignPatientId));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">
              Ward & Bed Management
            </h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            {isReceptionist
              ? 'Hospital inpatient admission intake: Assign admitted patients to beds and allocate dedicated nurses.'
              : 'Intensive Care, Inpatient Admission Units, and Real-Time Bed Occupancy Tracking'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canOrderAdmission && (
            <button
              onClick={handleOpenCreateOrder}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition transform active:scale-95"
            >
              <Stethoscope className="w-4 h-4" />
              + Order Patient Admission
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setCreateWardError('');
                setCreateWardModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              + Add New Ward
            </button>
          )}
        </div>
      </div>

      {orderSuccess && (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3 text-blue-800 dark:text-sky-300 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
            <span>{orderSuccess}</span>
          </div>
          <button onClick={() => setOrderSuccess('')} className="text-blue-600 hover:text-blue-800 font-bold text-xs">
            ✕
          </button>
        </div>
      )}




      {/* Clinical Admission Orders Queue (Pending Bed Placement) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Doctor Admission Orders &bull; Pending Bed Assignment
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  pendingOrders.length > 0
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 animate-pulse'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {pendingOrders.length} {pendingOrders.length === 1 ? 'Order' : 'Orders'} Pending
                </span>
              </div>
            </div>
          </div>

          {canOrderAdmission && (
            <button
              onClick={handleOpenCreateOrder}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-sky-400 inline-flex items-center gap-1.5"
            >
              <FilePlus className="w-3.5 h-3.5" />
              Issue New Order
            </button>
          )}
        </div>

        {pendingOrders.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-2xl bg-slate-50/60 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-7 h-7 mx-auto text-sky-500/80 mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All Admission Orders Fulfilled</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-md mx-auto">
              There are no pending doctor admission orders awaiting bed placement. When an attending physician prescribes inpatient care, the patient will appear here for bed allocation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-2.5 font-semibold">Patient</th>
                  <th className="pb-2.5 font-semibold">Attending Doctor</th>
                  <th className="pb-2.5 font-semibold">Diagnosis / Indication</th>
                  <th className="pb-2.5 font-semibold">Recommended Ward</th>
                  <th className="pb-2.5 font-semibold">Priority</th>
                  <th className="pb-2.5 font-semibold">Ordered</th>
                  <th className="pb-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {pendingOrders.map((order) => {
                  const isEmergency = order.priority === 'EMERGENCY';
                  const isUrgent = order.priority === 'URGENT';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 pr-3">
                        <div className="font-bold text-slate-800 dark:text-slate-100">
                          {order.patientName}
                        </div>
                        <div className="text-[10px] text-blue-600 dark:text-sky-400 font-mono">
                          {order.patientNumber}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">
                        <div className="font-semibold">Dr. {order.doctorName}</div>
                        {order.doctorSpecialty && (
                          <div className="text-[10px] text-slate-400">{order.doctorSpecialty}</div>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {order.diagnosis}
                        </span>
                        {order.notes && (
                          <p className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">
                            "{order.notes}"
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          {order.recommendedWardType}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                          isEmergency
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 animate-pulse'
                            : isUrgent
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {isEmergency && <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />}
                          {order.priority}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {order.orderDate ? new Date(order.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManageBeds && (
                            <button
                              onClick={() => handleOpenAssign(null, order)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1"
                            >
                              <BedDouble className="w-3.5 h-3.5" />
                              Assign Bed
                            </button>
                          )}
                          {!canManageBeds && !isDoctor && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Awaiting Admin Bed Allocation
                            </span>
                          )}
                          {(isDoctor || isAdmin) && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="px-2 py-1 text-slate-400 hover:text-rose-600 rounded-lg text-xs transition"
                              title="Cancel Order"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ward Switcher Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {wards.map((w) => (
          <button
            key={w.id}
            onClick={() => setSelectedWardId(w.id)}
            className={`p-4 rounded-2xl border text-left transition ${
              selectedWardId === w.id
                ? 'bg-white dark:bg-slate-900 border-sky-500 shadow-md ring-2 ring-sky-500/20'
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
                <span className={`font-semibold ${(selectedWardId === w.id ? beds.length : w.occupiedBeds) > 0 ? 'text-blue-600 dark:text-sky-400' : 'text-slate-400'}`}>
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
                    w.occupiedBeds / w.totalBeds > 0.85 ? 'bg-rose-500' : 'bg-sky-500'
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
              <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Available
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
                      : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
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
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
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
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end gap-1.5 flex-wrap">
                    {isAvail && canManageBeds && (
                      <button
                        onClick={() => handleOpenAssign(b)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                      >
                        Assign Bed
                      </button>
                    )}

                    {/* Maintenance Toggle for Nurse / Admin */}
                    {canManageBeds && !isOcc && (
                      <button
                        onClick={() => handleToggleMaintenance(b)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition ${
                          isMaint
                            ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-sky-300 dark:bg-blue-950/40 dark:text-sky-300 dark:border-blue-800'
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

                    {isOcc && (isNurse || isDoctor || isAdmin) && (
                      <>
                        {(isDoctor || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleOpenDischarge(b)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm inline-flex items-center gap-1 transition"
                            title="Doctor Discharge Summary & Governance"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Discharge Summary
                          </button>
                        )}
                        <Link
                          to={`/patients/${b.patientId}`}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm inline-flex items-center gap-1 transition"
                          title="Open Inpatient Care Chart & Vitals"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          Care Chart
                        </Link>
                      </>
                    )}
                  </div>
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
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
            >
              Provision Ward & Beds
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Bed Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedBed(null);
        }}
        title={selectedBed ? `Assign Patient to Bed ${selectedBed.bedNumber}` : 'Assign Bed from Admission Order'}
        maxWidth="max-w-lg"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {modalError}
          </div>
        )}

        {pendingOrders.length === 0 ? (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900 dark:text-amber-200">
                    Physician Admission Order Required
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                    Bed assignment is blocked. Hospital protocol mandates that an attending physician must first create an <strong>Inpatient Admission Order</strong> before nursing staff can allocate a bed.
                  </p>
                  {canOrderAdmission && (
                    <button
                      type="button"
                      onClick={() => {
                        setAssignModalOpen(false);
                        handleOpenCreateOrder();
                      }}
                      className="mt-3 inline-flex items-center gap-1 font-bold text-blue-700 dark:text-sky-300 underline"
                    >
                      + Create Doctor Admission Order now &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
            {/* Target Bed Display / Selector */}
            {selectedBed ? (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[11px]">Selected Bed</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    Bed {selectedBed.bedNumber}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {currentWard?.wardName} &bull; {selectedBed.bedType}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Target Available Bed *
                </label>
                {availableBeds.length === 0 ? (
                  <p className="text-rose-500">No available beds in the hospital. Please free or service a bed first.</p>
                ) : (
                  <select
                    required
                    value={targetBedId}
                    onChange={(e) => setTargetBedId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {availableBeds.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bedNumber} ({b.wardName} - {b.bedType})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Select Patient with Pending Order */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Patient with Doctor Admission Order *
              </label>
              <select
                required
                value={assignPatientId}
                onChange={(e) => setAssignPatientId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {pendingOrders.map((o) => (
                  <option key={o.patientId} value={o.patientId}>
                    {o.patientName} ({o.patientNumber}) — Dr. {o.doctorName} [{o.priority}]
                  </option>
                ))}
              </select>
            </div>

            {/* Verified Order Summary Card */}
            {selectedOrderDetails && (
              <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-blue-950/30 border border-sky-200/80 dark:border-blue-800/60 space-y-2.5">
                <div className="flex items-center justify-between border-b border-sky-200/60 dark:border-blue-800/40 pb-2">
                  <span className="font-bold text-blue-900 dark:text-sky-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                    Doctor Admission Order Verified
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    selectedOrderDetails.priority === 'EMERGENCY'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                      : selectedOrderDetails.priority === 'URGENT'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                      : 'bg-sky-100 text-blue-800 dark:bg-blue-900 dark:text-sky-200'
                  }`}>
                    {selectedOrderDetails.priority}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Attending Physician:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Dr. {selectedOrderDetails.doctorName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Recommended Ward:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedOrderDetails.recommendedWardType}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Clinical Diagnosis / Reason:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedOrderDetails.diagnosis}</span>
                </div>

                {selectedOrderDetails.notes && (
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Instructions for Ward Staff:</span>
                    <span className="text-slate-600 dark:text-slate-300 italic">{selectedOrderDetails.notes}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Allocate Attending Nurse *
                  </label>
                  <select
                    value={assignNurseId}
                    onChange={(e) => setAssignNurseId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  >
                    <option value="">-- Assign Nurse in Charge --</option>
                    {nursesList.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.fullName} (@{n.username})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Allocating a nurse ensures this inpatient automatically appears on their ward dashboard roster.
                  </p>
                </div>
              </div>
            )}

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
                disabled={!selectedBed && availableBeds.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-50 shadow-sm"
              >
                Confirm Bed Assignment
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create Doctor Admission Order Modal */}
      <Modal
        isOpen={createOrderModalOpen}
        onClose={() => setCreateOrderModalOpen(false)}
        title="Issue Physician Inpatient Admission Order"
        maxWidth="max-w-lg"
      >
        {orderError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {orderError}
          </div>
        )}

        <form onSubmit={handleCreateOrderSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Patient for Inpatient Admission *
            </label>
            <select
              required
              value={orderForm.patientId}
              onChange={(e) => setOrderForm({ ...orderForm, patientId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">-- Choose Patient --</option>
              {patients
                .filter((p) => p.status !== 'INPATIENT')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.patientNumber}) &bull; {p.phoneNumber}
                  </option>
                ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Only outpatient or active patients not currently admitted to a bed can be ordered for inpatient admission.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Clinical Diagnosis & Indication for Admission *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Acute appendicitis, Severe pneumonia, Post-op stabilization"
              value={orderForm.diagnosis}
              onChange={(e) => setOrderForm({ ...orderForm, diagnosis: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recommended Ward Type *
              </label>
              <select
                required
                value={orderForm.recommendedWardType}
                onChange={(e) => setOrderForm({ ...orderForm, recommendedWardType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                Clinical Priority *
              </label>
              <select
                required
                value={orderForm.priority}
                onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent (Priority bed)</option>
                <option value="EMERGENCY">Emergency (Immediate)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Physician Notes & Instructions for Nursing Staff
            </label>
            <textarea
              rows={3}
              placeholder="e.g., Continuous cardiac monitoring, IV antibiotics Q8H, NPO post-midnight..."
              value={orderForm.notes}
              onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOrderModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm"
            >
              Issue Admission Order
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              Execute Transfer
            </button>
          </div>
        </form>
      </Modal>

      {dischargeModalOpen && (
        <DischargeSummaryModal
          isOpen={dischargeModalOpen}
          onClose={() => setDischargeModalOpen(false)}
          admissionOrderId={dischargeAdmissionOrderId}
          patient={dischargePatient}
          bed={dischargeBed}
          onDischargeComplete={() => {
            loadWardsAndPatients();
            if (selectedWardId) loadWardBeds(selectedWardId);
          }}
        />
      )}
    </div>
  );
};

export default WardsPage;
