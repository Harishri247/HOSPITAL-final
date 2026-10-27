import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../context/AuthContext';
import { nurseApi } from '../api/apiService';
import {
  HeartPulse,
  Pill,
  FileText,
  BedDouble,
  User,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  PlusCircle,
  FlaskConical,
  Stethoscope,
  Shield,
  Phone,
  Calendar,
  AlertCircle
} from 'lucide-react';

export const NurseCareModal = ({ isOpen, onClose, patientId, initialTab = 'vitals', initialPrescriptionId, onDataUpdated }) => {
  const { user, hasRole } = useAuth();
  const isNurse = hasRole(['ROLE_NURSE']) || user?.role === 'ROLE_NURSE' || user?.role === 'NURSE';
  const isDoctor = hasRole(['ROLE_DOCTOR']) || user?.role === 'ROLE_DOCTOR' || user?.role === 'DOCTOR';
  const isAdmin = hasRole(['ROLE_ADMIN']) || user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // 1. Vital Signs Form State
  const [vitalsForm, setVitalsForm] = useState({
    temperature: '',
    bloodPressure: '',
    systolic: '',
    diastolic: '',
    pulse: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    notes: ''
  });
  const [vitalsSubmitting, setVitalsSubmitting] = useState(false);

  // 2. Medication Administration Form State
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [administerForm, setAdministerForm] = useState({
    scheduledTime: '09:00 AM',
    status: 'GIVEN',
    dosageGiven: '',
    route: 'Oral',
    notes: ''
  });
  const [administerSubmitting, setAdministerSubmitting] = useState(false);

  // 3. Nursing Note Form State
  const [noteForm, setNoteForm] = useState({
    activityType: 'CARE_PROVIDED',
    note: ''
  });
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && patientId) {
      setActiveTab(initialTab || 'vitals');
      loadCareContext();
    }
  }, [isOpen, patientId, initialTab, initialPrescriptionId]);

  const loadCareContext = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await nurseApi.getPatientCareContext(patientId);
      setContext(res.data);
      if (res.data?.prescriptions?.length > 0) {
        let targetPresc = res.data.prescriptions[0];
        if (initialPrescriptionId) {
          const matched = res.data.prescriptions.find((p) => p.id === Number(initialPrescriptionId));
          if (matched) targetPresc = matched;
        }
        setSelectedPrescription(targetPresc);
        setAdministerForm((prev) => ({
          ...prev,
          dosageGiven: targetPresc.dosage || '',
          route: targetPresc.route || 'Oral'
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load patient nursing care dossier.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordVitals = async (e) => {
    e.preventDefault();
    if (!isNurse) {
      setError('Access denied: Triage vitals must only be recorded by nurses.');
      return;
    }
    setVitalsSubmitting(true);
    setError('');
    setActionSuccess('');
    try {
      const payload = {
        patientId,
        temperature: vitalsForm.temperature ? parseFloat(vitalsForm.temperature) : null,
        bloodPressure: vitalsForm.bloodPressure ? vitalsForm.bloodPressure.trim() : null,
        systolic: vitalsForm.systolic ? parseInt(vitalsForm.systolic, 10) : null,
        diastolic: vitalsForm.diastolic ? parseInt(vitalsForm.diastolic, 10) : null,
        pulse: vitalsForm.pulse ? parseInt(vitalsForm.pulse, 10) : null,
        respiratoryRate: vitalsForm.respiratoryRate ? parseInt(vitalsForm.respiratoryRate, 10) : null,
        oxygenSaturation: vitalsForm.oxygenSaturation ? parseFloat(vitalsForm.oxygenSaturation) : null,
        notes: vitalsForm.notes.trim()
      };

      const res = await nurseApi.recordVitals(payload);
      setVitalsForm({
        temperature: '',
        bloodPressure: '',
        systolic: '',
        diastolic: '',
        pulse: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        notes: ''
      });

      if (res.data.isAlert) {
        setActionSuccess(`⚠️ Vitals recorded! Alert triggered: ${res.data.alertMessage}. Physician notified.`);
      } else {
        setActionSuccess('✓ Vitals recorded successfully and updated in clinical observations.');
      }
      setTimeout(() => setActionSuccess(''), 5000);
      await loadCareContext();
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save vital signs observations.');
    } finally {
      setVitalsSubmitting(false);
    }
  };

  const handleAdministerMedication = async (e) => {
    e.preventDefault();
    if (!selectedPrescription) {
      setError('Please select a prescribed medication to administer.');
      return;
    }
    setAdministerSubmitting(true);
    setError('');
    setActionSuccess('');
    try {
      await nurseApi.administerMedication({
        prescriptionId: selectedPrescription.id,
        patientId,
        scheduledTime: administerForm.scheduledTime,
        status: administerForm.status,
        dosageGiven: administerForm.dosageGiven.trim() || selectedPrescription.dosage,
        route: administerForm.route.trim() || selectedPrescription.route,
        notes: administerForm.notes.trim()
      });

      setAdministerForm((prev) => ({ ...prev, notes: '' }));
      setActionSuccess(`✓ Administered ${selectedPrescription.medicationName} (${administerForm.dosageGiven || selectedPrescription.dosage}) recorded in MAR.`);
      setTimeout(() => setActionSuccess(''), 5000);
      await loadCareContext();
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record medication administration.');
    } finally {
      setAdministerSubmitting(false);
    }
  };

  const handleAddNursingNote = async (e) => {
    e.preventDefault();
    if (!noteForm.note.trim()) {
      setError('Please enter nursing documentation details.');
      return;
    }
    setNoteSubmitting(true);
    setError('');
    setActionSuccess('');
    try {
      await nurseApi.addNursingNote({
        patientId,
        activityType: noteForm.activityType,
        note: noteForm.note.trim()
      });
      setNoteForm({ activityType: 'CARE_PROVIDED', note: '' });
      setActionSuccess('✓ Nursing care activity documented successfully.');
      setTimeout(() => setActionSuccess(''), 5000);
      await loadCareContext();
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record nursing note.');
    } finally {
      setNoteSubmitting(false);
    }
  };

  if (!isOpen || (!isNurse && !isDoctor && !isAdmin)) return null;

  const patient = context?.patient;
  const bed = context?.bed;
  const ward = context?.ward;
  const order = context?.admissionOrder;
  const latestVitals = context?.latestVitals;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-blue-700 dark:text-sky-400">
          <HeartPulse className="w-5 h-5" />
          <span>{isNurse ? 'Nurse Clinical Care Dossier' : 'Inpatient Clinical Care & Telemetry Dossier'}</span>
          {bed && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300 border border-sky-300">
              Bed {bed.bedNumber} &bull; {bed.wardName}
            </span>
          )}
        </div>
      }
      maxWidth="max-w-4xl"
    >
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          Loading patient clinical context & telemetry...
        </div>
      ) : !patient ? (
        <div className="py-10 text-center text-xs text-slate-400">
          Patient record not found.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Summary Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/10 via-slate-100 to-blue-900/10 dark:from-slate-800 dark:to-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-display">
                    {patient.name}
                  </span>
                  <span className="font-mono text-blue-700 dark:text-sky-400 font-bold">
                    ({patient.patientNumber})
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-[10px]">
                    {patient.age} yrs &bull; {patient.gender}
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 text-[10px]">
                    Blood: {patient.bloodGroup || 'N/A'}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                  <strong>Attending Doctor:</strong> {order?.doctorName || 'Assigned Physician'} &bull;{' '}
                  <strong>Admission Indication:</strong>{' '}
                  <span className="italic text-slate-800 dark:text-slate-200">{order?.diagnosis || 'Inpatient Observation'}</span>
                </p>
              </div>

              {latestVitals && (
                <div className={`p-2.5 rounded-xl border text-right shrink-0 ${
                  latestVitals.isAlert
                    ? 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200'
                    : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700'
                }`}>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Latest Vitals ({new Date(latestVitals.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                  <div className="font-mono font-bold text-xs mt-0.5 space-x-1.5">
                    <span>T: {latestVitals.temperature || '--'}°F</span>
                    <span>BP: {latestVitals.bloodPressure || '--'}</span>
                    <span>HR: {latestVitals.pulse || '--'}</span>
                    <span className={latestVitals.oxygenSaturation < 92 ? 'text-rose-600 font-extrabold' : ''}>
                      SpO₂: {latestVitals.oxygenSaturation || '--'}%
                    </span>
                  </div>
                  {latestVitals.isAlert && (
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block mt-0.5">
                      ⚠️ {latestVitals.alertMessage}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl border border-rose-200 text-xs">
              {error}
            </div>
          )}
          {actionSuccess && (
            <div className="p-3 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-sky-300 rounded-xl border border-blue-200 text-xs flex items-center justify-between">
              <span>{actionSuccess}</span>
              <button onClick={() => setActionSuccess('')} className="text-blue-700 font-bold ml-2">✕</button>
            </div>
          )}

          {/* 5 Tabs Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('vitals')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'vitals'
                  ? 'border-blue-600 text-blue-700 dark:text-sky-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              1. Record & Monitor Vitals ({context?.vitalsHistory?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('mar')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'mar'
                  ? 'border-blue-600 text-blue-700 dark:text-sky-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              2. Medication Admin (MAR) ({context?.prescriptions?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('treatment')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'treatment'
                  ? 'border-blue-600 text-blue-700 dark:text-sky-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              3. Doctor Orders & Labs
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'notes'
                  ? 'border-blue-600 text-blue-700 dark:text-sky-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              4. Nursing Care Activities ({context?.nursingNotes?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('bed')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'bed'
                  ? 'border-blue-600 text-blue-700 dark:text-sky-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BedDouble className="w-3.5 h-3.5" />
              5. Bed & Ward Details
            </button>
          </div>

          {/* TAB 1: VITALS TELEMETRY & RECORDING */}
          {activeTab === 'vitals' && (
            <div className="space-y-5 text-xs">
              {/* Vitals Input Form - Nurses Only */}
              {isNurse ? (
                <form onSubmit={handleRecordVitals} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-blue-600" />
                      Record Patient Observations & Vital Signs
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Rule-based telemetry triggers auto-alerts (SpO₂ &lt; 92%, Fever &gt; 101°F)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Temp (°F)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 101.2"
                        value={vitalsForm.temperature}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        BP (mmHg)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 120/80"
                        value={vitalsForm.bloodPressure}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressure: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Pulse (bpm)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 92"
                        value={vitalsForm.pulse}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Resp Rate (/min)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 18"
                        value={vitalsForm.respiratoryRate}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, respiratoryRate: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        SpO₂ (%) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 96"
                        value={vitalsForm.oxygenSaturation}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, oxygenSaturation: e.target.value })}
                        className={`w-full p-2 rounded-lg border text-xs focus:ring-2 focus:ring-sky-500 ${
                          vitalsForm.oxygenSaturation && parseFloat(vitalsForm.oxygenSaturation) < 92
                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 font-bold'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Clinical Observations / Nursing Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Patient resting comfortably in bed, oriented x 3, normal respiratory effort"
                      value={vitalsForm.notes}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="submit"
                      disabled={vitalsSubmitting}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition"
                    >
                      {vitalsSubmitting ? 'Saving Vitals...' : (
                        <>
                          <PlusCircle className="w-3.5 h-3.5" /> Save Vitals Observation
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 flex items-start gap-3">
                  <Stethoscope className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Attending Doctor Clinical Review Mode</p>
                    <p className="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5 leading-relaxed">
                      Inpatient bedside vitals are checked and recorded by the duty nurse. Once the nurse records vitals, they immediately appear in real-time below in the observation history and on your clinical dashboard.
                    </p>
                  </div>
                </div>
              )}

              {/* Historical Vitals Table */}
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Telemetry Observation History ({context?.vitalsHistory?.length || 0} records)
                </h4>
                {(!context?.vitalsHistory || context.vitalsHistory.length === 0) ? (
                  <div className="p-6 text-center border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
                    <Clock className="w-6 h-6 mx-auto text-amber-500 animate-pulse" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">Awaiting Nurse Bedside Check</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      The duty nurse has not checked or recorded vitals for this inpatient yet. Vitals will become visible here and across doctor portals as soon as the nurse completes the bedside examination.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100/70 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Date & Time</th>
                          <th className="py-2.5 px-2">Temp</th>
                          <th className="py-2.5 px-2">BP</th>
                          <th className="py-2.5 px-2">Pulse</th>
                          <th className="py-2.5 px-2">Resp</th>
                          <th className="py-2.5 px-2">SpO₂</th>
                          <th className="py-2.5 px-3">Alert Status</th>
                          <th className="py-2.5 px-3">Nurse</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {context.vitalsHistory.map((v) => (
                          <tr key={v.id} className={v.isAlert ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {new Date(v.recordedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-2 font-semibold">
                              {v.temperature ? `${v.temperature}°F` : '—'}
                            </td>
                            <td className="py-2.5 px-2 font-semibold">{v.bloodPressure || '—'}</td>
                            <td className="py-2.5 px-2">{v.pulse ? `${v.pulse} bpm` : '—'}</td>
                            <td className="py-2.5 px-2">{v.respiratoryRate ? `${v.respiratoryRate}/min` : '—'}</td>
                            <td className="py-2.5 px-2">
                              <span className={`font-bold ${v.oxygenSaturation && v.oxygenSaturation < 92 ? 'text-rose-600 underline' : ''}`}>
                                {v.oxygenSaturation ? `${v.oxygenSaturation}%` : '—'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {v.isAlert ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  v.alertAcknowledged
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-600 text-white animate-pulse'
                                }`}>
                                  {v.alertAcknowledged ? 'Acknowledged' : `🚨 ${v.alertSeverity || 'ALERT'}`}
                                </span>
                              ) : (
                                <span className="text-blue-600 font-semibold">Normal</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{v.recordedByName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MEDICATION ADMINISTRATION (MAR) */}
          {activeTab === 'mar' && (
            <div className="space-y-5 text-xs">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Pill className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Medication Workflow Protocol (MAR):</span>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    <strong>Doctor</strong> prescribes &bull; <strong>Pharmacist</strong> dispenses &bull; <strong>Nurse</strong> administers as part of inpatient care and documents the administration below.
                  </p>
                </div>
              </div>

              {/* Administer Medication Action Form (for Nurse) or Clinical Review Card (for Doctor) */}
              {isNurse ? (
                <form onSubmit={handleAdministerMedication} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Administer Prescribed Medication
                  </h4>

                  {selectedPrescription && (
                    <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                      selectedPrescription.dispensingStatus === 'DISPENSED'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {selectedPrescription.dispensingStatus === 'DISPENSED' ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                        <div>
                          <span className="font-bold">
                            {selectedPrescription.dispensingStatus === 'DISPENSED'
                              ? `✓ Pharmacy Verified & Dispensed (${selectedPrescription.dispensedByName || 'Staff Pharmacist'})`
                              : '⏳ Awaiting Pharmacy Dispensing'}
                          </span>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            Prescribed: {selectedPrescription.dosage} &bull; {selectedPrescription.frequency} for {selectedPrescription.duration} ({selectedPrescription.route || 'Oral'}) &bull; Dr. {selectedPrescription.doctorName}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        selectedPrescription.dispensingStatus === 'DISPENSED'
                          ? 'bg-blue-200/70 text-blue-950 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-amber-200/70 text-amber-950 dark:bg-amber-900 dark:text-amber-200'
                      }`}>
                        {selectedPrescription.dispensingStatus === 'DISPENSED' ? 'Ready for Bedside Administration' : 'Pending Pharmacy'}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Select Prescribed Medication *
                      </label>
                      <select
                        value={selectedPrescription?.id || ''}
                        onChange={(e) => {
                          const presc = context?.prescriptions?.find((p) => p.id.toString() === e.target.value);
                          setSelectedPrescription(presc);
                          if (presc) {
                            setAdministerForm((prev) => ({
                              ...prev,
                              dosageGiven: presc.dosage,
                              route: presc.route
                            }));
                          }
                        }}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-sky-500"
                      >
                        {(!context?.prescriptions || context.prescriptions.length === 0) && (
                          <option value="">No active prescriptions available</option>
                        )}
                        {context?.prescriptions?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.medicationName} &bull; {p.dosage} ({p.frequency}) &bull; [{p.dispensingStatus}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Scheduled Slot
                      </label>
                      <select
                        value={administerForm.scheduledTime}
                        onChange={(e) => setAdministerForm({ ...administerForm, scheduledTime: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="08:00 AM">08:00 AM (Morning)</option>
                        <option value="09:00 AM">09:00 AM (Morning)</option>
                        <option value="01:00 PM">01:00 PM (Afternoon)</option>
                        <option value="02:00 PM">02:00 PM (Afternoon)</option>
                        <option value="08:00 PM">08:00 PM (Evening)</option>
                        <option value="09:00 PM">09:00 PM (Night)</option>
                        <option value="STAT / Immediate">STAT / Immediate</option>
                        <option value="PRN (As Needed)">PRN (As Needed)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Administration Status
                      </label>
                      <select
                        value={administerForm.status}
                        onChange={(e) => setAdministerForm({ ...administerForm, status: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-sky-500 font-bold"
                      >
                        <option value="GIVEN">GIVEN (Administered to patient)</option>
                        <option value="HELD">HELD (Clinical reason / vitals out of range)</option>
                        <option value="REFUSED">REFUSED (Patient declined dose)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Dosage & Route Given
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Dosage given"
                          value={administerForm.dosageGiven}
                          onChange={(e) => setAdministerForm({ ...administerForm, dosageGiven: e.target.value })}
                          className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Route (e.g. Oral, IV)"
                          value={administerForm.route}
                          onChange={(e) => setAdministerForm({ ...administerForm, route: e.target.value })}
                          className="w-28 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Notes / Reaction Observed
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Taken with water, tolerated well, no nausea"
                        value={administerForm.notes}
                        onChange={(e) => setAdministerForm({ ...administerForm, notes: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={administerSubmitting || !selectedPrescription}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      {administerSubmitting ? 'Recording Dose...' : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sign & Record Dose Given
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 flex items-start gap-3">
                  <Stethoscope className="w-5 h-5 text-blue-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Attending Doctor Clinical MAR Review Mode</p>
                    <p className="text-[11px] text-blue-800 dark:text-sky-300 mt-0.5 leading-relaxed">
                      Inpatient bedside doses are administered and signed off by the allocated duty nurse. Review the real-time Medication Administration Record (MAR) log below to check dose delivery timestamps, dosages given, routes, and clinical observations.
                    </p>
                  </div>
                </div>
              )}

              {/* Medication Administrations History Table */}
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Medication Administration History (MAR Log)
                </h4>
                {(!context?.medicationAdministrations || context.medicationAdministrations.length === 0) ? (
                  <p className="p-6 text-center text-slate-400 border border-dashed rounded-xl">
                    No medication administration events recorded yet today.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100/70 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Administered Time</th>
                          <th className="py-2.5 px-3">Medication</th>
                          <th className="py-2.5 px-2">Dose / Route</th>
                          <th className="py-2.5 px-2">Slot</th>
                          <th className="py-2.5 px-2">Status</th>
                          <th className="py-2.5 px-3">Notes</th>
                          <th className="py-2.5 px-3">Administering Nurse</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {context.medicationAdministrations.map((a) => (
                          <tr key={a.id}>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {new Date(a.administeredAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                              {a.medicationName}
                            </td>
                            <td className="py-2.5 px-2">{a.dosageGiven} ({a.route})</td>
                            <td className="py-2.5 px-2 font-mono text-slate-500">{a.scheduledTime}</td>
                            <td className="py-2.5 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                a.status === 'GIVEN'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{a.notes || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-500">{a.administeredByName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DOCTOR ORDERS & LAB RESULTS */}
          {activeTab === 'treatment' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Doctor's Admission Order & Treatment */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-sm">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    Doctor's Admission Order & Directives
                  </h4>
                  {order ? (
                    <div className="space-y-2">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Attending Physician:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">Dr. {order.doctorName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Clinical Diagnosis:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{order.diagnosis}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Recommended Ward & Priority:</span>
                        <span className="font-semibold text-blue-700 dark:text-sky-400">
                          {order.recommendedWardType} &bull; Priority: {order.priority}
                        </span>
                      </div>
                      {order.notes && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">Physician Directives & Instructions:</span>
                          <p className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 italic text-slate-700 dark:text-slate-300">
                            "{order.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No formal admission order recorded.</p>
                  )}
                </div>

                {/* Verified Lab Telemetry */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-sm">
                    <FlaskConical className="w-4 h-4 text-sky-600" />
                    Laboratory Results Relevant to Care
                  </h4>
                  {(!context?.labOrders || context.labOrders.length === 0) ? (
                    <p className="text-slate-400 italic">No lab orders placed for this patient.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {context.labOrders.map((lo) => (
                        <div key={lo.id} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{lo.testName}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              lo.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {lo.status}
                            </span>
                          </div>
                          {lo.result ? (
                            <div className="mt-1 font-mono text-slate-700 dark:text-slate-300">
                              Value: <strong className="text-blue-700 dark:text-sky-300">{lo.result.resultValue} {lo.result.unit}</strong>{' '}
                              (Ref: {lo.result.referenceRange}) &bull; Verified by {lo.result.verifiedBy}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Specimen {lo.specimenType} &bull; Awaiting laboratory analysis</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Doctor Consultation History / SOAP records */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 text-sm">
                  Physician Consultation & Treatment Notes
                </h4>
                {(!context?.medicalRecords || context.medicalRecords.length === 0) ? (
                  <p className="text-slate-400 italic">No consultation notes recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {context.medicalRecords.map((r) => (
                      <div key={r.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{r.diagnosis}</span>
                          <span className="text-[10px] font-mono text-slate-400">{r.visitDate} &bull; Dr. {r.doctorName}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                          <strong>Complaint:</strong> {r.chiefComplaint}
                        </p>
                        {r.treatment && (
                          <p className="text-blue-800 dark:text-sky-300 text-[11px]">
                            <strong>Treatment Plan:</strong> {r.treatment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: NURSING CARE ACTIVITIES & DOCUMENTATION */}
          {activeTab === 'notes' && (
            <div className="space-y-4 text-xs">
              {/* Add Nursing Activity Note Form */}
              <form onSubmit={handleAddNursingNote} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Document Nursing & Care Activities
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Activity Category *
                    </label>
                    <select
                      value={noteForm.activityType}
                      onChange={(e) => setNoteForm({ ...noteForm, activityType: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="CARE_PROVIDED">Routine Nursing Care Provided</option>
                      <option value="CHECK_IN">Patient Checked / Bedside Visit</option>
                      <option value="CONDITION_OBSERVED">Patient Condition Observed / Symptom Change</option>
                      <option value="WOUND_DRESSING">Wound Care / Dressing Change</option>
                      <option value="MEDICATION_ADMINISTERED">Medication Administration Check</option>
                      <option value="ALERT_RESPONSE">Vital-Sign Alert Response</option>
                      <option value="DOCTOR_ESCALATED">Physician Escalation / Communication</option>
                      <option value="TRANSFER_SUPPORT">Bed / Ward Transfer Support</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Clinical Documentation Note *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Document specific actions, patient response, wound condition, or communication..."
                      value={noteForm.note}
                      onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={noteSubmitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition"
                  >
                    {noteSubmitting ? 'Logging Activity...' : (
                      <>
                        <Send className="w-3.5 h-3.5" /> Save Care Activity Log
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Nursing Activity Timeline */}
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Chronological Nursing Care Log ({context?.nursingNotes?.length || 0} entries)
                </h4>
                {(!context?.nursingNotes || context.nursingNotes.length === 0) ? (
                  <p className="p-6 text-center text-slate-400 border border-dashed rounded-xl">
                    No nursing care notes logged for this patient yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {context.nursingNotes.map((n) => (
                      <div key={n.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {n.activityType.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(n.recordedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                            {n.note}
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-500 shrink-0 font-medium">
                          Nurse: {n.nurseName}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: BED & WARD DETAILS */}
          {activeTab === 'bed' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-blue-950/30 border border-sky-200 dark:border-blue-900 text-blue-900 dark:text-sky-200 flex items-start gap-2.5">
                <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">SRS Clinical Pathway Protocol:</span>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    Bed assignment strictly requires an authorized doctor's admission order before inpatient nursing care commences.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Current Bed Allocation
                  </h4>
                  <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Bed Number:</span>
                      <span className="font-extrabold text-blue-700 dark:text-sky-400 text-sm">{bed?.bedNumber || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Bed Type & Status:</span>
                      <span className="font-semibold">{bed?.bedType} &bull; {bed?.status}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Assignment Timestamp:</span>
                      <span className="font-mono">{bed?.assignmentDate ? new Date(bed.assignmentDate).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Ward Operations
                  </h4>
                  <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ward Name:</span>
                      <span className="font-bold">{ward?.wardName || bed?.wardName || 'Inpatient Ward'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ward Type & Floor:</span>
                      <span className="font-semibold">{ward?.wardType || 'GENERAL'} &bull; Floor {ward?.floorNumber || 1}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Nurse In Charge:</span>
                      <span className="font-semibold">{ward?.nurseInCharge || user?.fullName || 'Assigned Duty Nurse'}</span>
                    </div>
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

export default NurseCareModal;
