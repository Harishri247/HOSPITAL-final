import React, { useState } from 'react';
import { Modal } from './Modal';
import { nurseApi } from '../api/apiService';
import {
  AlertTriangle,
  HeartPulse,
  Send,
  CheckCircle2,
  Clock,
  User,
  BedDouble,
  FileText
} from 'lucide-react';

const QUICK_ACTIONS = [
  'Administered supplemental O2 via nasal cannula (3L/min)',
  'Immediately notified attending physician Dr. on duty',
  'Administered prescribed antipyretic / IV fluid bolus',
  'Re-positioned patient to High Fowler position; airway clear',
  'Re-checked telemetry vitals; patient under continuous monitoring',
  'Notified Rapid Response / Code team for critical evaluation'
];

export const VitalAlertResponseModal = ({ isOpen, onClose, alert, onSuccess }) => {
  const [responseNotes, setResponseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!alert) return null;

  const handleAddQuickAction = (action) => {
    if (responseNotes.includes(action)) return;
    setResponseNotes((prev) => (prev ? `${prev}. ${action}` : action));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!responseNotes.trim()) {
      setError('Please provide response notes detailing the clinical action taken.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await nurseApi.respondToAlert(alert.id, { responseNotes: responseNotes.trim() });
      setResponseNotes('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to acknowledge vital alert.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          <span>Vital-Sign Alert Response & Triage</span>
        </div>
      }
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Patient & Trigger Header Banner */}
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-slate-800 dark:text-slate-200 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-rose-900 dark:text-rose-200">
                {alert.patientName}
              </span>
              <span className="font-mono text-slate-500 text-[11px]">({alert.patientNumber})</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white shadow-xs">
              {alert.alertSeverity || 'CRITICAL'} ALERT
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300 flex-wrap text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-blue-700 dark:text-sky-400">
              <BedDouble className="w-3.5 h-3.5" /> Bed {alert.bedNumber} ({alert.wardName})
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              {alert.recordedAt ? new Date(alert.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <User className="w-3.5 h-3.5" /> By: {alert.recordedByName || 'Nursing Staff'}
            </span>
          </div>

          <div className="mt-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900/50">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
              Trigger Reason:
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 font-mono">
              {alert.alertMessage}
            </p>
          </div>

          {/* Vitals snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-[11px]">
            <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Temp</span>
              <span className="font-bold">{alert.temperature ? `${alert.temperature}°F` : '—'}</span>
            </div>
            <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Blood Pressure</span>
              <span className="font-bold">{alert.bloodPressure || '—'}</span>
            </div>
            <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Pulse</span>
              <span className="font-bold">{alert.pulse ? `${alert.pulse} bpm` : '—'}</span>
            </div>
            <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">SpO₂</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{alert.oxygenSaturation ? `${alert.oxygenSaturation}%` : '—'}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl border border-rose-200 text-xs">
            {error}
          </div>
        )}

        {/* Quick Click Action Chips */}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Quick Clinical Interventions:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddQuickAction(action)}
                className="px-2.5 py-1 text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-blue-950/60 hover:text-blue-700 dark:hover:text-sky-300 border border-slate-200/80 dark:border-slate-700 rounded-lg transition text-left"
              >
                + {action}
              </button>
            ))}
          </div>
        </div>

        {/* Response / Nursing Documentation */}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nursing Response Documentation & Escalation Action *
          </label>
          <textarea
            rows={3}
            required
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            placeholder="Document immediate nursing care provided, vitals re-checked, physician contact, and patient response..."
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 rounded-xl shadow-md shadow-rose-600/20 transition flex items-center gap-1.5"
          >
            {submitting ? 'Acknowledging...' : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Acknowledge Alert & Log Care
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default VitalAlertResponseModal;
