import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { patientApi, labApi } from '../api/apiService';
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
  AlertCircle
} from 'lucide-react';

export const PatientDetailPage = () => {
  const { id } = useParams();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('records');

  useEffect(() => {
    loadHistory();
  }, [id]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const [res, labRes] = await Promise.all([
        patientApi.getHistory(id),
        labApi.getByPatient(id).catch(() => ({ data: null })),
      ]);
      const data = res.data || {};
      if (labRes && labRes.data && labRes.data.length > 0) {
        data.labOrders = labRes.data;
      }
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-xs">Loading patient medical chart...</div>;
  }

  if (!history || !history.patient) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 text-sm">Patient chart not found.</p>
        <Link to="/patients" className="mt-4 inline-block text-xs font-semibold text-teal-600 hover:underline">
          &larr; Back to Patient Registry
        </Link>
      </div>
    );
  }

  const p = history.patient;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/patients"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-teal-600 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Patient Directory
      </Link>

      {/* Patient Dossier Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              {p.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 font-display">
                  {p.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                  p.status === 'INPATIENT' ? 'bg-sky-100 text-sky-800' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {p.status}
                </span>
              </div>
              <p className="text-xs font-mono text-teal-600 dark:text-teal-400 font-bold mt-0.5">
                {p.patientNumber}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
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

        {/* Demographics details */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
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
            <span className="text-slate-400 block">Address</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{p.address || 'Unspecified'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('records')}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'records'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" /> Medical Records ({history.medicalRecords?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'prescriptions'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Pill className="w-4 h-4" /> Prescriptions ({history.prescriptions?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'appointments'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" /> Appointments ({history.appointments?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('lab')}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'lab'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FlaskConical className="w-4 h-4" /> Laboratory ({history.labOrders?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'billing'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
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
                      <span className="inline-block px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[10px] font-mono font-semibold mb-2">
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
          <div>
            {!history.prescriptions || history.prescriptions.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-10">No prescriptions issued for this patient.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Medication</th>
                      <th className="py-2.5 px-3">Dosage</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Route</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.prescriptions.map((pr) => (
                      <tr key={pr.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{pr.medicationName}</td>
                        <td className="py-2.5 px-3">{pr.dosage}</td>
                        <td className="py-2.5 px-3">{pr.frequency}</td>
                        <td className="py-2.5 px-3">{pr.duration}</td>
                        <td className="py-2.5 px-3">{pr.route}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pr.dispensingStatus === 'DISPENSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {pr.dispensingStatus}
                          </span>
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
                      <span className="text-slate-500">Type: {a.type} &bull; Queue #{a.queueNumber}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
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
                {history.labOrders.map((lo) => (
                  <div key={lo.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                          {lo.testName} <span className="font-mono text-xs text-slate-400">({lo.testCode})</span>
                        </span>
                        <span className="text-slate-500">
                          Specimen: {lo.specimenType} &bull; Ordered by: {lo.doctorName || 'Doctor'} &bull; {lo.orderedDate ? new Date(lo.orderedDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        lo.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {lo.status === 'COMPLETED' ? 'Completed' : 'Pending Analysis'}
                      </span>
                    </div>

                    {lo.result && (
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Observed Diagnostic Value:</span>
                          <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                            {lo.result.resultValue} {lo.result.unit}
                          </span>
                          <span className="text-slate-400 text-[11px] ml-2 font-mono">
                            (Ref Range: {lo.result.referenceRange})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            lo.result.flag === 'CRITICAL' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300 font-extrabold' :
                            lo.result.flag === 'HIGH' || lo.result.flag === 'LOW' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {lo.result.flag}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            Verified by: {lo.result.verifiedBy}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
                        Invoice #{b.id} &bull; Total: ${b.totalAmount}
                      </span>
                      <span className="text-slate-500">
                        Paid: ${b.paidAmount} | Outstanding Balance: ${b.balanceAmount}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      b.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
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
      </div>
    </div>
  );
};

export default PatientDetailPage;
