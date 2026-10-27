import React, { useState, useEffect } from 'react';
import {
  X,
  Stethoscope,
  FileText,
  Pill,
  FlaskConical,
  Building2,
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  AlertTriangle,
  HeartPulse,
  Thermometer,
  Activity,
  Search,
  User,
  Clock,
  Check,
  Info,
  ShieldAlert,
  RefreshCw,
  TrendingUp,
  Flame,
  BadgeAlert,
  ShieldCheck,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { appointmentApi, patientApi, pharmacyApi, labApi, nurseApi, recordApi, prescriptionApi, admissionApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';

const COMMON_ICD10 = [
  { code: 'J02.0', name: 'Streptococcal Pharyngitis' },
  { code: 'J00', name: 'Acute Nasopharyngitis (Cold)' },
  { code: 'I10', name: 'Essential (Primary) Hypertension' },
  { code: 'E11.9', name: 'Type 2 Diabetes Mellitus' },
  { code: 'K21.9', name: 'Gastro-esophageal Reflux Disease' },
  { code: 'R05', name: 'Cough' },
  { code: 'R50.9', name: 'Fever, Unspecified' },
  { code: 'J18.9', name: 'Pneumonia, Unspecified' },
  { code: 'N39.0', name: 'Urinary Tract Infection (UTI)' },
  { code: 'M54.5', name: 'Low Back Pain' },
  { code: 'A09', name: 'Infectious Gastroenteritis' },
  { code: 'E78.5', name: 'Hyperlipidemia' },
];

const COMMON_LABS = [
  { name: 'Complete Blood Count (CBC)', code: 'CBC', specimen: 'BLOOD' },
  { name: 'Comprehensive Metabolic Panel (CMP)', code: 'CMP', specimen: 'BLOOD' },
  { name: 'Lipid Profile Panel', code: 'LIPID', specimen: 'BLOOD' },
  { name: 'Fasting Blood Glucose (FBS)', code: 'FBS', specimen: 'BLOOD' },
  { name: 'Routine Urinalysis', code: 'UA', specimen: 'URINE' },
  { name: 'Throat Swab Culture & Sensitivity', code: 'CULT_THROAT', specimen: 'SWAB' },
  { name: 'Liver Function Tests (LFT)', code: 'LFT', specimen: 'BLOOD' },
  { name: 'Renal Function Tests (RFT / BUN-Creatinine)', code: 'RFT', specimen: 'BLOOD' },
  { name: 'Thyroid Stimulating Hormone (TSH)', code: 'TSH', specimen: 'BLOOD' },
  { name: 'Glycated Hemoglobin (HbA1c)', code: 'HBA1C', specimen: 'BLOOD' },
];

const FREQUENCIES = [
  'OD (Once Daily)',
  'BD (Twice Daily)',
  'TDS (Three Times Daily)',
  'QID (Four Times Daily)',
  'PRN (As Needed)',
  'Q8H (Every 8 Hours)',
  'Q12H (Every 12 Hours)',
  'STAT (Immediately)',
];

const ROUTES = ['Oral', 'Intravenous (IV)', 'Intramuscular (IM)', 'Subcutaneous', 'Topical', 'Inhalation', 'Ophthalmic', 'Sublingual'];

const DURATIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days', '60 days'];

// Clinically evaluate abnormal vitals
export const getVitalAlertDetails = (v) => {
  if (!v) return [];
  const alerts = [];
  const sys = v.systolic || (v.bloodPressure && v.bloodPressure.includes('/') ? parseInt(v.bloodPressure.split('/')[0]) : null);
  const dia = v.diastolic || (v.bloodPressure && v.bloodPressure.includes('/') ? parseInt(v.bloodPressure.split('/')[1]) : null);

  if (sys && (sys >= 180 || (dia && dia >= 120))) {
    alerts.push({ level: 'critical', message: `Hypertensive Crisis (${sys}/${dia} mmHg)` });
  } else if (sys && (sys >= 140 || (dia && dia >= 90))) {
    alerts.push({ level: 'warning', message: `Hypertension (${sys}/${dia} mmHg)` });
  } else if (sys && sys <= 90) {
    alerts.push({ level: 'warning', message: `Hypotension (${sys}/${dia || ''} mmHg)` });
  }

  if (v.pulse != null) {
    if (v.pulse >= 120) alerts.push({ level: 'critical', message: `Severe Tachycardia (${v.pulse} bpm)` });
    else if (v.pulse > 100) alerts.push({ level: 'warning', message: `Tachycardia (${v.pulse} bpm)` });
    else if (v.pulse < 60) alerts.push({ level: 'warning', message: `Bradycardia (${v.pulse} bpm)` });
  }

  if (v.temperature != null) {
    if (v.temperature >= 102.0) alerts.push({ level: 'critical', message: `High Fever (${v.temperature}°F)` });
    else if (v.temperature >= 100.4) alerts.push({ level: 'warning', message: `Fever / Pyrexia (${v.temperature}°F)` });
    else if (v.temperature < 95.0) alerts.push({ level: 'critical', message: `Hypothermia (${v.temperature}°F)` });
  }

  if (v.oxygenSaturation != null) {
    if (v.oxygenSaturation < 92.0) alerts.push({ level: 'critical', message: `Severe Hypoxemia (${v.oxygenSaturation}%)` });
    else if (v.oxygenSaturation < 95.0) alerts.push({ level: 'warning', message: `Borderline SpO2 (${v.oxygenSaturation}%)` });
  }

  if (v.respiratoryRate != null) {
    if (v.respiratoryRate >= 28) alerts.push({ level: 'critical', message: `Severe Tachypnea (${v.respiratoryRate}/min)` });
    else if (v.respiratoryRate > 20) alerts.push({ level: 'warning', message: `Tachypnea (${v.respiratoryRate}/min)` });
    else if (v.respiratoryRate < 12) alerts.push({ level: 'warning', message: `Bradypnea (${v.respiratoryRate}/min)` });
  }

  return alerts;
};

export const ConsultationModal = ({ isOpen, onClose, appointment, onSuccess }) => {
  const { user } = useAuth();
  const isDoctor = user?.role === 'ROLE_DOCTOR' || user?.role === 'DOCTOR';
  const [activeTab, setActiveTab] = useState('soap'); // 'chart', 'soap', 'prescriptions', 'labs', 'disposition'
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [pharmacyMeds, setPharmacyMeds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const isInpatient = appointment?.type === 'INPATIENT' || patientData?.status === 'INPATIENT';

  // Form State
  // 1. SOAP Notes
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [vitals, setVitals] = useState({ bp: '', hr: '', temp: '', rr: '', spo2: '' });

  const currentExamAlerts = getVitalAlertDetails({
    bloodPressure: vitals.bp,
    pulse: vitals.hr ? Number(vitals.hr) : null,
    temperature: vitals.temp ? Number(vitals.temp) : null,
    oxygenSaturation: vitals.spo2 ? Number(vitals.spo2) : null,
    respiratoryRate: vitals.rr ? Number(vitals.rr) : null,
  });
  const [nurseVitals, setNurseVitals] = useState([]);
  const [latestNurseVital, setLatestNurseVital] = useState(null);
  const [showVitalsHistory, setShowVitalsHistory] = useState(false);
  const [loadingVitals, setLoadingVitals] = useState(false);
  const [vitalsSource, setVitalsSource] = useState('none'); // 'none', 'nurse', 'edited'
  const [clinicalObservations, setClinicalObservations] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [icdCode, setIcdCode] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // 2. Prescriptions
  const [prescriptions, setPrescriptions] = useState([]);
  const [currentMed, setCurrentMed] = useState({
    medicationName: '',
    dosage: '500mg',
    frequency: 'BD (Twice Daily)',
    duration: '5 days',
    route: 'Oral',
  });
  const [medSearchQuery, setMedSearchQuery] = useState('');

  // 3. Lab Orders
  const [labOrders, setLabOrders] = useState([]);
  const [customLab, setCustomLab] = useState({
    testName: '',
    testCode: '',
    specimenType: 'BLOOD',
  });

  // 4. Disposition
  const [followUpType, setFollowUpType] = useState('none'); // 'none', '3days', '1week', '2weeks', 'custom'
  const [followUpDate, setFollowUpDate] = useState('');
  const [needsAdmission, setNeedsAdmission] = useState(false);
  const [admissionOrder, setAdmissionOrder] = useState({
    recommendedWardType: 'GENERAL',
    priority: 'MEDIUM',
    notes: '',
  });

  // Pre-load data when appointment opens
  useEffect(() => {
    if (isOpen && appointment) {
      setErrorMessage('');
      setSuccessMessage('');
      setActiveTab('soap');

      // Pre-fill initial complaint from appointment notes if any
      setChiefComplaint(appointment.notes || '');
      setDiagnosis('');
      setIcdCode('');
      setTreatmentPlan('');
      setClinicalNotes('');
      setClinicalObservations('');
      setVitals({ bp: '', hr: '', temp: '', rr: '', spo2: '' });
      setNurseVitals([]);
      setLatestNurseVital(null);
      setShowVitalsHistory(false);
      setVitalsSource('none');
      setPrescriptions([]);
      setLabOrders([]);
      setFollowUpType('none');
      setFollowUpDate('');
      setNeedsAdmission(false);
      setAdmissionOrder({ recommendedWardType: 'GENERAL', priority: 'MEDIUM', notes: '' });

      loadPatientContext();
      loadPharmacyCatalog();
    }
  }, [isOpen, appointment]);

  const loadPatientContext = async () => {
    if (!appointment?.patientId) return;
    setLoading(true);
    setLoadingVitals(true);
    try {
      const [patRes, histRes, vitalsRes] = await Promise.allSettled([
        patientApi.getById(appointment.patientId),
        patientApi.getHistory(appointment.patientId),
        nurseApi.getPatientVitals(appointment.patientId),
      ]);
      if (patRes.status === 'fulfilled') setPatientData(patRes.value.data);
      if (histRes.status === 'fulfilled') setPatientHistory(histRes.value.data);
      const patientIsAdmitted = (patRes.status === 'fulfilled' && patRes.value.data?.status === 'INPATIENT') || appointment?.type === 'INPATIENT';

      if (vitalsRes.status === 'fulfilled' && Array.isArray(vitalsRes.value.data)) {
        const vitalsList = vitalsRes.value.data;
        setNurseVitals(vitalsList);
        if (patientIsAdmitted && vitalsList.length > 0) {
          const latest = vitalsList[0];
          setLatestNurseVital(latest);
          const bpVal = latest.bloodPressure || (latest.systolic ? `${latest.systolic}/${latest.diastolic}` : '');
          setVitals({
            bp: bpVal || '',
            hr: latest.pulse != null ? String(latest.pulse) : '',
            temp: latest.temperature != null ? String(latest.temperature) : '',
            rr: latest.respiratoryRate != null ? String(latest.respiratoryRate) : '',
            spo2: latest.oxygenSaturation != null ? String(latest.oxygenSaturation) : '',
          });
          setVitalsSource('nurse');
        } else {
          // Outpatient: Doctor directly checks and records vitals during consultation
          setLatestNurseVital(null);
          setVitalsSource('doctor');
        }
      } else {
        setVitalsSource(patientIsAdmitted ? 'none' : 'doctor');
      }
    } catch (err) {
      console.error('Failed to load patient consultation context:', err);
    } finally {
      setLoading(false);
      setLoadingVitals(false);
    }
  };

  const handleReapplyNurseVitals = () => {
    if (!latestNurseVital) return;
    const bpVal = latestNurseVital.bloodPressure || (latestNurseVital.systolic ? `${latestNurseVital.systolic}/${latestNurseVital.diastolic}` : '');
    setVitals({
      bp: bpVal || '',
      hr: latestNurseVital.pulse != null ? String(latestNurseVital.pulse) : '',
      temp: latestNurseVital.temperature != null ? String(latestNurseVital.temperature) : '',
      rr: latestNurseVital.respiratoryRate != null ? String(latestNurseVital.respiratoryRate) : '',
      spo2: latestNurseVital.oxygenSaturation != null ? String(latestNurseVital.oxygenSaturation) : '',
    });
    setVitalsSource('nurse');
  };

  const loadPharmacyCatalog = async () => {
    try {
      const res = await pharmacyApi.getAll();
      setPharmacyMeds(res.data || []);
    } catch (err) {
      console.error('Failed to load pharmacy catalog:', err);
    }
  };

  // Follow-up date calculations
  const handleFollowUpSelect = (type) => {
    setFollowUpType(type);
    const today = new Date();
    if (type === 'none') {
      setFollowUpDate('');
    } else if (type === '3days') {
      today.setDate(today.getDate() + 3);
      setFollowUpDate(today.toISOString().split('T')[0]);
    } else if (type === '1week') {
      today.setDate(today.getDate() + 7);
      setFollowUpDate(today.toISOString().split('T')[0]);
    } else if (type === '2weeks') {
      today.setDate(today.getDate() + 14);
      setFollowUpDate(today.toISOString().split('T')[0]);
    } else if (type === '1month') {
      today.setMonth(today.getMonth() + 1);
      setFollowUpDate(today.toISOString().split('T')[0]);
    }
  };

  // Prescriptions Management
  const addPrescription = () => {
    if (!currentMed.medicationName.trim()) {
      alert('Please enter or select a medication name.');
      return;
    }
    setPrescriptions([...prescriptions, { ...currentMed }]);
    setCurrentMed({
      medicationName: '',
      dosage: '500mg',
      frequency: 'BD (Twice Daily)',
      duration: '5 days',
      route: 'Oral',
    });
    setMedSearchQuery('');
  };

  const removePrescription = (index) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  // Lab Orders Management
  const addCommonLab = (lab) => {
    if (labOrders.some((l) => l.testName === lab.name)) return;
    setLabOrders([
      ...labOrders,
      {
        testName: lab.name,
        testCode: lab.code,
        specimenType: lab.specimen,
      },
    ]);
  };

  const addCustomLab = () => {
    if (!customLab.testName.trim()) {
      alert('Please enter a test name.');
      return;
    }
    setLabOrders([
      ...labOrders,
      {
        testName: customLab.testName.trim(),
        testCode: customLab.testCode.trim() || customLab.testName.trim().toUpperCase().replace(/\s+/g, '_'),
        specimenType: customLab.specimenType,
      },
    ]);
    setCustomLab({ testName: '', testCode: '', specimenType: 'BLOOD' });
  };

  const removeLabOrder = (index) => {
    setLabOrders(labOrders.filter((_, i) => i !== index));
  };

  // Step-by-step navigation across the 5 consultation stages
  const handleNextStep = () => {
    setErrorMessage('');
    if (activeTab === 'soap') {
      if (!chiefComplaint.trim()) {
        setErrorMessage('Please enter Chief Complaint / Symptoms before proceeding to Medical Chart History.');
        return;
      }
      if (!diagnosis.trim()) {
        setErrorMessage('Clinical Diagnosis is required before proceeding to Medical Chart History.');
        return;
      }
      setActiveTab('chart');
    } else if (activeTab === 'chart') {
      setActiveTab('prescriptions');
    } else if (activeTab === 'prescriptions') {
      setActiveTab('labs');
    } else if (activeTab === 'labs') {
      setActiveTab('disposition');
    }
  };

  const handlePreviousStep = () => {
    setErrorMessage('');
    if (activeTab === 'chart') {
      setActiveTab('soap');
    } else if (activeTab === 'prescriptions') {
      setActiveTab('chart');
    } else if (activeTab === 'labs') {
      setActiveTab('prescriptions');
    } else if (activeTab === 'disposition') {
      setActiveTab('labs');
    }
  };

  // Finalize consultation submission
  const handleFinalizeConsultation = async () => {
    if (!isDoctor) {
      setErrorMessage('Access denied: Consultations must only be conducted by attending doctors.');
      return;
    }
    if (!chiefComplaint.trim()) {
      setActiveTab('soap');
      setErrorMessage('Chief Complaint / Symptoms is required to complete consultation.');
      return;
    }
    if (!diagnosis.trim()) {
      setActiveTab('soap');
      setErrorMessage('Clinical Diagnosis is required to complete consultation.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Compile observations including vitals
    let combinedObservations = clinicalObservations.trim();
    const vitalsParts = [];
    if (vitals.bp) vitalsParts.push(`BP: ${vitals.bp}`);
    if (vitals.hr) vitalsParts.push(`HR: ${vitals.hr} bpm`);
    if (vitals.temp) vitalsParts.push(`Temp: ${vitals.temp} °F`);
    if (vitals.rr) vitalsParts.push(`RR: ${vitals.rr}/min`);
    if (vitals.spo2) vitalsParts.push(`SpO2: ${vitals.spo2}%`);

    if (vitalsParts.length > 0) {
      const vitalsStr = `[Vitals: ${vitalsParts.join(', ')}]`;
      combinedObservations = combinedObservations ? `${vitalsStr}\n${combinedObservations}` : vitalsStr;
    }

    const payload = {
      chiefComplaint: chiefComplaint.trim(),
      clinicalObservations: combinedObservations,
      diagnosis: diagnosis.trim(),
      icdCode: icdCode.trim() || null,
      treatmentPlan: treatmentPlan.trim() || null,
      clinicalNotes: clinicalNotes.trim() || null,
      followUpDate: followUpDate || null,
      prescriptions: prescriptions.map((p) => ({
        medicationName: p.medicationName.trim(),
        dosage: p.dosage.trim(),
        frequency: p.frequency.trim(),
        duration: p.duration.trim(),
        route: p.route.trim(),
      })),
      labOrders: labOrders.map((l) => ({
        testName: l.testName.trim(),
        testCode: l.testCode.trim(),
        specimenType: l.specimenType,
      })),
      admissionOrder: needsAdmission
        ? {
            recommendedWardType: admissionOrder.recommendedWardType,
            priority: admissionOrder.priority,
            notes: admissionOrder.notes ? admissionOrder.notes.trim() : `Admission authorized for ${diagnosis.trim()}`,
          }
        : null,
      vitals: (vitals.bp || vitals.hr || vitals.temp || vitals.rr || vitals.spo2) ? {
        bloodPressure: vitals.bp || null,
        pulse: vitals.hr ? Number(vitals.hr) : null,
        temperature: vitals.temp ? Number(vitals.temp) : null,
        respiratoryRate: vitals.rr ? Number(vitals.rr) : null,
        oxygenSaturation: vitals.spo2 ? Number(vitals.spo2) : null,
      } : null,
    };

    try {
      let consultationResult = null;
      if (appointment.id && appointment.id !== 'null' && appointment.id !== 'undefined') {
        const res = await appointmentApi.completeConsultation(appointment.id, payload);
        consultationResult = res.data;
      } else {
        // Direct Clinical Encounter (Inpatient ward review, vital alert consult, walk-in)
        const doctorId = user?.id || null;
        const recRes = await recordApi.create({
          patientId: appointment.patientId,
          doctorId: doctorId,
          visitDate: new Date().toISOString().split('T')[0],
          chiefComplaint: payload.chiefComplaint,
          diagnosis: payload.diagnosis,
          icdCode: payload.icdCode,
          treatment: payload.treatmentPlan,
          notes: payload.clinicalObservations
            ? `Clinical Observations: ${payload.clinicalObservations}\n\n${payload.clinicalNotes || ''}`
            : payload.clinicalNotes,
          followUpDate: payload.followUpDate || null,
        });
        const createdRecord = recRes.data;

        // Prescriptions queued for pharmacy
        if (payload.prescriptions && payload.prescriptions.length > 0) {
          for (const item of payload.prescriptions) {
            if (item.medicationName) {
              await prescriptionApi.create({
                patientId: appointment.patientId,
                doctorId: doctorId,
                medicalRecordId: createdRecord?.id || null,
                medicationName: item.medicationName,
                dosage: item.dosage,
                frequency: item.frequency,
                duration: item.duration,
                route: item.route,
              });
            }
          }
        }

        // Lab orders
        if (payload.labOrders && payload.labOrders.length > 0) {
          for (const item of payload.labOrders) {
            if (item.testName) {
              await labApi.createOrder({
                patientId: appointment.patientId,
                doctorId: doctorId,
                testName: item.testName,
                testCode: item.testCode,
                specimenType: item.specimenType,
              });
            }
          }
        }

        // Admission order if needed
        if (payload.admissionOrder) {
          await admissionApi.createOrder({
            patientId: appointment.patientId,
            diagnosis: payload.diagnosis,
            recommendedWardType: payload.admissionOrder.recommendedWardType,
            priority: payload.admissionOrder.priority,
            notes: payload.admissionOrder.notes,
          });
        }

        consultationResult = createdRecord;
      }

      setSuccessMessage('Consultation finalized! Medical record created, orders filed, and patient chart updated.');
      window.dispatchEvent(new Event('notification-updated'));
      setTimeout(() => {
        if (onSuccess) onSuccess(consultationResult);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to complete consultation:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to complete consultation. Please verify all details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !appointment || !isDoctor) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* ========================================================= */}
        {/* HEADER: PATIENT BANNER */}
        {/* ========================================================= */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-600/30">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white font-bold text-xl flex-shrink-0">
              <Stethoscope className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold font-display tracking-tight text-white">
                  {appointment.patientName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/30">
                  {appointment.patientNumber}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-sky-100/80 mt-1 flex-wrap">
                <span>Age: <strong>{patientData?.age ? `${patientData.age} yrs` : '—'}</strong></span>
                <span>&bull;</span>
                <span>Gender: <strong>{patientData?.gender || '—'}</strong></span>
                <span>&bull;</span>
                <span>Blood: <strong className="text-rose-300">{patientData?.bloodGroup || '—'}</strong></span>
                <span>&bull;</span>
                <span>Slot: <strong>{appointment.timeSlot}</strong></span>
                {patientData?.emergencyContactPhone && (
                  <>
                    <span>&bull;</span>
                    <span>Emergency: <strong>{patientData.emergencyContactPhone}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-2 rounded-xl text-sky-200 hover:text-white hover:bg-white/10 transition"
              title="Close consultation modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CLINICAL NAVIGATION TABS */}
        {/* ========================================================= */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 overflow-x-auto text-xs font-semibold py-2">
          <button
            onClick={() => setActiveTab('soap')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'soap'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            1. SOAP & Diagnosis <span className="text-[10px] opacity-80">(Required)</span>
          </button>

          <button
            onClick={() => setActiveTab('chart')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'chart'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            2. Medical Chart History
          </button>

          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'prescriptions'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Pill className="w-4 h-4" />
            3. E-Prescriptions
            {prescriptions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/30 text-white text-[10px]">
                {prescriptions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('labs')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'labs'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            4. Lab Test Orders
            {labOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/30 text-white text-[10px]">
                {labOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('disposition')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'disposition'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            5. Follow-up & Admission
            {(followUpDate || needsAdmission) && (
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* MESSAGES & ALERTS */}
        {/* ========================================================= */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-2 text-rose-800 dark:text-rose-200 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-2xl flex items-center gap-2 text-blue-800 dark:text-blue-200 text-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-blue-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB BODY (SCROLLABLE WORKSPACE) */}
        {/* ========================================================= */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ------------------------------------------------------- */}
          {/* TAB 1: SOAP & CLINICAL DOCUMENTATION */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'soap' && (
            <div className="space-y-6">
              
              {/* Outpatient Vitals Section - Doctor directly checks vitals during outpatient consultation (Removed for inpatients as duty nurses handle inpatient bedside vitals) */}
              {!isInpatient && (
                <div className="bg-gradient-to-br from-sky-50/70 via-slate-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 p-5 rounded-3xl border border-sky-200/80 dark:border-blue-900/60 shadow-xs space-y-4">
                  
                  {/* Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-sky-100 dark:border-blue-900/40">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            Objective (O) • Patient Vital Signs (Doctor Examination)
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300 border border-sky-300">
                            Doctor Exam
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Attending physician directly examines and records patient vital signs during outpatient consultation.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {nurseVitals.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowVitalsHistory(!showVitalsHistory)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                            showVitalsHistory
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {showVitalsHistory ? 'Hide History' : `Prior Vitals (${nurseVitals.length})`}
                        </button>
                      )}
                    </div>
                  </div>


                  {/* Inline Vitals History Drawer */}
                  {showVitalsHistory && nurseVitals.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          Patient Vital Signs History ({nurseVitals.length} recorded)
                        </h4>
                        <span className="text-[11px] text-slate-400">Click &ldquo;Use&rdquo; to populate into consultation</span>
                      </div>

                      <div className="overflow-x-auto max-h-56">
                        <table className="w-full text-[11px] text-left">
                          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="py-2 px-3">Date & Time</th>
                              <th className="py-2 px-3">Recorded By</th>
                              <th className="py-2 px-3">BP</th>
                              <th className="py-2 px-3">Pulse</th>
                              <th className="py-2 px-3">Temp</th>
                              <th className="py-2 px-3">SpO2</th>
                              <th className="py-2 px-3">Resp</th>
                              <th className="py-2 px-3">Alert</th>
                              <th className="py-2 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {nurseVitals.map((item) => {
                              const bp = item.bloodPressure || (item.systolic ? `${item.systolic}/${item.diastolic}` : '—');
                              return (
                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                  <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                    {new Date(item.recordedAt).toLocaleString()}
                                  </td>
                                  <td className="py-2 px-3 text-slate-700 dark:text-slate-200">
                                    {item.recordedByName || 'Staff Nurse'}
                                  </td>
                                  <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-100">{bp}</td>
                                  <td className="py-2 px-3">{item.pulse ? `${item.pulse} bpm` : '—'}</td>
                                  <td className="py-2 px-3">{item.temperature ? `${item.temperature} °F` : '—'}</td>
                                  <td className="py-2 px-3">{item.oxygenSaturation ? `${item.oxygenSaturation}%` : '—'}</td>
                                  <td className="py-2 px-3">{item.respiratoryRate ? `${item.respiratoryRate}/min` : '—'}</td>
                                  <td className="py-2 px-3">
                                    {item.isAlert ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                        {item.alertSeverity || 'ALERT'}
                                      </span>
                                    ) : (
                                      <span className="text-blue-600 text-[10px]">Normal</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setVitals({
                                          bp: bp === '—' ? '' : bp,
                                          hr: item.pulse != null ? String(item.pulse) : '',
                                          temp: item.temperature != null ? String(item.temperature) : '',
                                          rr: item.respiratoryRate != null ? String(item.respiratoryRate) : '',
                                          spo2: item.oxygenSaturation != null ? String(item.oxygenSaturation) : '',
                                        });
                                        setVitalsSource('edited');
                                      }}
                                      className="px-2 py-0.5 rounded bg-sky-50 dark:bg-blue-950 hover:bg-sky-100 dark:hover:bg-blue-900 text-blue-700 dark:text-sky-300 text-[10px] font-semibold border border-sky-200 dark:border-blue-800"
                                    >
                                      Use
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Doctor Examined Vitals Inputs */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                        Doctor Examined Vital Signs
                        <span className="text-[10px] font-normal text-slate-400 lowercase">
                          (enter measured vitals directly)
                        </span>
                      </label>
                      {currentExamAlerts.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {currentExamAlerts.map((alt, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              alt.level === 'critical' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                            }`}>
                              {alt.message}
                            </span>
                          ))}
                        </div>
                      ) : (
                        (vitals.bp || vitals.hr || vitals.temp || vitals.spo2) && (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-sky-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Normal Parameters
                          </span>
                        )
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Blood Pressure</label>
                        <input
                          type="text"
                          placeholder="e.g. 120/80"
                          value={vitals.bp}
                          onChange={(e) => {
                            setVitals({ ...vitals, bp: e.target.value });
                            setVitalsSource('edited');
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Heart Rate (bpm)</label>
                        <input
                          type="text"
                          placeholder="e.g. 76"
                          value={vitals.hr}
                          onChange={(e) => {
                            setVitals({ ...vitals, hr: e.target.value });
                            setVitalsSource('edited');
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Temperature (°F)</label>
                        <input
                          type="text"
                          placeholder="e.g. 98.6"
                          value={vitals.temp}
                          onChange={(e) => {
                            setVitals({ ...vitals, temp: e.target.value });
                            setVitalsSource('edited');
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Resp. Rate (/min)</label>
                        <input
                          type="text"
                          placeholder="e.g. 16"
                          value={vitals.rr}
                          onChange={(e) => {
                            setVitals({ ...vitals, rr: e.target.value });
                            setVitalsSource('edited');
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">SpO2 (%)</label>
                        <input
                          type="text"
                          placeholder="e.g. 99"
                          value={vitals.spo2}
                          onChange={(e) => {
                            setVitals({ ...vitals, spo2: e.target.value });
                            setVitalsSource('edited');
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Subjective (S): Chief Complaint */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-sky-100 dark:bg-blue-900 text-blue-800 dark:text-sky-200 font-bold text-[11px] flex items-center justify-center">S</span>
                    Subjective: Chief Complaint & Patient Symptoms <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">Patient reported issues & onset duration</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Record symptoms, pain score, onset, triggers and patient complaints (e.g. Acute sore throat, dysphagia and high grade fever since 2 days)..."
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Objective (O): Clinical Examination & Findings */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200 font-bold text-[11px] flex items-center justify-center">O</span>
                    Objective: Physical Examination & Clinical Findings
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">Doctor examination & physical findings</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Physical findings, systemic examination (CVS, RS, PA, CNS), HEENT findings, lymphadenopathy..."
                  value={clinicalObservations}
                  onChange={(e) => setClinicalObservations(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Assessment (A): Diagnosis & ICD-10 Code */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold text-[11px] flex items-center justify-center">A</span>
                    Assessment: Clinical Diagnosis & ICD-10 Coding <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Structured coding standard</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="Primary diagnosis (e.g. Acute Streptococcal Pharyngitis, Type 2 Diabetes)..."
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500 font-semibold"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="ICD-10 Code (e.g. J02.0)"
                      value={icdCode}
                      onChange={(e) => setIcdCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Quick ICD-10 Chips */}
                <div>
                  <p className="text-[11px] text-slate-400 mb-1.5">Common ICD-10 Quick Select:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_ICD10.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setDiagnosis(c.name);
                          setIcdCode(c.code);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                          icdCode === c.code
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-500'
                        }`}
                      >
                        <span className="font-mono font-bold opacity-80">{c.code}</span> - {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Plan (P): Treatment Plan & Clinical Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold text-[11px] flex items-center justify-center">P</span>
                    Treatment Plan & Regimen
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe management plan, lifestyle instructions, dietary changes, patient education..."
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Clinical Notes & Warning Signs
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Instructions given to patient: return immediately if fever > 103F, worsening dyspnea, rash..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 2: PATIENT MEDICAL CHART & HISTORY */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'chart' && (
            <div className="space-y-6">
              {loading ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Loading patient history records...
                </div>
              ) : (
                <>
                  {/* Patient Profile Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Contact Number:</span>
                      <strong className="text-slate-800 dark:text-slate-100">{patientData?.phoneNumber || patientData?.phone || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Emergency Contact:</span>
                      <strong className="text-slate-800 dark:text-slate-100">
                        {patientData?.emergencyContact || (patientData?.emergencyContactName ? `${patientData.emergencyContactName} (${patientData.emergencyContactPhone || 'N/A'})` : 'None Listed')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Known Allergies:</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-semibold">
                        {patientData?.allergies || 'None reported'}
                      </strong>
                    </div>
                  </div>

                  {/* Nurse Vitals & Care Observations Log - Inpatients Only */}
                  {isInpatient && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                          Nurse Vitals & Care Observations Log ({nurseVitals.length})
                        </h4>
                        {nurseVitals.length > 0 && (
                          <span className="text-[11px] text-blue-600 dark:text-sky-400 font-semibold">
                            Latest: {new Date(nurseVitals[0].recordedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {nurseVitals.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 text-center text-xs text-slate-400">
                          No vital signs recordings found in clinical history for this patient.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {nurseVitals.map((v) => {
                            const bp = v.bloodPressure || (v.systolic ? `${v.systolic}/${v.diastolic}` : '—');
                            const flags = getVitalAlertDetails(v);
                            return (
                              <div
                                key={v.id}
                                className={`p-4 rounded-2xl border text-xs space-y-2 transition ${
                                  v.isAlert || flags.length > 0
                                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 shadow-2xs'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-700/50 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-100">
                                      Recorded by {v.recordedByName || 'Staff Nurse'}
                                    </span>
                                    {v.wardName && v.wardName !== 'N/A' && (
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                                        {v.wardName} - Bed {v.bedNumber}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {flags.length > 0 && (
                                      <div className="flex gap-1">
                                        {flags.map((f, fi) => (
                                          <span key={fi} className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white">
                                            {f.message}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <span className="text-slate-400 font-mono text-[11px]">
                                      {new Date(v.recordedAt).toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-[11px]">
                                  <div><span className="text-slate-400">BP:</span> <strong>{bp}</strong> mmHg</div>
                                  <div><span className="text-slate-400">Pulse:</span> <strong>{v.pulse || '—'}</strong> bpm</div>
                                  <div><span className="text-slate-400">Temp:</span> <strong>{v.temperature ? `${v.temperature}°F` : '—'}</strong></div>
                                  <div><span className="text-slate-400">SpO2:</span> <strong>{v.oxygenSaturation ? `${v.oxygenSaturation}%` : '—'}</strong></div>
                                  <div><span className="text-slate-400">Resp:</span> <strong>{v.respiratoryRate ? `${v.respiratoryRate}/min` : '—'}</strong></div>
                                </div>

                                {v.notes && (
                                  <p className="text-slate-600 dark:text-slate-300 text-[11px] italic bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg">
                                    Observation: &ldquo;{v.notes}&rdquo;
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Past Visits Timeline */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      Previous Consultations & Medical Records ({patientHistory?.medicalRecords?.length || 0})
                    </h4>

                    {(!patientHistory?.medicalRecords || patientHistory.medicalRecords.length === 0) ? (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 text-center text-xs text-slate-400">
                        No previous medical records found for this patient.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {patientHistory.medicalRecords.map((rec) => (
                          <div
                            key={rec.id}
                            className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-xs text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-blue-700 dark:text-sky-300 text-sm">
                                {rec.diagnosis} {rec.icdCode ? `(${rec.icdCode})` : ''}
                              </span>
                              <span className="text-slate-400 font-mono text-[11px]">
                                Visit Date: {rec.visitDate}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300">
                              <strong>Complaint:</strong> {rec.chiefComplaint}
                            </p>
                            {rec.treatment && (
                              <p className="text-slate-600 dark:text-slate-300">
                                <strong>Treatment:</strong> {rec.treatment}
                              </p>
                            )}
                            {rec.notes && (
                              <p className="text-slate-500 dark:text-slate-400 text-[11px] italic">
                                Notes: {rec.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Past Lab Results */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
                      Laboratory History & Critical Results ({patientHistory?.labOrders?.length || 0})
                    </h4>

                    {(!patientHistory?.labOrders || patientHistory.labOrders.length === 0) ? (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 text-center text-xs text-slate-400">
                        No prior laboratory records found for this patient.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {patientHistory.labOrders.map((lab) => {
                          const isReviewed = lab.status === 'REVIEWED' || !!lab.reviewedDate;
                          return (
                            <div
                              key={lab.id}
                              className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition ${
                                lab.result?.flag === 'CRITICAL'
                                  ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
                                  : isReviewed
                                  ? 'bg-sky-50/50 dark:bg-blue-950/20 border-sky-200 dark:border-blue-800/60 text-slate-700 dark:text-slate-300'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                <div>
                                  <div className="font-bold flex items-center gap-2">
                                    <span className="text-slate-900 dark:text-white">{lab.testName}</span>
                                    <span className="font-mono text-[10px] text-slate-400">({lab.testCode})</span>
                                    {lab.result?.flag === 'CRITICAL' && (
                                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[9px] animate-pulse">
                                        CRITICAL
                                      </span>
                                    )}
                                    {isReviewed && (
                                      <span className="px-2 py-0.5 rounded-full bg-sky-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300 font-semibold text-[9px] flex items-center gap-1 border border-sky-300 dark:border-blue-800">
                                        <ShieldCheck className="w-3 h-3 text-blue-600" />
                                        Doctor Signed
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Specimen: <strong className="text-slate-700 dark:text-slate-300">{lab.specimenType}</strong> &bull; Ordered: {lab.orderedDate ? new Date(lab.orderedDate).toLocaleDateString() : 'N/A'}
                                  </div>
                                </div>
                                <div className="sm:text-right">
                                  {lab.result ? (
                                    <div>
                                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{lab.result.resultValue} {lab.result.unit}</span>
                                      <div className="text-[10px] text-slate-400">Ref: {lab.result.referenceRange}</div>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                      Status: {lab.status}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Physician Clinical Review Section */}
                              {isReviewed && (
                                <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-blue-950/40 border border-sky-200/80 dark:border-blue-900/60 text-[11px] space-y-1">
                                  <div className="flex items-center justify-between text-blue-900 dark:text-sky-200 font-semibold">
                                    <span className="flex items-center gap-1">
                                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                      Physician Sign-Off: Dr. {lab.reviewedByDoctorName || lab.doctorName || 'Attending Physician'}
                                    </span>
                                    {lab.reviewedDate && (
                                      <span className="text-[10px] text-blue-700 dark:text-sky-400 font-mono">
                                        {new Date(lab.reviewedDate).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  {lab.doctorReviewNotes && (
                                    <p className="text-slate-700 dark:text-slate-300 italic text-[10px] bg-white/60 dark:bg-slate-900/40 p-1.5 rounded border border-sky-100 dark:border-blue-900/40">
                                      "{lab.doctorReviewNotes}"
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 3: E-PRESCRIPTIONS */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-6">
              

              {/* Medicine Builder Form */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  Prescribe New Medication
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Medicine Name with Auto-Suggest */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Medication Name & Strength <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search hospital formulary or type medicine name (e.g. Amoxicillin 500mg)..."
                        value={currentMed.medicationName}
                        onChange={(e) => setCurrentMed({ ...currentMed, medicationName: e.target.value })}
                        className="w-full px-3 py-2 pl-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500 font-semibold"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>

                    {/* Quick formulary suggestions */}
                    {pharmacyMeds.length > 0 && !currentMed.medicationName && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-slate-400 self-center">Formulary quick picks:</span>
                        {pharmacyMeds.slice(0, 6).map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setCurrentMed({ ...currentMed, medicationName: `${m.name} ${m.strength || ''}`.trim() })}
                            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-700 dark:text-slate-300 hover:border-sky-500"
                          >
                            + {m.name} {m.strength || ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dosage</label>
                    <input
                      type="text"
                      placeholder="e.g. 500mg, 1 tablet"
                      value={currentMed.dosage}
                      onChange={(e) => setCurrentMed({ ...currentMed, dosage: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Frequency</label>
                    <select
                      value={currentMed.frequency}
                      onChange={(e) => setCurrentMed({ ...currentMed, frequency: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Duration</label>
                    <div className="flex gap-1.5">
                      <select
                        value={currentMed.duration}
                        onChange={(e) => setCurrentMed({ ...currentMed, duration: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
                      >
                        {DURATIONS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Route</label>
                    <select
                      value={currentMed.route}
                      onChange={(e) => setCurrentMed({ ...currentMed, route: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
                    >
                      {ROUTES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={addPrescription}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs shadow-xs"
                    >
                      <Plus className="w-4 h-4" /> Add Medication to Rx List
                    </button>
                  </div>
                </div>
              </div>

              {/* Prescribed Items Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Prescription Summary ({prescriptions.length} items)
                </h4>

                {prescriptions.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 text-xs">
                    No medications added yet. Add required medications above or proceed if only dietary / lifestyle management is advised.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Medication</th>
                          <th className="py-2.5 px-3">Dosage</th>
                          <th className="py-2.5 px-3">Frequency</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3">Route</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {prescriptions.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                              {p.medicationName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{p.dosage}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{p.frequency}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{p.duration}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{p.route}</td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => removePrescription(idx)}
                                className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Remove medication"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 4: LAB TEST ORDERS */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'labs' && (
            <div className="space-y-6">
              

              {/* Quick Select Common Tests */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Common Hospital Lab Panels (Click to add):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COMMON_LABS.map((lab) => {
                    const isSelected = labOrders.some((l) => l.testName === lab.name);
                    return (
                      <button
                        key={lab.code}
                        type="button"
                        onClick={() => addCommonLab(lab)}
                        disabled={isSelected}
                        className={`p-2.5 rounded-xl text-left border text-xs transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 text-sky-800 dark:text-sky-200 opacity-60 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-sky-500 text-slate-800 dark:text-slate-200 shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{lab.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {lab.code} &bull; {lab.specimen}
                          </div>
                        </div>
                        {isSelected ? <Check className="w-4 h-4 text-sky-600" /> : <Plus className="w-4 h-4 text-slate-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Lab Test Form */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Order Custom or Specialized Diagnostic Test
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Test Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Serum Ferritin, Blood Culture..."
                      value={customLab.testName}
                      onChange={(e) => setCustomLab({ ...customLab, testName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Specimen Type</label>
                    <select
                      value={customLab.specimenType}
                      onChange={(e) => setCustomLab({ ...customLab, specimenType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="BLOOD">BLOOD</option>
                      <option value="URINE">URINE</option>
                      <option value="SERUM">SERUM</option>
                      <option value="SWAB">SWAB</option>
                      <option value="SPUTUM">SPUTUM</option>
                      <option value="STOOL">STOOL</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addCustomLab}
                      className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs shadow-xs"
                    >
                      <Plus className="w-4 h-4" /> Add Lab Order
                    </button>
                  </div>
                </div>
              </div>

              {/* Lab Orders Queue Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Tests to Order ({labOrders.length} tests)
                </h4>

                {labOrders.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 text-xs">
                    No diagnostic tests selected for this visit.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Test Name</th>
                          <th className="py-2.5 px-3">Test Code</th>
                          <th className="py-2.5 px-3">Specimen</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {labOrders.map((lab, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                              {lab.testName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">{lab.testCode}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                                {lab.specimenType}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => removeLabOrder(idx)}
                                className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Remove lab test"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 5: DISPOSITION, FOLLOW-UP & ADMISSION */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'disposition' && (
            <div className="space-y-6">
              
              {/* Follow-up Section */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Schedule Follow-up Visit
                  </h4>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleFollowUpSelect('none')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      followUpType === 'none'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    No Follow-up Needed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFollowUpSelect('3days')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      followUpType === '3days'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFollowUpSelect('1week')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      followUpType === '1week'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    +1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFollowUpSelect('2weeks')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      followUpType === '2weeks'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    +2 Weeks
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFollowUpSelect('1month')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      followUpType === '1month'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    +1 Month
                  </button>
                </div>

                {followUpType !== 'none' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Confirmed Follow-Up Date
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                )}
              </div>

              {/* Inpatient Admission Order Section (SRS Safeguard) */}
              <div className="bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-amber-600" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Inpatient Hospital Admission (Doctor Authorization)
                      </h4>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={needsAdmission}
                      onChange={(e) => setNeedsAdmission(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {needsAdmission && (
                  <div className="pt-2 border-t border-amber-200 dark:border-amber-900/50 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Recommended Ward Type
                        </label>
                        <select
                          value={admissionOrder.recommendedWardType}
                          onChange={(e) => setAdmissionOrder({ ...admissionOrder, recommendedWardType: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="GENERAL">GENERAL</option>
                          <option value="ICU">ICU (Intensive Care Unit)</option>
                          <option value="EMERGENCY">EMERGENCY</option>
                          <option value="PRIVATE">PRIVATE</option>
                          <option value="SEMI_PRIVATE">SEMI_PRIVATE</option>
                          <option value="PEDIATRIC">PEDIATRIC</option>
                          <option value="MATERNITY">MATERNITY</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Clinical Urgency / Priority
                        </label>
                        <select
                          value={admissionOrder.priority}
                          onChange={(e) => setAdmissionOrder({ ...admissionOrder, priority: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-amber-500 font-bold"
                        >
                          <option value="ROUTINE">ROUTINE</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="URGENT">URGENT</option>
                          <option value="EMERGENCY">EMERGENCY</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Admission Instructions & Clinical Rationale
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Reason for hospitalization, oxygen requirements, monitoring orders, IV access..."
                        value={admissionOrder.notes}
                        onChange={(e) => setAdmissionOrder({ ...admissionOrder, notes: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* FOOTER: SEQUENTIAL STEP NAVIGATION & FINAL SUBMISSION */}
        {/* ========================================================= */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-blue-950/70 text-blue-800 dark:text-sky-300 font-bold border border-sky-200 dark:border-blue-800 shadow-2xs">
              {activeTab === 'soap' && 'Step 1 of 5: SOAP & Diagnosis'}
              {activeTab === 'chart' && 'Step 2 of 5: Medical Chart History'}
              {activeTab === 'prescriptions' && 'Step 3 of 5: E-Prescriptions'}
              {activeTab === 'labs' && 'Step 4 of 5: Lab Test Orders'}
              {activeTab === 'disposition' && 'Step 5 of 5: Follow-up & Admission'}
            </span>
            {prescriptions.length > 0 && <span className="font-semibold text-blue-600 dark:text-sky-400">{prescriptions.length} Meds</span>}
            {prescriptions.length > 0 && labOrders.length > 0 && <span>&bull;</span>}
            {labOrders.length > 0 && <span className="font-semibold text-sky-600 dark:text-sky-400">{labOrders.length} Labs</span>}
            {(prescriptions.length > 0 || labOrders.length > 0) && followUpDate && <span>&bull;</span>}
            {followUpDate && <span className="font-semibold text-amber-600 dark:text-amber-400">Follow-up: {followUpDate}</span>}
            {needsAdmission && <span className="ml-1 font-bold text-rose-600 dark:text-rose-400">[Inpatient Admission Order]</span>}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-xs font-semibold transition"
            >
              Cancel
            </button>

            {activeTab !== 'soap' && (
              <button
                type="button"
                onClick={handlePreviousStep}
                disabled={submitting}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}

            {activeTab !== 'disposition' ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={submitting}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition cursor-pointer"
              >
                <span>
                  {activeTab === 'soap' && 'Next: Medical Chart History'}
                  {activeTab === 'chart' && 'Next: E-Prescriptions'}
                  {activeTab === 'prescriptions' && 'Next: Lab Test Orders'}
                  {activeTab === 'labs' && 'Next: Follow-up & Admission'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalizeConsultation}
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <span>Submitting Consultation...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Finalize & Sign Consultation
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ConsultationModal;
