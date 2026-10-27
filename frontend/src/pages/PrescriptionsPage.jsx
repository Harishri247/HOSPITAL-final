import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { prescriptionApi, patientApi, userApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { PharmacistDispenseModal } from '../components/PharmacistDispenseModal';
import {
  Pill,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  Stethoscope,
  Filter,
  Search,
  User,
  RotateCcw,
  ShieldAlert,
  Package,
  Sparkles
} from 'lucide-react';

export const PrescriptionsPage = () => {
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole(['ROLE_DOCTOR']) || user?.role === 'ROLE_DOCTOR' || user?.role === 'DOCTOR';
  const isPharmacist = hasRole(['ROLE_PHARMACIST']) || user?.role === 'ROLE_PHARMACIST' || user?.role === 'PHARMACIST';
  const isAdmin = hasRole(['ROLE_ADMIN']) || user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  const isPatient = hasRole(['ROLE_PATIENT']) || user?.role === 'ROLE_PATIENT' || user?.role === 'PATIENT';

  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDoctor, setSelectedDoctor] = useState(isDoctor ? (user?.id || '') : '');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'PENDING', 'DISPENSED'
  const [searchTerm, setSearchTerm] = useState('');

  // Pharmacist Dispense Modal
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [selectedPrescriptionToDispense, setSelectedPrescriptionToDispense] = useState(null);

  const FREQUENCY_OPTIONS = [
    { code: 'BD', label: 'Twice Daily (BD - 2 doses/day)', dosesPerDay: 2 },
    { code: 'TDS', label: 'Thrice Daily (TDS - 3 doses/day)', dosesPerDay: 3 },
    { code: 'OD', label: 'Once Daily (OD - 1 dose/day)', dosesPerDay: 1 },
    { code: 'QID', label: 'Four Times Daily (QID - 4 doses/day)', dosesPerDay: 4 },
    { code: 'Q8H', label: 'Every 8 Hours (3 doses/day)', dosesPerDay: 3 },
    { code: 'HS', label: 'At Bedtime - HS (1 dose/day)', dosesPerDay: 1 },
    { code: 'STAT', label: 'Immediate Single STAT Dose (1 dose)', dosesPerDay: 1 },
    { code: 'PRN', label: 'PRN (As Needed)', dosesPerDay: 1 }
  ];

  const COMMON_MEDICATIONS = [
    { name: 'Amoxicillin', dosage: '500mg', route: 'Oral', defaultDays: 5, defaultFreq: 'BD' },
    { name: 'Paracetamol', dosage: '650mg', route: 'Oral', defaultDays: 3, defaultFreq: 'TDS' },
    { name: 'Ceftriaxone', dosage: '1g', route: 'Intravenous (IV)', defaultDays: 5, defaultFreq: 'BD' },
    { name: 'Pantoprazole', dosage: '40mg', route: 'Oral', defaultDays: 7, defaultFreq: 'OD' },
    { name: 'Azithromycin', dosage: '500mg', route: 'Oral', defaultDays: 3, defaultFreq: 'OD' },
    { name: 'Ciprofloxacin', dosage: '500mg', route: 'Oral', defaultDays: 5, defaultFreq: 'BD' },
    { name: 'Ondansetron', dosage: '4mg', route: 'Intravenous (IV)', defaultDays: 2, defaultFreq: 'BD' },
    { name: 'Normal Saline (0.9%)', dosage: '500ml', route: 'Intravenous (IV)', defaultDays: 1, defaultFreq: 'BD' }
  ];

  // New Prescription Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: user?.id || '',
    medicationName: '',
    dosage: '500mg',
    frequencyCode: 'BD',
    frequencyLabel: 'Twice Daily (BD - 2 doses/day)',
    dosesPerDay: 2,
    durationDays: 5,
    route: 'Oral',
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDoctorsAndPatients();
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [selectedDoctor, statusFilter]);

  const loadDoctorsAndPatients = async () => {
    try {
      if (isPatient) {
        let myPat = null;
        try {
          const meRes = await patientApi.getMe();
          myPat = meRes.data;
        } catch (e) {
          try {
            const allP = await patientApi.getAll();
            myPat = (allP.data || [])[0] || null;
          } catch (e2) {}
        }
        setPatients(myPat ? [myPat] : []);
      } else {
        const [docRes, patRes] = await Promise.all([
          userApi.getDoctors().catch(() => ({ data: [] })),
          patientApi.getAll().catch(() => ({ data: [] }))
        ]);
        setDoctors(docRes.data || []);
        setPatients(patRes.data || []);
      }
      if (isDoctor && user?.id) {
        setSelectedDoctor(user.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      if (isPatient) {
        let pat = patients[0];
        if (!pat) {
          try {
            const meRes = await patientApi.getMe();
            pat = meRes.data;
            if (pat) setPatients([pat]);
          } catch (e) {}
        }
        if (pat?.id) {
          const res = await prescriptionApi.getByPatient(pat.id);
          let list = res.data || [];
          if (statusFilter && statusFilter !== 'ALL') {
            list = list.filter((p) => p.dispensingStatus === statusFilter);
          }
          setPrescriptions(list);
          return;
        }
      }
      const docId = isDoctor ? user?.id : (selectedDoctor || null);
      const res = await prescriptionApi.getAll(docId, statusFilter === 'ALL' ? null : statusFilter);
      setPrescriptions(res.data || []);
    } catch (e) {
      console.error(e);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = (presetMed = null) => {
    if (presetMed) {
      const freqObj = FREQUENCY_OPTIONS.find((f) => f.code === presetMed.defaultFreq) || FREQUENCY_OPTIONS[0];
      setFormData({
        patientId: patients[0]?.id || '',
        doctorId: isDoctor ? user?.id : (selectedDoctor || user?.id || ''),
        medicationName: presetMed.name,
        dosage: presetMed.dosage,
        frequencyCode: freqObj.code,
        frequencyLabel: freqObj.label,
        dosesPerDay: freqObj.dosesPerDay,
        durationDays: presetMed.defaultDays || 5,
        route: presetMed.route || 'Oral',
      });
    } else {
      setFormData({
        patientId: patients[0]?.id || '',
        doctorId: isDoctor ? user?.id : (selectedDoctor || user?.id || ''),
        medicationName: '',
        dosage: '500mg',
        frequencyCode: 'BD',
        frequencyLabel: 'Twice Daily (BD - 2 doses/day)',
        dosesPerDay: 2,
        durationDays: 5,
        route: 'Oral',
      });
    }
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      const days = parseInt(formData.durationDays, 10) || 5;
      const calculatedTotalDoses = formData.frequencyCode === 'STAT' ? 1 : Math.max(1, formData.dosesPerDay * days);
      const durationStr = `${days} days (Total: ${calculatedTotalDoses} doses)`;

      const payload = {
        patientId: Number(formData.patientId),
        doctorId: isDoctor ? user?.id : Number(formData.doctorId),
        medicationName: formData.medicationName.trim(),
        dosage: formData.dosage.trim(),
        frequency: formData.frequencyLabel,
        duration: durationStr,
        route: formData.route
      };
      await prescriptionApi.create(payload);
      setIsModalOpen(false);
      loadPrescriptions();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to issue prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispense = async (id) => {
    try {
      await prescriptionApi.dispense(id, { status: 'DISPENSED' });
      loadPrescriptions();
    } catch (err) {
      alert(err.response?.data?.message || 'Dispensing failed');
    }
  };

  // Filtered by local search query (Patient Name, MRN, Medication)
  const filteredPrescriptions = prescriptions.filter((pr) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (pr.medicationName && pr.medicationName.toLowerCase().includes(q)) ||
      (pr.patientName && pr.patientName.toLowerCase().includes(q)) ||
      (pr.patientNumber && pr.patientNumber.toLowerCase().includes(q)) ||
      (pr.doctorName && pr.doctorName.toLowerCase().includes(q))
    );
  });

  const pendingCount = prescriptions.filter((p) => p.dispensingStatus === 'PENDING').length;
  const dispensedCount = prescriptions.filter((p) => p.dispensingStatus === 'DISPENSED').length;

  const currentDoctorObj = doctors.find((d) => String(d.id) === String(selectedDoctor));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">
                Pharmacy e-Prescriptions
              </h1>
              <p className="text-slate-500 text-xs">
                Clinical electronic prescribing and verified pharmacist dispensing
              </p>
            </div>
          </div>
        </div>

        {hasRole(['ROLE_DOCTOR', 'ROLE_ADMIN']) && (
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" /> Issue New Prescription
          </button>
        )}
      </div>

      {/* Pharmacist / Admin Doctor Filter Bar */}
      {!isDoctor && !isPatient && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="font-semibold">Filter by Doctor:</span>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-xs font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="">All Doctors (Hospital-wide)</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.fullName} ({doc.staffId || 'Physician'}) - {doc.departmentName || 'General'}
                </option>
              ))}
            </select>

            {selectedDoctor && (
              <button
                onClick={() => setSelectedDoctor('')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition text-[11px]"
                title="Reset to all doctors"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {selectedDoctor && currentDoctorObj && (
            <div className="text-[11px] font-medium text-blue-700 dark:text-sky-300 bg-sky-50 dark:bg-blue-950/60 px-3 py-1 rounded-xl border border-sky-200/60 dark:border-blue-900">
              Displaying prescriptions for <strong>Dr. {currentDoctorObj.fullName}</strong>'s patients only
            </div>
          )}
        </div>
      )}

      {/* Control Bar: Status Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="inline-flex p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            All ({prescriptions.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-500" /> Pending Dispense
            {statusFilter !== 'PENDING' && pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('DISPENSED')}
            className={`px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1.5 ${
              statusFilter === 'DISPENSED'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-sky-500" /> Dispensed
            {statusFilter !== 'DISPENSED' && dispensedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-sky-300 text-[10px]">
                {dispensedCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search medicine, patient, MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Prescriptions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
            Loading prescriptions queue...
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs space-y-2">
            <Pill className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              No prescriptions found
            </p>
            <p className="text-[11px] text-slate-400">
              {isDoctor
                ? 'No prescriptions recorded for your assigned patients under this filter.'
                : selectedDoctor
                ? `No prescriptions found for Dr. ${currentDoctorObj?.fullName || 'this doctor'}'s patients.`
                : 'No prescriptions match the selected status filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold bg-slate-50/50 dark:bg-slate-900/50">
                <tr>
                  <th className="py-3 px-4">Medication</th>
                  <th className="py-3 px-4">Dosage & Regimen</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Prescribing Doctor</th>
                  <th className="py-3 px-4">Prescribed Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPrescriptions.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    {/* Medication */}
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          <Pill className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{pr.medicationName}</span>
                            {pr.isControlled && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[9px] font-extrabold border border-rose-200 dark:border-rose-900 flex items-center gap-0.5">
                                <ShieldAlert className="w-2.5 h-2.5 text-rose-600" /> Controlled
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-normal">
                            <span>Route: {pr.route || 'Oral'}</span>
                            {pr.stockAvailable != null && (
                              <span className={`font-semibold ${
                                pr.stockAvailable > 10 
                                  ? 'text-blue-600 dark:text-sky-400' 
                                  : pr.stockAvailable > 0 
                                  ? 'text-amber-600 dark:text-amber-400' 
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                &bull; In Stock: {pr.stockAvailable} units
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Dosage & Regimen */}
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold block">{pr.dosage}</span>
                      <span className="text-slate-400 text-[11px] block">
                        {pr.frequency} &bull; {pr.duration}
                      </span>
                    </td>

                    {/* Patient */}
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-200">
                      {isPatient ? (
                        <span className="block font-semibold">{pr.patientName}</span>
                      ) : (
                        <Link
                          to={`/patients/${pr.patientId}`}
                          className="hover:text-blue-600 dark:hover:text-sky-400 hover:underline block"
                        >
                          {pr.patientName}
                        </Link>
                      )}
                      <span className="text-[10px] font-mono text-blue-600 dark:text-sky-400 block font-semibold">
                        {pr.patientNumber}
                      </span>
                    </td>

                    {/* Prescribing Doctor */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">Dr. {pr.doctorName}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {pr.prescriptionDate || 'N/A'}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          pr.dispensingStatus === 'DISPENSED'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-sky-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {pr.dispensingStatus === 'DISPENSED' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {pr.dispensingStatus}
                      </span>
                      {pr.dispensedByName && (
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          By: {pr.dispensedByName}
                        </span>
                      )}
                      {pr.quantityDispensed && (
                        <span className="text-[9px] text-blue-600 dark:text-sky-400 font-semibold block">
                          Dispensed: {pr.quantityDispensed} units {pr.batchNumber ? `(${pr.batchNumber})` : ''}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {pr.dispensingStatus === 'PENDING' && (isPharmacist || isAdmin) ? (
                        <button
                          onClick={() => {
                            setSelectedPrescriptionToDispense(pr);
                            setDispenseModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition transform active:scale-95"
                        >
                          <Pill className="w-3.5 h-3.5" /> Review & Dispense
                        </button>
                      ) : pr.dispensingStatus === 'DISPENSED' ? (
                        <span className="text-blue-600 dark:text-sky-400 text-[11px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verified & Dispensed
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Pending Pharmacy Review</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Prescription Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Author e-Prescription"
        maxWidth="max-w-xl"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          {/* Patient Selection */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Patient * {isDoctor && <span className="text-blue-600 font-normal">(Your Assigned Patients)</span>}
            </label>
            <select
              required
              value={formData.patientId}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            >
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.patientNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Doctor Info */}
          {!isDoctor && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Attending Physician *
              </label>
              <select
                required
                value={formData.doctorId}
                onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.fullName} ({d.staffId || 'Physician'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Select Common Medications */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1 text-[11px] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Quick Formularies / Common Prescriptions:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MEDICATIONS.map((med) => (
                <button
                  key={med.name}
                  type="button"
                  onClick={() => openNewModal(med)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                    formData.medicationName === med.name
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {med.name} ({med.dosage})
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Medication Name *
              </label>
              <input
                type="text"
                required
                value={formData.medicationName}
                onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
                placeholder="e.g. Amoxicillin, Ceftriaxone"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dosage (Strength) *
              </label>
              <input
                type="text"
                required
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g. 500mg, 1 tablet, 1g"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Frequency (Doses / Day) *
              </label>
              <select
                value={formData.frequencyCode}
                onChange={(e) => {
                  const sel = FREQUENCY_OPTIONS.find((f) => f.code === e.target.value) || FREQUENCY_OPTIONS[0];
                  setFormData({
                    ...formData,
                    frequencyCode: sel.code,
                    frequencyLabel: sel.label,
                    dosesPerDay: sel.dosesPerDay
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-medium"
              >
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration (Days) *
              </label>
              <input
                type="number"
                min="1"
                max="90"
                required
                value={formData.durationDays}
                onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Route *
              </label>
              <select
                value={formData.route}
                onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                <option value="Oral">Oral</option>
                <option value="Intravenous (IV)">Intravenous (IV)</option>
                <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                <option value="Topical">Topical</option>
                <option value="Inhalation">Inhalation</option>
                <option value="Sublingual">Sublingual</option>
              </select>
            </div>
          </div>

          {/* Real-time Calculated Regimen & Total Doses Card */}
          <div className="p-3 rounded-xl bg-sky-50/90 dark:bg-blue-950/40 border border-sky-200 dark:border-blue-900/60 flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-blue-950 dark:text-sky-200 block text-xs">
                Clinical Dose Regimen Calculation:
              </span>
              <p className="text-blue-800 dark:text-sky-300 text-[11px] mt-0.5">
                {formData.frequencyCode === 'STAT' ? (
                  <><strong>1 Single STAT Dose</strong> to be administered immediately.</>
                ) : (
                  <>
                    <strong>{formData.dosesPerDay} dose(s)/day</strong> &times; <strong>{formData.durationDays || 1} day(s)</strong> ={' '}
                    <span className="font-extrabold underline text-blue-950 dark:text-white text-xs">
                      {Math.max(1, (parseInt(formData.dosesPerDay, 10) || 1) * (parseInt(formData.durationDays, 10) || 1))} Total Doses
                    </span>
                  </>
                )}
                {' '}&bull; Forwarded to pharmacy for dispensing and scheduled in duty nurse's bedside eMAR roster.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Signing...' : 'Sign & Issue Prescription'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Clinical Pharmacist Safety Review & Dispense Modal */}
      <PharmacistDispenseModal
        isOpen={dispenseModalOpen}
        onClose={() => {
          setDispenseModalOpen(false);
          setSelectedPrescriptionToDispense(null);
        }}
        prescription={selectedPrescriptionToDispense}
        onDispensed={() => {
          loadPrescriptions();
        }}
      />
    </div>
  );
};

export default PrescriptionsPage;

