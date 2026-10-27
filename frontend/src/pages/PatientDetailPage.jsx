import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { patientApi, labApi, admissionApi, nurseApi, adminApi, userApi, prescriptionApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  User,
  Phone,
  MapPin,
  Shield,
  Calendar,
  FileText,
  Pill,
  FlaskConical,
  Receipt,
  ArrowLeft,
  Heart,
  AlertCircle,
  BedDouble,
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FilePlus,
  HeartPulse,
  ShieldCheck,
  HeartHandshake,
  Plus,
  Package,
  Sparkles
} from 'lucide-react';
import { NurseCareModal } from '../components/NurseCareModal';
import { DischargeSummaryModal } from '../components/DischargeSummaryModal';

export const PatientDetailPage = () => {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole(['ROLE_DOCTOR']) || user?.role === 'ROLE_DOCTOR' || user?.role === 'DOCTOR';
  const isAdmin = hasRole(['ROLE_ADMIN']) || user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  const isNurse = hasRole(['ROLE_NURSE']) || user?.role === 'ROLE_NURSE' || user?.role === 'NURSE';
  const isReceptionist = hasRole(['ROLE_RECEPTIONIST']) || user?.role === 'ROLE_RECEPTIONIST' || user?.role === 'RECEPTIONIST';
  const canOrderAdmission = isDoctor || isAdmin;
  const canAllocateNurse = isAdmin || isReceptionist;
  const canPrescribe = isDoctor || isAdmin;

  const [history, setHistory] = useState(null);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('records');
  const [nurseModalOpen, setNurseModalOpen] = useState(false);
  const [nurseModalTab, setNurseModalTab] = useState('vitals');
  const [nurseModalPrescriptionId, setNurseModalPrescriptionId] = useState(null);
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [careContext, setCareContext] = useState(null);

  // Prescribe Medication Modal State (for Doctors & Inpatient Care)
  const [prescribeModalOpen, setPrescribeModalOpen] = useState(false);
  const [prescribeForm, setPrescribeForm] = useState({
    medicationName: '',
    dosage: '500mg',
    frequencyCode: 'BD',
    frequencyLabel: 'Twice Daily (BD - 2 doses/day)',
    dosesPerDay: 2,
    durationDays: 5,
    route: 'Oral',
    instructions: ''
  });
  const [prescribeSubmitting, setPrescribeSubmitting] = useState(false);
  const [prescribeError, setPrescribeError] = useState('');

  // Nurse Allocation Modal State
  const [allocateNurseModalOpen, setAllocateNurseModalOpen] = useState(false);
  const [nursesList, setNursesList] = useState([]);
  const [selectedNurseId, setSelectedNurseId] = useState('');
  const [allocatingNurse, setAllocatingNurse] = useState(false);
  const [allocateError, setAllocateError] = useState('');

  // Admission Order Modal State
  const [admissionModalOpen, setAdmissionModalOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    diagnosis: '',
    recommendedWardType: 'GENERAL',
    priority: 'ROUTINE',
    notes: ''
  });
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');

  // Doctor Lab Review Modal State
  const [reviewLabModalOpen, setReviewLabModalOpen] = useState(false);
  const [selectedLabForReview, setSelectedLabForReview] = useState(null);
  const [doctorReviewNotes, setDoctorReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const openReviewModal = (labOrder) => {
    setSelectedLabForReview(labOrder);
    setDoctorReviewNotes(labOrder.doctorReviewNotes || 'Reviewed laboratory findings. Results clinically correlated with patient presentation. Approved.');
    setReviewError('');
    setReviewLabModalOpen(true);
  };

  const handleOpenAllocateNurse = async () => {
    setAllocateError('');
    setSelectedNurseId(p.assignedNurseId ? String(p.assignedNurseId) : '');
    setAllocateNurseModalOpen(true);
    try {
      const res = await userApi.getNurses();
      const nurses = res.data || [];
      setNursesList(nurses);
      if (nurses.length > 0 && !p.assignedNurseId) {
        setSelectedNurseId(String(nurses[0].id));
      }
    } catch {
      setNursesList([]);
      setSelectedNurseId('');
    }
  };

  const handleAllocateNurseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedNurseId) {
      setAllocateError('Please select a nurse to allocate.');
      return;
    }
    setAllocatingNurse(true);
    setAllocateError('');
    try {
      await patientApi.allocateNurse(id, selectedNurseId);
      setAllocateNurseModalOpen(false);
      setOrderSuccess('Nurse allocated successfully! Nurse roster and patient portal are synchronized.');
      setTimeout(() => setOrderSuccess(''), 6000);
      await loadHistory();
    } catch (err) {
      setAllocateError(err.response?.data?.message || 'Failed to allocate nurse.');
    } finally {
      setAllocatingNurse(false);
    }
  };

  const handleDoctorReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLabForReview) return;
    setIsSubmittingReview(true);
    setReviewError('');
    try {
      await labApi.doctorReview(selectedLabForReview.id, {
        doctorReviewNotes: doctorReviewNotes.trim(),
      });
      setReviewLabModalOpen(false);
      loadHistory();
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Failed to submit physician clinical review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

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

  const openPrescribeModal = (presetMed = null) => {
    setPrescribeError('');
    if (presetMed) {
      const freqObj = FREQUENCY_OPTIONS.find((f) => f.code === presetMed.defaultFreq) || FREQUENCY_OPTIONS[0];
      setPrescribeForm({
        medicationName: presetMed.name,
        dosage: presetMed.dosage,
        frequencyCode: freqObj.code,
        frequencyLabel: freqObj.label,
        dosesPerDay: freqObj.dosesPerDay,
        durationDays: presetMed.defaultDays || 5,
        route: presetMed.route || 'Oral',
        instructions: ''
      });
    } else {
      setPrescribeForm({
        medicationName: '',
        dosage: '500mg',
        frequencyCode: 'BD',
        frequencyLabel: 'Twice Daily (BD - 2 doses/day)',
        dosesPerDay: 2,
        durationDays: 5,
        route: 'Oral',
        instructions: ''
      });
    }
    setPrescribeModalOpen(true);
  };

  const handlePrescribeSubmit = async (e) => {
    e.preventDefault();
    if (!prescribeForm.medicationName.trim()) {
      setPrescribeError('Medication name is required.');
      return;
    }
    if (!prescribeForm.dosage.trim()) {
      setPrescribeError('Dosage is required.');
      return;
    }
    const days = parseInt(prescribeForm.durationDays, 10);
    if (isNaN(days) || days <= 0) {
      setPrescribeError('Valid duration in days is required.');
      return;
    }

    const calculatedTotalDoses = prescribeForm.frequencyCode === 'STAT' ? 1 : Math.max(1, prescribeForm.dosesPerDay * days);
    const durationString = `${days} days (Total: ${calculatedTotalDoses} doses)`;

    setPrescribeSubmitting(true);
    setPrescribeError('');
    try {
      const payload = {
        patientId: Number(id),
        doctorId: user?.id || (history?.patient?.primaryDoctorId) || 2,
        medicationName: prescribeForm.medicationName.trim(),
        dosage: prescribeForm.dosage.trim(),
        frequency: prescribeForm.frequencyLabel,
        duration: durationString,
        route: prescribeForm.route
      };
      await prescriptionApi.create(payload);
      setPrescribeModalOpen(false);
      setOrderSuccess(`✓ Prescription issued! ${prescribeForm.medicationName} (${calculatedTotalDoses} total doses) sent to Pharmacy for dispensing.`);
      setTimeout(() => setOrderSuccess(''), 6000);
      await loadHistory();
    } catch (err) {
      setPrescribeError(err.response?.data?.message || 'Failed to issue prescription.');
    } finally {
      setPrescribeSubmitting(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [id]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const [res, labRes, admRes, careRes] = await Promise.all([
        patientApi.getHistory(id),
        labApi.getByPatient(id).catch(() => ({ data: null })),
        admissionApi.getByPatient(id).catch(() => ({ data: [] })),
        nurseApi.getPatientCareContext(id).catch(() => ({ data: null })),
      ]);
      const data = res.data || {};
      if (labRes && labRes.data && labRes.data.length > 0) {
        data.labOrders = labRes.data;
      }
      setHistory(data);
      setAdmissions(admRes?.data || []);
      setCareContext(careRes?.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();
    setOrderError('');
    if (!orderForm.diagnosis.trim()) {
      setOrderError('Clinical diagnosis / indication is required.');
      return;
    }
    try {
      await admissionApi.createOrder({
        patientId: id,
        diagnosis: orderForm.diagnosis.trim(),
        recommendedWardType: orderForm.recommendedWardType,
        priority: orderForm.priority,
        notes: orderForm.notes.trim()
      });
      setAdmissionModalOpen(false);
      setOrderForm({
        diagnosis: '',
        recommendedWardType: 'GENERAL',
        priority: 'ROUTINE',
        notes: ''
      });
      setOrderSuccess('Admission order created successfully. Hospital administration has been notified for bed allocation.');
      setTimeout(() => setOrderSuccess(''), 6000);
      await loadHistory();
    } catch (err) {
      setOrderError(err.response?.data?.message || 'Failed to submit admission order');
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-xs">Loading patient medical chart...</div>;
  }

  if (!history || !history.patient) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 text-sm">Patient chart not found.</p>
        <Link to="/patients" className="mt-4 inline-block text-xs font-semibold text-blue-600 hover:underline">
          &larr; Back to Patient Registry
        </Link>
      </div>
    );
  }

  const p = history.patient;
  const pendingOrder = admissions.find((a) => a.status === 'ORDERED');

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/patients"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Patient Directory
      </Link>

      {/* Patient Dossier Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-sky-400 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
              {p.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 font-display">
                  {p.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  (p.status === 'OUTPATIENT' || p.status === 'ACTIVE') ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300 border border-sky-300' :
                  p.status === 'INPATIENT' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {p.status === 'ACTIVE' ? 'OUTPATIENT' : p.status}
                </span>
                {pendingOrder && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 animate-pulse border border-amber-300">
                    Admission Ordered (Pending Bed)
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-blue-600 dark:text-sky-400 font-bold mt-0.5">
                {p.patientNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {canAllocateNurse && (
              <button
                onClick={handleOpenAllocateNurse}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition transform active:scale-95"
              >
                <HeartHandshake className="w-4 h-4" />
                {p.assignedNurseName ? 'Reallocate Nurse' : 'Allocate Nurse'}
              </button>
            )}

            {canOrderAdmission && p.status !== 'INPATIENT' && !pendingOrder && (
              <button
                onClick={() => setAdmissionModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition transform active:scale-95"
              >
                <Stethoscope className="w-4 h-4" />
                + Order Inpatient Admission
              </button>
            )}

            {(isNurse || isDoctor || isAdmin) && (p.status === 'INPATIENT' || admissions.length > 0 || p.status === 'DISCHARGED') && (
              <>
                {p.status === 'INPATIENT' && (
                  <button
                    onClick={() => setNurseModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition transform active:scale-95"
                  >
                    <HeartPulse className="w-4 h-4" />
                    {isNurse ? 'Nurse Care & Vitals' : 'Inpatient Vitals & Observations'}
                  </button>
                )}
                {(isDoctor || isAdmin || isNurse) && (
                  <button
                    onClick={() => setDischargeModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/20 transition transform active:scale-95"
                  >
                    <FileText className="w-4 h-4" />
                    Discharge Summary & Clearance
                  </button>
                )}
              </>
            )}

            <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Blood Group: <strong className="font-bold">{p.bloodGroup || 'N/A'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{p.phoneNumber}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                <Shield className="w-4 h-4 text-slate-400" />
                <span>Insurance: {p.insuranceId || 'Private Pay'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Demographics & Care Team details */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block">Date of Birth / Age</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {p.dateOfBirth} ({p.age} years)
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Gender</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{p.gender}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Emergency Contact</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{p.emergencyContact || 'None Listed'}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Attending Doctor</span>
            <span className="font-semibold text-blue-700 dark:text-sky-400">
              {p.primaryDoctorName ? `👨‍⚕️ ${p.primaryDoctorName}` : 'Unassigned'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Assigned Nurse</span>
            <span className="font-semibold text-sky-700 dark:text-sky-400">
              {p.assignedNurseName && p.assignedNurseName !== p.primaryDoctorName ? `🩺 ${p.assignedNurseName}` : 'Unallocated'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Current Location</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {p.bedNumber ? `Bed ${p.bedNumber} (${p.wardName || 'Ward'})` : 'Outpatient (OPD)'}
            </span>
          </div>
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

      {/* Inpatient Bedside Vitals Section */}
      {p.status === 'INPATIENT' && (
        careContext?.latestVitals ? (
          <div className={`p-5 rounded-3xl border shadow-xs transition ${
            careContext.latestVitals.isAlert
              ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900'
              : 'bg-white dark:bg-slate-900 border-sky-200/80 dark:border-blue-900/60'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Inpatient Bedside Vital Signs</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-sky-300 border border-sky-300">
                      ✓ Checked by Nurse {careContext.latestVitals.recordedByName}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Recorded on {new Date(careContext.latestVitals.recordedAt).toLocaleDateString()} at{' '}
                    {new Date(careContext.latestVitals.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {careContext.bed && ` • Bed ${careContext.bed.bedNumber} (${careContext.ward?.wardName || 'Ward'})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => {
                    setNurseModalTab('mar');
                    setNurseModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition"
                >
                  <Pill className="w-3.5 h-3.5" /> Check Doses (MAR)
                </button>
                <button
                  onClick={() => {
                    setNurseModalTab('vitals');
                    setNurseModalOpen(true);
                  }}
                  className="text-xs font-semibold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  Full Vitals ({careContext.vitalsHistory?.length || 1}) &rarr;
                </button>
              </div>
            </div>

            {careContext.latestVitals.isAlert && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/50 border border-rose-300 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span><strong>Vital Alert:</strong> {careContext.latestVitals.alertMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                <span className="text-[10px] font-semibold text-slate-400 block">Temperature</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                  {careContext.latestVitals.temperature ? `${careContext.latestVitals.temperature} °F` : '--'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                <span className="text-[10px] font-semibold text-slate-400 block">Blood Pressure</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                  {careContext.latestVitals.bloodPressure || '--'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                <span className="text-[10px] font-semibold text-slate-400 block">Pulse / Heart Rate</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                  {careContext.latestVitals.pulse ? `${careContext.latestVitals.pulse} bpm` : '--'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                <span className="text-[10px] font-semibold text-slate-400 block">SpO₂ Oxygen</span>
                <span className={`text-base font-bold mt-0.5 block ${careContext.latestVitals.oxygenSaturation < 92 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100'}`}>
                  {careContext.latestVitals.oxygenSaturation ? `${careContext.latestVitals.oxygenSaturation}%` : '--'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                <span className="text-[10px] font-semibold text-slate-400 block">Resp. Rate</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                  {careContext.latestVitals.respiratoryRate ? `${careContext.latestVitals.respiratoryRate}/min` : '--'}
                </span>
              </div>
            </div>

            {careContext.latestVitals.notes && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 italic">
                Nurse Note: &ldquo;{careContext.latestVitals.notes}&rdquo;
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-3xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <span>⏳ Inpatient Vitals Pending Duty Nurse Examination</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                    Awaiting Check
                  </span>
                </h4>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300 mt-1 leading-relaxed">
                  Hospital inpatient protocol requires the duty nurse to perform the bedside examination and record vital signs before doctor review. Inpatient vitals will appear here and become visible to doctors in real-time once recorded.
                </p>
              </div>
            </div>
            {isNurse && (
              <button
                onClick={() => {
                  setNurseModalTab('vitals');
                  setNurseModalOpen(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shrink-0 shadow-sm"
              >
                Record Bedside Vitals
              </button>
            )}
          </div>
        )
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('records')}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'records'
              ? 'border-sky-500 text-blue-600 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" /> Medical Records ({history.medicalRecords?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('admissions')}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'admissions'
              ? 'border-sky-500 text-blue-600 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BedDouble className="w-4 h-4" /> Admission Orders ({admissions.length})
        </button>

        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'prescriptions'
              ? 'border-sky-500 text-blue-600 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Pill className="w-4 h-4" /> Prescriptions ({history.prescriptions?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'appointments'
              ? 'border-sky-500 text-blue-600 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" /> Appointments ({history.appointments?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('lab')}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'lab'
              ? 'border-sky-500 text-blue-600 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FlaskConical className="w-4 h-4" /> Laboratory ({history.labOrders?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'billing'
              ? 'border-sky-500 text-blue-600 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Receipt className="w-4 h-4" /> Billing & Invoices ({history.bills?.length || 0})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm min-h-[300px]">
        {/* 1. Records Tab */}
        {activeTab === 'records' && (
          <div>
            {!history.medicalRecords || history.medicalRecords.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-10">No clinical notes recorded for this patient yet.</p>
            ) : (
              <div className="space-y-4">
                {history.medicalRecords.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {r.diagnosis}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">{r.visitDate}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mb-2">
                      <strong className="text-slate-700 dark:text-slate-200">Chief Complaint:</strong> {r.chiefComplaint}
                    </p>
                    {r.icdCode && (
                      <span className="inline-block px-2 py-0.5 rounded bg-sky-50 dark:bg-blue-950 text-blue-700 dark:text-sky-300 text-[10px] font-mono font-semibold mb-2">
                        ICD: {r.icdCode}
                      </span>
                    )}
                    {r.treatment && (
                      <p className="text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-700 dark:text-slate-200">Treatment Plan:</strong> {r.treatment}
                      </p>
                    )}
                    {r.notes && (
                      <p className="text-slate-500 italic mt-2 text-[11px]">
                        Notes: {r.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Pill className="w-4 h-4 text-blue-600" />
                  <span>Clinical e-Prescriptions & Regimens</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Doctor prescribes medications & total doses &bull; Hospital pharmacy dispenses &bull; Nurse administers at bedside.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {p.status === 'INPATIENT' && (
                  <button
                    onClick={() => {
                      setNurseModalTab('mar');
                      setNurseModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Check Doses (eMAR)
                  </button>
                )}

                {canPrescribe && (
                  <button
                    onClick={() => openPrescribeModal()}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Prescribe Medication
                  </button>
                )}
              </div>
            </div>

            {!history.prescriptions || history.prescriptions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Pill className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-xs font-medium">No prescriptions issued for this patient yet.</p>
                {canPrescribe && (
                  <button
                    onClick={() => openPrescribeModal()}
                    className="mt-3 px-3 py-1.5 bg-sky-50 dark:bg-blue-950 text-blue-700 dark:text-sky-300 hover:bg-sky-100 text-xs font-bold rounded-xl inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Issue First Prescription
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Medication</th>
                      <th className="py-2.5 px-3">Dosage</th>
                      <th className="py-2.5 px-3">Frequency & Regimen</th>
                      <th className="py-2.5 px-3">Duration & Total Doses</th>
                      <th className="py-2.5 px-3">Route</th>
                      <th className="py-2.5 px-3">Pharmacy Status</th>
                      <th className="py-2.5 px-3 text-right">MAR Bedside Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.prescriptions.map((pr) => (
                      <tr key={pr.id}>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{pr.medicationName}</span>
                          <span className="text-[10px] text-slate-400">Dr. {pr.doctorName || 'Attending Physician'}</span>
                        </td>
                        <td className="py-3 px-3 font-semibold">{pr.dosage}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold inline-block">
                            {pr.frequency}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-800 dark:text-slate-200 font-medium">{pr.duration}</span>
                        </td>
                        <td className="py-3 px-3">{pr.route}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            pr.dispensingStatus === 'DISPENSED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-sky-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {pr.dispensingStatus === 'DISPENSED' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Dispensed {pr.quantityDispensed ? `(${pr.quantityDispensed} units)` : ''}
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                Awaiting Pharmacy
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setNurseModalPrescriptionId(pr.id);
                              setNurseModalTab('mar');
                              setNurseModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-50 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-sky-300 transition cursor-pointer"
                          >
                            {isNurse ? 'Administer Dose' : 'Check Doses (MAR)'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. Appointments Tab */}
        {activeTab === 'appointments' && (
          <div>
            {!history.appointments || history.appointments.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-10">No appointments scheduled.</p>
            ) : (
              <div className="space-y-3">
                {history.appointments.map((a) => (
                  <div key={a.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        {a.appointmentDate} &bull; {a.timeSlot}
                      </span>
                      <span className="text-slate-500">Type: {a.type}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-blue-800">
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Lab Tab */}
        {activeTab === 'lab' && (
          <div>
            {!history.labOrders || history.labOrders.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-10">No lab tests ordered.</p>
            ) : (
              <div className="space-y-3">
                {history.labOrders.map((lo) => {
                  const isReviewed = lo.status === 'REVIEWED' || !!lo.reviewedDate;
                  const isCompleted = lo.status === 'COMPLETED';
                  return (
                    <div
                      key={lo.id}
                      className={`p-4 rounded-2xl border text-xs space-y-3 transition ${
                        isReviewed
                          ? 'bg-gradient-to-r from-sky-50/70 to-blue-50/40 dark:from-blue-950/30 dark:to-blue-950/20 border-sky-200 dark:border-blue-800/80 shadow-xs'
                          : lo.result?.flag === 'CRITICAL'
                          ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                              {lo.testName} <span className="font-mono text-xs text-slate-400">({lo.testCode})</span>
                            </span>
                            {lo.priority && lo.priority !== 'ROUTINE' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                {lo.priority}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            Specimen: <strong className="text-slate-700 dark:text-slate-300">{lo.specimenType}</strong> &bull; Ordered by: <strong>{lo.doctorName || 'Attending Doctor'}</strong> &bull; {lo.orderedDate ? new Date(lo.orderedDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isReviewed ? (
                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300 border border-sky-300 dark:border-blue-800 flex items-center gap-1.5 shadow-2xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                              Doctor Signed & Sealed
                            </span>
                          ) : isCompleted ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-sky-300">
                                Result Ready
                              </span>
                              {isDoctor && (
                                <button
                                  onClick={() => openReviewModal(lo)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1 active:scale-95 cursor-pointer"
                                  title="Physician review & digital sign-off"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  Review & Sign
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              {lo.status === 'IN_PROGRESS' ? 'In Analysis' : lo.status === 'SPECIMEN_COLLECTED' ? 'Sample Drawn' : lo.status === 'RECEIVED' ? 'Specimen Received' : 'Pending Analysis'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Diagnostic Result Values */}
                      {lo.result && (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Observed Diagnostic Value:</span>
                            <div className="flex items-baseline gap-2">
                              <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                                {lo.result.resultValue} <span className="text-xs font-normal text-slate-500">{lo.result.unit}</span>
                              </span>
                              <span className="text-slate-400 text-[11px] font-mono">
                                (Reference: {lo.result.referenceRange})
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                              lo.result.flag === 'CRITICAL' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300 font-extrabold animate-pulse' :
                              lo.result.flag === 'HIGH' || lo.result.flag === 'LOW' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-sky-300'
                            }`}>
                              {lo.result.flag}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              Lab Tech: <strong>{lo.result.verifiedBy}</strong>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Prominent Physician Sign-Off Section in Patient History */}
                      {isReviewed && (
                        <div className="p-3.5 rounded-xl bg-sky-50/90 dark:bg-blue-950/50 border border-sky-200 dark:border-blue-800/70 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-sky-200 text-xs">
                              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
                              <span>Physician Clinical Sign-Off & Verification</span>
                            </div>
                            {lo.reviewedDate && (
                              <span className="text-[10px] text-blue-700 dark:text-sky-400 font-mono">
                                Signed: {new Date(lo.reviewedDate).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {lo.doctorReviewNotes && (
                            <p className="text-[11px] text-slate-700 dark:text-slate-200 italic bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-sky-100 dark:border-blue-900/50">
                              "{lo.doctorReviewNotes}"
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[11px] text-blue-800 dark:text-sky-300 pt-0.5">
                            <span>
                              Attending Physician: <strong className="font-semibold text-slate-900 dark:text-slate-100">{lo.reviewedByDoctorName || lo.doctorName || 'Attending Physician'}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-sky-300 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 text-blue-600" /> Clinically Sealed
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. Billing Tab */}
        {activeTab === 'billing' && (
          <div>
            {!history.bills || history.bills.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-10">No invoices issued.</p>
            ) : (
              <div className="space-y-3">
                {history.bills.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                        Invoice #{b.id} &bull; Total: ₹{Number(b.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-slate-500">
                        Paid: ₹{Number(b.paidAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} | Outstanding Balance: ₹{Number(b.balanceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      b.status === 'PAID'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-sky-300'
                        : (b.status === 'PARTIALLY_PAID' || b.status === 'PARTIAL')
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                    }`}>
                      {b.status === 'PARTIALLY_PAID' || b.status === 'PARTIAL' ? 'Partially Paid' : b.status === 'PAID' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. Admissions Tab */}
        {activeTab === 'admissions' && (
          <div>
            {admissions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                <BedDouble className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p>No inpatient admission orders on file for this patient.</p>
                {canOrderAdmission && p.status !== 'INPATIENT' && (
                  <button
                    onClick={() => setAdmissionModalOpen(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    Create Admission Order
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {admissions.map((adm) => (
                  <div
                    key={adm.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700 text-xs space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                          Order #{adm.id} &bull; {adm.diagnosis}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          adm.status === 'ORDERED'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse border border-amber-300'
                            : adm.status === 'BED_ASSIGNED'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-sky-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {adm.status === 'ORDERED' ? 'Pending Bed Assignment' : adm.status === 'BED_ASSIGNED' ? 'Bed Allocated' : adm.status}
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold self-start sm:self-auto ${
                        adm.priority === 'EMERGENCY'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                          : adm.priority === 'URGENT'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {adm.priority}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Attending Doctor:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Dr. {adm.doctorName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Recommended Ward:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {adm.recommendedWardType}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Ordered On:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {adm.orderDate ? new Date(adm.orderDate).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Assigned Bed:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {adm.assignedBedNumber ? `Bed ${adm.assignedBedNumber} (${adm.assignedWardName})` : 'Awaiting Assignment'}
                        </span>
                      </div>
                    </div>

                    {adm.notes && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <span className="text-slate-400 block">Physician Instructions:</span>
                        <p className="text-slate-600 dark:text-slate-300 italic mt-0.5">{adm.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Physician Admission Order Modal */}
      <Modal
        isOpen={admissionModalOpen}
        onClose={() => setAdmissionModalOpen(false)}
        title={`Prescribe Inpatient Admission for ${p.name}`}
        maxWidth="max-w-lg"
      >
        {orderError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {orderError}
          </div>
        )}

        <form onSubmit={handleCreateOrderSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[10px]">Patient Record</span>
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
              {p.name} ({p.patientNumber})
            </p>
            <p className="text-[11px] text-slate-500">
              Age: {p.age} &bull; Gender: {p.gender} &bull; Blood: {p.bloodGroup || 'N/A'}
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Clinical Diagnosis & Indication for Admission *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Acute myocardial infarction, Severe pancreatitis, High-grade fever"
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
                <option value="URGENT">Urgent</option>
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
              placeholder="e.g., Bed rest, continuous SpO2 monitoring, maintain IV drip..."
              value={orderForm.notes}
              onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdmissionModalOpen(false)}
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

      {/* Nurse Care Dossier Modal */}
      <NurseCareModal
        isOpen={nurseModalOpen}
        onClose={() => setNurseModalOpen(false)}
        patientId={id}
        initialTab="vitals"
        onDataUpdated={loadHistory}
      />

      {/* Discharge Summary & Governance Modal */}
      {dischargeModalOpen && (
        <DischargeSummaryModal
          isOpen={dischargeModalOpen}
          onClose={() => setDischargeModalOpen(false)}
          admissionOrderId={careContext?.admissionOrder?.id || admissions.find(a => a.status === 'BED_ASSIGNED' || a.status === 'DISCHARGE_ORDERED' || a.status === 'DISCHARGED')?.id || null}
          patient={p}
          patientId={Number(id)}
          bed={careContext?.bed ? { bedNumber: careContext.bed.bedNumber, wardName: careContext.ward?.wardName } : null}
          onDischargeComplete={() => {
            loadHistory();
          }}
        />
      )}

      {/* Doctor Lab Review & Sign Modal */}
      <Modal
        isOpen={reviewLabModalOpen}
        onClose={() => setReviewLabModalOpen(false)}
        title={`Physician Clinical Sign-Off: Lab #${selectedLabForReview?.id}`}
        maxWidth="max-w-md"
      >
        {reviewError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-xs text-rose-700 dark:text-rose-300">
            {reviewError}
          </div>
        )}

        {selectedLabForReview && (
          <form onSubmit={handleDoctorReviewSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-sky-50 dark:bg-blue-950/40 rounded-xl border border-sky-200 dark:border-blue-900/60 space-y-1.5">
              <p className="font-bold text-blue-900 dark:text-sky-200">
                {selectedLabForReview.testName} <span className="font-mono font-normal">({selectedLabForReview.testCode})</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                Patient: <strong>{history.name}</strong> &bull; Specimen: <strong>{selectedLabForReview.specimenType}</strong>
              </p>
              {selectedLabForReview.result && (
                <div className="mt-2 p-2 bg-white dark:bg-slate-900 rounded-lg flex justify-between items-center text-[11px] border border-slate-200 dark:border-slate-800">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                    Result: {selectedLabForReview.result.resultValue} {selectedLabForReview.result.unit}
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    (Ref: {selectedLabForReview.result.referenceRange})
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Physician Assessment & Clinical Plan *
              </label>
              <textarea
                required
                rows={3}
                value={doctorReviewNotes}
                onChange={(e) => setDoctorReviewNotes(e.target.value)}
                placeholder="Enter clinical assessment notes..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>By signing, you clinically verify this laboratory report for the patient's permanent medical history.</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewLabModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReview || !doctorReviewNotes.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                {isSubmittingReview ? 'Signing...' : 'Sign & Seal Report'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Allocate Nurse Modal */}
      <Modal
        isOpen={allocateNurseModalOpen}
        onClose={() => setAllocateNurseModalOpen(false)}
        title="Allocate Dedicated Nurse"
      >
        <form onSubmit={handleAllocateNurseSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 block">Target Patient</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              {p.name} ({p.patientNumber})
            </span>
            <span className="text-slate-400 block text-[11px] mt-0.5">
              Status: {p.status} {p.bedNumber ? `• Bed ${p.bedNumber} (${p.wardName})` : ''}
            </span>
          </div>

          {allocateError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{allocateError}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Select Nursing Staff *
            </label>
            <select
              required
              value={selectedNurseId}
              onChange={(e) => setSelectedNurseId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            >
              <option value="">-- Choose Nurse --</option>
              {nursesList.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.fullName} (@{n.username}) {n.departmentName ? `• ${n.departmentName}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-[11px] text-sky-800 dark:text-sky-300 flex items-center gap-2 border border-sky-200 dark:border-sky-800">
            <HeartPulse className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Allocating will immediately synchronize this patient into the Nurse's clinical care roster and update the patient's care portal.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAllocateNurseModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={allocatingNurse || !selectedNurseId}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <HeartHandshake className="w-4 h-4" />
              {allocatingNurse ? 'Allocating...' : 'Confirm Allocation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Doctor e-Prescription Authoring Modal */}
      <Modal
        isOpen={prescribeModalOpen}
        onClose={() => setPrescribeModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-blue-700 dark:text-sky-400">
            <Pill className="w-5 h-5" />
            <span>Author Inpatient e-Prescription</span>
          </div>
        }
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handlePrescribeSubmit} className="space-y-4 text-xs">
          {prescribeError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{prescribeError}</span>
            </div>
          )}

          {/* Quick Select Common Inpatient Medications */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1 text-[11px] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Quick Formularies / Common Inpatient Medications:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MEDICATIONS.map((med) => (
                <button
                  key={med.name}
                  type="button"
                  onClick={() => openPrescribeModal(med)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                    prescribeForm.medicationName === med.name
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
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Medication Name *
              </label>
              <input
                type="text"
                required
                value={prescribeForm.medicationName}
                onChange={(e) => setPrescribeForm({ ...prescribeForm, medicationName: e.target.value })}
                placeholder="e.g. Amoxicillin, Ceftriaxone"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Strength / Dosage *
              </label>
              <input
                type="text"
                required
                value={prescribeForm.dosage}
                onChange={(e) => setPrescribeForm({ ...prescribeForm, dosage: e.target.value })}
                placeholder="e.g. 500mg, 1g, 650mg, 1 tablet"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Dose Frequency (Doses / Day) *
              </label>
              <select
                value={prescribeForm.frequencyCode}
                onChange={(e) => {
                  const sel = FREQUENCY_OPTIONS.find((f) => f.code === e.target.value) || FREQUENCY_OPTIONS[0];
                  setPrescribeForm({
                    ...prescribeForm,
                    frequencyCode: sel.code,
                    frequencyLabel: sel.label,
                    dosesPerDay: sel.dosesPerDay
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              >
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Duration (Days) *
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="90"
                  required
                  value={prescribeForm.durationDays}
                  onChange={(e) => setPrescribeForm({ ...prescribeForm, durationDays: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Route of Delivery *
              </label>
              <select
                value={prescribeForm.route}
                onChange={(e) => setPrescribeForm({ ...prescribeForm, route: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              >
                <option value="Oral">Oral</option>
                <option value="Intravenous (IV)">Intravenous (IV)</option>
                <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                <option value="Subcutaneous">Subcutaneous</option>
                <option value="Inhalation">Inhalation</option>
                <option value="Topical">Topical</option>
                <option value="Sublingual">Sublingual</option>
              </select>
            </div>
          </div>

          {/* Real-time Calculated Regimen & Total Doses Card */}
          <div className="p-3.5 rounded-2xl bg-sky-50/90 dark:bg-blue-950/40 border border-sky-200 dark:border-blue-900/60 flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-blue-950 dark:text-sky-200 block text-xs">
                Inpatient Dose Regimen Calculation:
              </span>
              <p className="text-blue-800 dark:text-sky-300 text-[11px] mt-0.5">
                {prescribeForm.frequencyCode === 'STAT' ? (
                  <><strong>1 Single STAT Dose</strong> to be administered immediately.</>
                ) : (
                  <>
                    <strong>{prescribeForm.dosesPerDay} dose(s)/day</strong> &times; <strong>{prescribeForm.durationDays || 1} day(s)</strong> ={' '}
                    <span className="font-extrabold underline text-blue-950 dark:text-white text-xs">
                      {Math.max(1, (parseInt(prescribeForm.dosesPerDay, 10) || 1) * (parseInt(prescribeForm.durationDays, 10) || 1))} Total Doses
                    </span>
                  </>
                )}
                {' '}&bull; Will be forwarded to the pharmacy inventory for dispensing and scheduled in the nurse's eMAR roster.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setPrescribeModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={prescribeSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Pill className="w-4 h-4" />
              {prescribeSubmitting ? 'Signing...' : 'Sign & Issue Prescription'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bedside Nursing Care & eMAR Modal */}
      <NurseCareModal
        isOpen={nurseModalOpen}
        onClose={() => setNurseModalOpen(false)}
        patientId={Number(id)}
        initialTab={nurseModalTab}
        initialPrescriptionId={nurseModalPrescriptionId}
        onDataUpdated={() => {
          loadHistory();
        }}
      />
    </div>
  );
};

export default PatientDetailPage;
