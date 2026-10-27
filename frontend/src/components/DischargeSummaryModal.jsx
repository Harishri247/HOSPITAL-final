import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { dischargeApi, nurseApi, billingApi, wardApi, admissionApi, patientApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Printer,
  CreditCard,
  HeartPulse,
  Stethoscope,
  Building2,
  Calendar,
  Lock,
  UserCheck,
  ChevronRight,
  Sparkles,
  BedDouble
} from 'lucide-react';

export const DischargeSummaryModal = ({
  isOpen,
  onClose,
  admissionOrderId,
  patient,
  patientId,
  bed,
  onDischargeComplete,
  onCompleted
}) => {
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole(['ROLE_DOCTOR']) || user?.role === 'ROLE_DOCTOR' || user?.role === 'DOCTOR';
  const isAdmin = hasRole(['ROLE_ADMIN']) || user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  const isReceptionist = hasRole(['ROLE_RECEPTIONIST']) || user?.role === 'ROLE_RECEPTIONIST' || user?.role === 'RECEPTIONIST';
  const isNurse = hasRole(['ROLE_NURSE']) || user?.role === 'ROLE_NURSE' || user?.role === 'NURSE';
  const canSign = isDoctor || isAdmin;
  const canClearBilling = isAdmin || isReceptionist || isDoctor;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [clearingBill, setClearingBill] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Patient & Summary State
  const targetPatientId = patient?.id || patientId || null;
  const [activePatient, setActivePatient] = useState(patient || null);
  const [summary, setSummary] = useState(null);
  const [resolvedOrderId, setResolvedOrderId] = useState(admissionOrderId || null);
  const [careContext, setCareContext] = useState(null);
  const [patientBills, setPatientBills] = useState([]);
  const [activeTab, setActiveTab] = useState('workflow'); // 'workflow' | 'document'

  // Form Fields
  const [formData, setFormData] = useState({
    admissionDiagnosis: '',
    finalDiagnosis: '',
    icdCode: '',
    hospitalCourse: '',
    conditionAtDischarge: 'STABLE',
    dischargeMedications: '',
    dischargeInstructions: '',
    followUpDate: '',
    followUpInstructions: '',
    doctorSignature: ''
  });

  const [signatureAgreed, setSignatureAgreed] = useState(false);

  useEffect(() => {
    if (patient) {
      setActivePatient(patient);
    }
  }, [patient]);

  useEffect(() => {
    if (isOpen && (admissionOrderId || targetPatientId)) {
      loadData();
    }
  }, [isOpen, admissionOrderId, targetPatientId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      let currentPat = activePatient || patient;
      if (!currentPat && targetPatientId) {
        try {
          const pRes = await patientApi.getById(targetPatientId);
          currentPat = pRes.data;
          setActivePatient(currentPat);
        } catch (pe) {
          console.warn('Could not fetch patient details:', pe);
        }
      }

      const pId = currentPat?.id || targetPatientId;
      let activeOrdId = admissionOrderId;
      if (!activeOrdId && pId) {
        try {
          const admRes = await admissionApi.getByPatient(pId);
          const orders = admRes.data || [];
          const activeOrder = orders.find(o => o.status === 'BED_ASSIGNED' || o.status === 'DISCHARGE_ORDERED') || orders[0];
          if (activeOrder) {
            activeOrdId = activeOrder.id;
            setResolvedOrderId(activeOrder.id);
          }
        } catch (e) {
          console.warn('Could not load admission orders for patient', e);
        }
      } else if (admissionOrderId) {
        setResolvedOrderId(admissionOrderId);
      }

      let currentSummary = null;
      if (activeOrdId) {
        try {
          const res = await dischargeApi.getByAdmission(activeOrdId);
          if (res && res.data) {
            currentSummary = res.data;
            setSummary(currentSummary);
          } else {
            setSummary(null);
          }
        } catch (e) {
          // not drafted yet
          setSummary(null);
        }
      }

      // Check existing discharge summaries for patient if not found by admission order
      if (!currentSummary && pId) {
        try {
          const patientSummariesRes = await dischargeApi.getByPatient(pId);
          const summaries = patientSummariesRes.data || [];
          const activeSummary = summaries.find(s => s.status !== 'DISCHARGED') || summaries[0];
          if (activeSummary) {
            currentSummary = activeSummary;
            setSummary(activeSummary);
            if (activeSummary.admissionOrderId) {
              setResolvedOrderId(activeSummary.admissionOrderId);
            }
          }
        } catch (e) {
          console.warn('Could not load patient discharge summaries', e);
        }
      }

      // Load patient bedside vitals & context
      if (pId) {
        try {
          const careRes = await nurseApi.getPatientCareContext(pId);
          setCareContext(careRes.data || null);
          if (!activeOrdId && careRes?.data?.admissionOrder?.id) {
            setResolvedOrderId(careRes.data.admissionOrder.id);
          }
        } catch (e) {
          console.warn('Could not load care context', e);
        }

        // Load bills
        try {
          const billRes = await billingApi.getByPatient(pId);
          setPatientBills(billRes.data || []);
        } catch (e) {
          console.warn('Could not load bills', e);
        }
      }

      // Populate form data
      if (currentSummary) {
        setFormData({
          admissionDiagnosis: currentSummary.admissionDiagnosis || '',
          finalDiagnosis: currentSummary.finalDiagnosis || '',
          icdCode: currentSummary.icdCode || '',
          hospitalCourse: currentSummary.hospitalCourse || '',
          conditionAtDischarge: currentSummary.conditionAtDischarge || 'STABLE',
          dischargeMedications: currentSummary.dischargeMedications || '',
          dischargeInstructions: currentSummary.dischargeInstructions || '',
          followUpDate: currentSummary.followUpDate ? currentSummary.followUpDate.substring(0, 10) : '',
          followUpInstructions: currentSummary.followUpInstructions || '',
          doctorSignature: currentSummary.doctorSignature || (user?.fullName ? `Dr. ${user.fullName}` : '')
        });
      } else {
        // Defaults from context
        setFormData({
          admissionDiagnosis: careContext?.admissionOrder?.diagnosis || 'Acute Inpatient Care',
          finalDiagnosis: '',
          icdCode: '',
          hospitalCourse: '',
          conditionAtDischarge: 'STABLE',
          dischargeMedications: '',
          dischargeInstructions: 'Take medications as prescribed. Avoid strenuous activities. Report any high fever or sudden acute pain immediately.',
          followUpDate: '',
          followUpInstructions: 'Follow-up visit with attending doctor in 7 days.',
          doctorSignature: user?.fullName ? `Dr. ${user.fullName}` : ''
        });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load discharge details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    const targetOrderId = (resolvedOrderId && Number(resolvedOrderId) > 0)
      ? Number(resolvedOrderId)
      : (admissionOrderId && Number(admissionOrderId) > 0 ? Number(admissionOrderId) : null);
    const pId = activePatient?.id || targetPatientId;

    if (!targetOrderId && !pId) {
      setError('Patient record is required to create a discharge summary.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = {
        patientId: pId,
        admissionOrderId: targetOrderId,
        admissionDiagnosis: formData.admissionDiagnosis,
        finalDiagnosis: formData.finalDiagnosis,
        icdCode: formData.icdCode,
        hospitalCourse: formData.hospitalCourse,
        conditionAtDischarge: formData.conditionAtDischarge,
        dischargeMedications: formData.dischargeMedications,
        dischargeInstructions: formData.dischargeInstructions,
        followUpDate: formData.followUpDate ? formData.followUpDate : null,
        followUpInstructions: formData.followUpInstructions
      };

      const res = await dischargeApi.saveDraft(payload);
      setSummary(res.data);
      if (res.data?.admissionOrderId) {
        setResolvedOrderId(res.data.admissionOrderId);
      }
      setSuccessMsg('Discharge summary draft saved successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save discharge summary draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSignDocument = async () => {
    if (!summary?.id) {
      setError('Please save the discharge summary draft first before signing.');
      return;
    }
    if (!formData.doctorSignature.trim()) {
      setError('Doctor digital signature is required.');
      return;
    }
    if (!formData.finalDiagnosis.trim()) {
      setError('Final discharge diagnosis is required before signing.');
      return;
    }
    if (!signatureAgreed) {
      setError('Please certify the clinical discharge declaration.');
      return;
    }

    setSigning(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = {
        doctorSignature: formData.doctorSignature.trim(),
        finalDiagnosis: formData.finalDiagnosis,
        icdCode: formData.icdCode,
        hospitalCourse: formData.hospitalCourse,
        conditionAtDischarge: formData.conditionAtDischarge,
        dischargeMedications: formData.dischargeMedications,
        dischargeInstructions: formData.dischargeInstructions,
        followUpDate: formData.followUpDate ? formData.followUpDate : null,
        followUpInstructions: formData.followUpInstructions
      };

      const res = await dischargeApi.signSummary(summary.id, payload);
      setSummary(res.data);
      setSuccessMsg('Clinical document digitally signed and sealed by attending physician.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to digitally sign document');
    } finally {
      setSigning(false);
    }
  };

  const handleClearBilling = async () => {
    if (!summary?.id) {
      setError('Discharge summary record not found.');
      return;
    }
    if (!summary.isSigned) {
      setError('Doctor must sign the clinical discharge summary before billing checkout.');
      return;
    }

    setClearingBill(true);
    setError('');
    setSuccessMsg('');
    try {
      // Find latest unpaid or general bill for this patient/admission
      const activeBill = patientBills.find(b => b.admissionId === Number(admissionOrderId)) || patientBills[0];
      const payload = activeBill ? { billId: activeBill.id, notes: 'Discharge clearance confirmed' } : {};

      const res = await dischargeApi.clearBilling(summary.id, payload);
      setSummary(res.data);
      setSuccessMsg('Hospital billing and account clearance completed.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clear billing');
    } finally {
      setClearingBill(false);
    }
  };

  const handleCompleteDischarge = async () => {
    if (!summary?.id) {
      setError('Discharge summary record not found.');
      return;
    }
    if (!summary.isSigned) {
      setError('Doctor signature is required before completing discharge.');
      return;
    }
    if (!summary.billingCleared) {
      setError('Billing clearance is required before final discharge checkout.');
      return;
    }

    const pName = (activePatient || patient)?.name || 'this patient';
    if (!window.confirm(`Are you sure you want to finalize discharge for ${pName} and release the bed?`)) {
      return;
    }

    setCompleting(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await dischargeApi.completeDischarge(summary.id);
      setSummary(res.data);
      setSuccessMsg('Patient officially discharged. Bed released and set to AVAILABLE.');
      const cb = onDischargeComplete || onCompleted;
      if (cb) {
        cb(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete patient discharge');
    } finally {
      setCompleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Workflow steps
  const isDrafted = Boolean(summary);
  const isSigned = Boolean(summary?.isSigned);
  const isBillingCleared = Boolean(summary?.billingCleared);
  const isDischarged = summary?.status === 'DISCHARGED';
  const displayPatient = activePatient || patient;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Inpatient Discharge & Clinical Governance"
      maxWidth="max-w-4xl"
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading clinical admission and discharge data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header patient banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center font-bold text-lg shrink-0">
                {displayPatient?.name?.charAt(0) || 'P'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight">{displayPatient?.name || 'Inpatient'}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                    MRN: {displayPatient?.patientNumber || 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                  <span>{displayPatient?.gender || 'Unknown'}, {displayPatient?.age || '—'} yrs</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-sky-300">
                    <BedDouble className="w-3.5 h-3.5" />
                    Bed {bed?.bedNumber || careContext?.bed?.bedNumber || 'Assigned'} ({bed?.wardName || careContext?.ward?.wardName || 'Inpatient Ward'})
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'workflow' ? 'document' : 'workflow')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 transition flex items-center gap-1.5"
              >
                {activeTab === 'workflow' ? (
                  <>
                    <Printer className="w-3.5 h-3.5 text-sky-400" />
                    View Printable Document
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
                    Back to Discharge Workflow
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Workflow Stepper Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Discharge Governance Protocol
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* Step 1: Nurse Care */}
              <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                careContext?.latestVitals
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-sky-300 text-blue-900 dark:text-blue-200'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <HeartPulse className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] leading-tight">1. Nurse Care</div>
                  <div className="text-[10px] opacity-80">
                    {careContext?.latestVitals ? 'Vitals Monitored' : 'Pending Observations'}
                  </div>
                </div>
              </div>

              {/* Step 2: Summary Draft */}
              <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                isDrafted
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-sky-300 text-blue-900 dark:text-blue-200'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isDrafted ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] leading-tight">2. Summary Draft</div>
                  <div className="text-[10px] opacity-80">{isDrafted ? 'Prepared' : 'Awaiting Prep'}</div>
                </div>
              </div>

              {/* Step 3: Doctor Signed */}
              <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                isSigned
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-sky-300 text-blue-900 dark:text-blue-200'
                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 text-amber-900 dark:text-amber-200'
              }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isSigned ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] leading-tight">3. Doctor Signed</div>
                  <div className="text-[10px] opacity-80">{isSigned ? 'Digitally Sealed' : 'Required'}</div>
                </div>
              </div>

              {/* Step 4: Billing Clearance & Bed Release */}
              <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                isDischarged
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-sky-300 text-blue-900 dark:text-blue-200'
                  : isBillingCleared
                  ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 text-sky-900 dark:text-sky-200'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isDischarged ? 'bg-blue-600 text-white' : isBillingCleared ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[11px] leading-tight">4. Discharge & Bed</div>
                  <div className="text-[10px] opacity-80">
                    {isDischarged ? 'Bed Released' : isBillingCleared ? 'Billing Cleared' : 'Pending Clearance'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-sky-300 dark:border-blue-900 text-blue-800 dark:text-sky-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'workflow' ? (
            <div className="space-y-6">
              {/* Nurse Vitals Review Card */}
              {careContext?.latestVitals && (
                <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-blue-950/20 border border-sky-200 dark:border-blue-900/60">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-sky-100 dark:border-blue-900/40">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-blue-900 dark:text-sky-200">
                        Bedside Vitals Checked by Nurse {careContext.latestVitals.recordedByName}
                      </span>
                    </div>
                    <span className="text-[11px] text-blue-700 dark:text-sky-300">
                      {new Date(careContext.latestVitals.recordedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 text-xs">
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-sky-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">Blood Pressure</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {careContext.latestVitals.bloodPressureSys}/{careContext.latestVitals.bloodPressureDia} mmHg
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-sky-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">Heart Rate</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {careContext.latestVitals.heartRate} bpm
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-sky-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">SpO2</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {careContext.latestVitals.spo2}%
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-sky-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">Temperature</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {careContext.latestVitals.temperature}°F
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-sky-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">Status</span>
                      <span className={`font-bold ${careContext.latestVitals.isAlert ? 'text-rose-600' : 'text-blue-600'}`}>
                        {careContext.latestVitals.isAlert ? 'Needs Attention' : 'Clinically Stable'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 & 3: Clinical Discharge Summary Details Form */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    Doctor Clinical Discharge Summary
                  </h3>
                  {isSigned && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-sky-300 border border-sky-300 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Signed & Locked
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Admission Diagnosis
                    </label>
                    <input
                      type="text"
                      disabled={isSigned}
                      value={formData.admissionDiagnosis}
                      onChange={(e) => setFormData({ ...formData, admissionDiagnosis: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-75"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Final Discharge Diagnosis <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isSigned}
                      placeholder="e.g. Acute Gastroenteritis, Resolved"
                      value={formData.finalDiagnosis}
                      onChange={(e) => setFormData({ ...formData, finalDiagnosis: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 disabled:opacity-75"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ICD-10 Diagnostic Code
                    </label>
                    <input
                      type="text"
                      disabled={isSigned}
                      placeholder="e.g. A09, J18.9"
                      value={formData.icdCode}
                      onChange={(e) => setFormData({ ...formData, icdCode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 disabled:opacity-75"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Condition At Discharge
                    </label>
                    <select
                      disabled={isSigned}
                      value={formData.conditionAtDischarge}
                      onChange={(e) => setFormData({ ...formData, conditionAtDischarge: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 disabled:opacity-75"
                    >
                      <option value="STABLE">STABLE - Clinically Fit for Home Care</option>
                      <option value="IMPROVED">IMPROVED - Symptoms Under Control</option>
                      <option value="RECOVERED">RECOVERED - Complete Resolution</option>
                      <option value="TRANSFERRED">TRANSFERRED - Transferred to Specialized Center</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Hospital Course & Clinical Treatment Notes
                    </label>
                    <textarea
                      rows={3}
                      disabled={isSigned}
                      placeholder="Summary of inpatient stay, treatments administered, laboratory improvements..."
                      value={formData.hospitalCourse}
                      onChange={(e) => setFormData({ ...formData, hospitalCourse: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 disabled:opacity-75"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Discharge Medications & Regimen
                    </label>
                    <textarea
                      rows={2}
                      disabled={isSigned}
                      placeholder="e.g. Tab Amoxicillin 500mg - 1 TID x 5 days; Tab Paracetamol 650mg SOS"
                      value={formData.dischargeMedications}
                      onChange={(e) => setFormData({ ...formData, dischargeMedications: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 disabled:opacity-75"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Follow-Up Appointment Date
                      </label>
                      <input
                        type="date"
                        disabled={isSigned}
                        value={formData.followUpDate}
                        onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 disabled:opacity-75"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Follow-Up Instructions
                      </label>
                      <input
                        type="text"
                        disabled={isSigned}
                        placeholder="e.g. Return in 7 days for repeat CBC and review"
                        value={formData.followUpInstructions}
                        onChange={(e) => setFormData({ ...formData, followUpInstructions: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 disabled:opacity-75"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Post-Discharge Care & Emergency Warning Signs
                    </label>
                    <textarea
                      rows={2}
                      disabled={isSigned}
                      placeholder="Diet instructions, wound care, red-flag symptoms to report immediately..."
                      value={formData.dischargeInstructions}
                      onChange={(e) => setFormData({ ...formData, dischargeInstructions: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 disabled:opacity-75"
                    />
                  </div>
                </div>

                {!isSigned && canSign && (
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={saving}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                      {saving ? 'Saving Draft...' : 'Save Summary Draft'}
                    </button>
                  </div>
                )}
              </div>

              {/* Step 4: Doctor Digital Signature Box */}
              <div className={`p-5 rounded-2xl border transition ${
                isSigned
                  ? 'bg-blue-50/70 dark:bg-blue-950/20 border-sky-300 dark:border-blue-800'
                  : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 dark:border-amber-800/40">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-5 h-5 ${isSigned ? 'text-blue-600' : 'text-amber-600'}`} />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Step 3: Attending Doctor Digital Signature & Clinical Release
                    </h3>
                  </div>
                  {isSigned && (
                    <span className="text-[11px] font-bold text-blue-700 dark:text-sky-300">
                      Certified on {new Date(summary.signedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {isSigned ? (
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <span>Signed by:</span>
                        <span className="text-blue-700 dark:text-sky-300 underline decoration-sky-500">
                          {summary.doctorSignature}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Verification Stamp: {summary.signatureHash}
                      </p>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold text-[11px] border border-sky-300 inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Legally Sealed Clinical Document
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Attending Doctor Signature / Credentials <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Sarah Jenkins, MD (License #MD-48201)"
                        value={formData.doctorSignature}
                        onChange={(e) => setFormData({ ...formData, doctorSignature: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 font-serif"
                      />
                    </div>

                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={signatureAgreed}
                        onChange={(e) => setSignatureAgreed(e.target.checked)}
                        className="mt-0.5 rounded text-blue-600 focus:ring-sky-500"
                      />
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        I hereby attest as the attending physician that I have reviewed the patient’s condition, bedside nursing notes, and vital trends. The patient is clinically stable and fit for discharge.
                      </span>
                    </label>

                    {canSign ? (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSignDocument}
                          disabled={signing || !formData.doctorSignature.trim() || !signatureAgreed}
                          className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          {signing ? 'Signing Document...' : 'Sign Clinical Document'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 italic">
                        Only an attending Doctor or Administrator can digitally sign this clinical discharge summary.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Step 5: Billing Clearance & Checkout */}
              <div className={`p-5 rounded-2xl border transition ${
                isBillingCleared
                  ? 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <CreditCard className={`w-5 h-5 ${isBillingCleared ? 'text-sky-600' : 'text-slate-400'}`} />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Step 4: Hospital Billing & Account Clearance
                    </h3>
                  </div>
                  {isBillingCleared && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Billing Cleared
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="text-slate-600 dark:text-slate-300">
                      {patientBills.length > 0 ? (
                        <>
                          <span>Active Patient Bill(s): </span>
                          <strong className="font-bold text-slate-800 dark:text-slate-100">
                            ₹{patientBills.reduce((acc, b) => acc + Number(b.balanceAmount || 0), 0).toFixed(2)} pending balance
                          </strong>
                        </>
                      ) : (
                        <span>No outstanding pending balance for this patient.</span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clearance confirms medical fees, room charges, and pharmacy orders are verified.
                    </p>
                  </div>

                  {!isBillingCleared && canClearBilling && (
                    <button
                      type="button"
                      onClick={handleClearBilling}
                      disabled={clearingBill || !isSigned}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      {clearingBill ? 'Verifying...' : 'Clear Hospital Billing'}
                    </button>
                  )}
                </div>
              </div>

              {/* Step 6: Final Discharge Checkout & Bed Release */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-sky-400" />
                    Final Step: Patient Discharge & Bed Release
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {isDischarged
                      ? 'Patient is discharged. Assigned bed has been released and reset to AVAILABLE.'
                      : 'Releases the occupied bed, resets patient status to OUTPATIENT, and records completed hospital discharge.'}
                  </p>
                </div>

                {!isDischarged ? (
                  <button
                    type="button"
                    onClick={handleCompleteDischarge}
                    disabled={completing || !isSigned || !isBillingCleared}
                    className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-sky-500 hover:from-blue-600 hover:to-blue-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {completing ? 'Releasing Bed...' : 'Discharge Patient & Release Bed'}
                  </button>
                ) : (
                  <div className="px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Completed & Bed Released
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Printable Clinical Document View */
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition"
                >
                  <Printer className="w-4 h-4" />
                  Print Official Discharge Summary
                </button>
              </div>

              <div id="printable-discharge-summary" className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-900 dark:text-slate-100 font-sans space-y-6">
                {/* Hospital Header */}
                <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-black text-xl">
                      +
                    </div>
                    <div>
                      <h1 className="text-xl font-extrabold tracking-tight uppercase font-display">
                        Metro General Hospital & Research Institute
                      </h1>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                        Department of Clinical Inpatient Medicine • Discharge Summary
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-500 font-mono">
                    <div>DOC-ID: DS-{summary?.id || 'DRAFT'}</div>
                    <div>Date: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Patient Demographics Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Patient Name</span>
                    <span className="font-bold text-sm">{patient?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">MRN Number</span>
                    <span className="font-mono font-bold">{patient?.patientNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Age / Gender</span>
                    <span className="font-semibold">{patient?.age || '—'} Y / {patient?.gender || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Ward & Bed</span>
                    <span className="font-bold text-blue-700 dark:text-sky-400">
                      {bed?.bedNumber || careContext?.bed?.bedNumber || 'Bed'} ({bed?.wardName || careContext?.ward?.wardName || 'Ward'})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Admission Date</span>
                    <span className="font-semibold">
                      {summary?.admissionDate ? new Date(summary.admissionDate).toLocaleDateString() : 'Active Inpatient'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Discharge Date</span>
                    <span className="font-semibold">
                      {summary?.dischargeDate ? new Date(summary.dischargeDate).toLocaleDateString() : 'Discharge Authorized'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Discharge Condition</span>
                    <span className="font-bold text-blue-700 dark:text-sky-400">
                      {formData.conditionAtDischarge || 'STABLE'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Attending Physician</span>
                    <span className="font-bold">{formData.doctorSignature || 'Dr. Attending Physician'}</span>
                  </div>
                </div>

                {/* Diagnoses */}
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Admission Diagnosis
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                        {formData.admissionDiagnosis || 'Acute Inpatient Admission'}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl border border-sky-300 dark:border-blue-800 bg-sky-50/30 dark:bg-blue-950/20">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-sky-400 uppercase tracking-wider block">
                        Final Discharge Diagnosis & ICD-10
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white mt-1">
                        {formData.finalDiagnosis || 'Pending Doctor Sign-off'}
                        {formData.icdCode && ` (ICD-10: ${formData.icdCode})`}
                      </p>
                    </div>
                  </div>

                  {/* Course in Hospital */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Hospital Course & Summary of Care
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {formData.hospitalCourse || 'Patient responded satisfactorily to clinical inpatient management and bedside monitoring.'}
                    </p>
                  </div>

                  {/* Medications */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Discharge Medications & Regimen
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre-line">
                      {formData.dischargeMedications || 'Continue home medications as prescribed.'}
                    </p>
                  </div>

                  {/* Care Instructions & Follow-up */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Post-Discharge Instructions & Diet
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {formData.dischargeInstructions || 'Standard home care regimen.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Follow-Up Appointment
                      </span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {formData.followUpDate ? `Scheduled Date: ${formData.followUpDate}` : 'Follow-up as advised.'}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">
                        {formData.followUpInstructions}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Digital Verification & Stamp Seal */}
                <div className="mt-6 pt-4 border-t-2 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="p-3 rounded-xl border border-sky-300 dark:border-blue-800 bg-sky-50/50 dark:bg-blue-950/20 text-xs font-mono">
                    <div className="text-[10px] font-bold text-blue-800 dark:text-sky-300 uppercase">
                      Clinical Document Cryptographic Seal
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 text-[11px] mt-0.5">
                      Hash: {summary?.signatureHash || 'PENDING-DIGITAL-SIGNATURE'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Signed At: {summary?.signedAt ? new Date(summary.signedAt).toLocaleString() : 'Awaiting Physician Signature'}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-serif italic font-bold text-base text-slate-800 dark:text-slate-100 underline decoration-blue-600">
                      {formData.doctorSignature || 'Attending Physician'}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      Attending Medical Officer Signature
                    </div>
                    {isSigned && (
                      <div className="text-[10px] font-bold text-blue-600 dark:text-sky-400">
                        ✓ Digitally Verified & Authorized
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default DischargeSummaryModal;
