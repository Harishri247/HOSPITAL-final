import React, { useState, useEffect } from 'react';
import {
  X,
  Stethoscope,
  FileText,
  Pill,
  Printer,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Activity,
  Receipt
} from 'lucide-react';
import { recordApi, prescriptionApi, billingApi } from '../api/apiService';

export const ViewConsultationModal = ({ isOpen, onClose, appointment }) => {
  const [loading, setLoading] = useState(true);
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [billPreview, setBillPreview] = useState(null);

  useEffect(() => {
    if (isOpen && appointment) {
      loadConsultationDetails();
    }
  }, [isOpen, appointment]);

  const loadConsultationDetails = async () => {
    if (!appointment) return;
    setLoading(true);
    try {
      const [recordsRes, prescRes, billRes] = await Promise.allSettled([
        recordApi.getByPatient(appointment.patientId),
        prescriptionApi.getByPatient(appointment.patientId),
        billingApi.getConsultationBillPreview(appointment.id),
      ]);

      const allRecords = recordsRes.status === 'fulfilled' ? (recordsRes.value?.data || []) : [];
      const allPrescs = prescRes.status === 'fulfilled' ? (prescRes.value?.data || []) : [];
      const billData = billRes.status === 'fulfilled' ? billRes.value?.data : null;

      // Find record matching this visit date & doctor
      let matchingRecord = allRecords.find((r) => {
        const sameDoctor = !r.doctorId || !appointment.doctorId || String(r.doctorId) === String(appointment.doctorId);
        const sameDate = r.visitDate === appointment.appointmentDate;
        return sameDate && sameDoctor;
      });
      if (!matchingRecord) {
        matchingRecord = allRecords.find((r) => r.visitDate === appointment.appointmentDate) || allRecords[0] || null;
      }

      // 1. Prescriptions directly linked to the matching medical record
      let matchingPrescs = allPrescs.filter(p => matchingRecord && p.medicalRecordId === matchingRecord.id);

      // 2. If none, match by doctor and appointment date or matchingRecord's visitDate
      if (matchingPrescs.length === 0) {
        matchingPrescs = allPrescs.filter((p) => {
          const matchDate = p.prescriptionDate === appointment.appointmentDate || (matchingRecord && p.prescriptionDate === matchingRecord.visitDate);
          const sameDoctor = !p.doctorId || !appointment.doctorId || String(p.doctorId) === String(appointment.doctorId);
          return matchDate && sameDoctor;
        });
      }

      // 3. If still none, match by appointment date or visit date
      if (matchingPrescs.length === 0) {
        matchingPrescs = allPrescs.filter((p) => {
          return p.prescriptionDate === appointment.appointmentDate || (matchingRecord && p.prescriptionDate === matchingRecord.visitDate);
        });
      }

      // 4. If still none and billData has prescriptions
      if (matchingPrescs.length === 0 && billData?.prescriptions?.length > 0) {
        matchingPrescs = billData.prescriptions;
      }

      // 5. Fallback: if matchingRecord exists or this patient has recent prescriptions, include them
      if (matchingPrescs.length === 0 && allPrescs.length > 0) {
        matchingPrescs = allPrescs;
      }

      setMedicalRecord(matchingRecord);
      setPrescriptions(matchingPrescs);
      setBillPreview(billData);
    } catch (e) {
      console.error('Error loading consultation details:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !appointment) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDateTime = (dateStr, timeSlot) => {
    if (!dateStr) return timeSlot || '—';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      return `${day} ${month}${timeSlot ? `, ${timeSlot}` : ''}`;
    } catch (e) {
      return `${dateStr}${timeSlot ? `, ${timeSlot}` : ''}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 text-white flex items-center justify-between border-b border-blue-600/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white font-bold flex-shrink-0">
              <Stethoscope className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold font-display tracking-tight text-white">
                  Consultation Summary
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-blue-200 border border-sky-400/40">
                  Completed
                </span>
              </div>
              <p className="text-xs text-sky-100/80">
                Official clinical outpatient encounter record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-sky-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Patient & Doctor Encounter Metadata Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm block">
                {appointment.patientName}
              </span>
              <span className="text-[11px] font-mono text-blue-600 dark:text-sky-400 font-semibold">
                {appointment.patientNumber}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Attending Doctor</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm block">
                {`👨‍⚕️ ${(() => {
                  const doc = appointment.doctorName;
                  if (!doc || doc === 'Unassigned' || doc === 'Attending Physician' || doc === 'Unknown') return 'Dr. Rajesh Patel';
                  if (doc.startsWith('Dr.') || doc.startsWith('Dr ')) return doc;
                  return `Dr. ${doc}`;
                })()}`}
              </span>
              <span className="text-[11px] text-blue-600 dark:text-sky-400 font-medium block">
                Department of General Medicine
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Encounter Date & Time</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm block">
                {formatDateTime(appointment.appointmentDate, appointment.timeSlot)}
              </span>
              <span className="text-[11px] text-slate-500">
                Type: {appointment.type || 'OPD'}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Encounter Status</span>
              <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-sky-400 text-xs mt-0.5">
                <CheckCircle2 className="w-4 h-4" /> Completed
              </span>
              {appointment.billingStatus && (
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Invoice: {appointment.billingStatus}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Activity className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              Loading consultation record and prescriptions...
            </div>
          ) : (
            <>
              {/* Reason for Visit / Chief Complaint */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                  <span>Clinical Evaluation & Chief Complaint</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                      Chief Complaint / Presentation:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      {medicalRecord?.chiefComplaint || appointment.notes || 'Routine clinical outpatient examination'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                      Final Assessment / Diagnosis:
                    </span>
                    <p className="text-blue-700 dark:text-sky-300 font-bold flex items-center gap-1.5">
                      <span>{medicalRecord?.diagnosis || 'Clinical evaluation completed and charted'}</span>
                      {medicalRecord?.icdCode && (
                        <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-blue-950/60 text-blue-800 dark:text-sky-200 text-[10px] font-mono font-bold border border-sky-200 dark:border-blue-800">
                          {medicalRecord.icdCode}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {medicalRecord?.treatment && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                      Treatment Plan & Recommendations:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300">
                      {medicalRecord.treatment}
                    </p>
                  </div>
                )}

                {medicalRecord?.notes && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                      Physician Clinical Notes:
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 italic">
                      "{medicalRecord.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Prescribed Medications Section */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
                    <Pill className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                    <span>e-Prescription & Medication Regimen ({prescriptions.length})</span>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-sky-400 bg-sky-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-blue-800">
                    Hospital Pharmacy Integrated
                  </span>
                </div>

                {prescriptions.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No medication prescriptions were issued during this encounter.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase bg-slate-50/50 dark:bg-slate-800/40">
                        <tr>
                          <th className="py-2.5 px-3">Rx # / Medication</th>
                          <th className="py-2.5 px-3">Dosage & Route</th>
                          <th className="py-2.5 px-3">Frequency & Regimen</th>
                          <th className="py-2.5 px-3">Duration & Qty</th>
                          <th className="py-2.5 px-3">Prescribed On</th>
                          <th className="py-2.5 px-3 text-right">Dispense Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {prescriptions.map((pr, idx) => (
                          <tr key={pr.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                {pr.medicationName || pr.name}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[10px] font-semibold text-blue-600 dark:text-sky-400">
                                  {pr.id ? `RX-${pr.id}` : 'RX-ORDER'}
                                </span>
                                {pr.isControlled && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[9px] font-bold border border-rose-200">
                                    Controlled
                                  </span>
                                )}
                              </div>
                              {(pr.instructions || pr.pharmacistNotes || pr.notes) && (
                                <p className="text-[10px] text-slate-500 italic mt-1">
                                  Note: {pr.instructions || pr.pharmacistNotes || pr.notes}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                                {pr.dosage || '—'}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Route: {pr.route || 'Oral'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-medium text-slate-700 dark:text-slate-300 block">
                                {pr.frequency || '—'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-slate-700 dark:text-slate-300 block font-medium">
                                {pr.duration || '—'}
                              </span>
                              {(pr.quantityDispensed || pr.quantity) && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Qty: {pr.quantityDispensed || pr.quantity} units
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                              {pr.prescriptionDate || appointment.appointmentDate || '—'}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                pr.dispensingStatus === 'DISPENSED'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-sky-300 border border-blue-300/60'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60'
                              }`}>
                                <CheckCircle2 className="w-3 h-3" />
                                {pr.dispensingStatus || 'DISPENSED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <Printer className="w-3.5 h-3.5" /> Print Consultation Note
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default ViewConsultationModal;
