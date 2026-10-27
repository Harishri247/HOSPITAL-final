import React, { useState, useEffect } from 'react';
import { recordApi, patientApi, userApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { FileText, PlusCircle, Search, User, AlertCircle } from 'lucide-react';

export const MedicalRecordsPage = () => {
  const { user, hasRole } = useAuth();
  const isPatient = hasRole(['ROLE_PATIENT']) || user?.role === 'ROLE_PATIENT' || user?.role === 'PATIENT';
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // New Record Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: user?.id || '',
    chiefComplaint: '',
    diagnosis: '',
    icdCode: '',
    treatment: '',
    notes: '',
  });
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadRecords(selectedPatientId);
    } else {
      setRecords([]);
    }
  }, [selectedPatientId]);

  const loadPatients = async () => {
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
        if (myPat) {
          setPatients([myPat]);
          setSelectedPatientId(myPat.id);
        } else {
          setPatients([]);
        }
      } else {
        const res = await patientApi.getAll();
        setPatients(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedPatientId(res.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadRecords = async (patId) => {
    setLoading(true);
    try {
      const res = await recordApi.getByPatient(patId);
      setRecords(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setFormData({
      patientId: selectedPatientId || (patients[0]?.id || ''),
      doctorId: user?.id || '',
      chiefComplaint: '',
      diagnosis: '',
      icdCode: '',
      treatment: '',
      notes: '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      await recordApi.create(formData);
      setIsModalOpen(false);
      loadRecords(formData.patientId);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save medical examination note');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">
            Clinical Examination Records
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            HIPAA-compliant medical history, diagnosis, and ICD clinical coding
          </p>
        </div>

        {hasRole(['ROLE_DOCTOR', 'ROLE_ADMIN']) && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" /> Add Examination Record
          </button>
        )}
      </div>

      {/* Patient Selector */}
      {isPatient ? (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold text-lg">
              👤
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm block">
                {patients[0]?.name || user?.fullName || 'Your Health Record'}
              </span>
              <span className="text-slate-500 text-[11px]">
                MRN: {patients[0]?.patientNumber || 'Patient'} &bull; Blood Group: {patients[0]?.bloodGroup || 'N/A'}
              </span>
            </div>
          </div>
          <span className="px-3 py-1 bg-sky-50 dark:bg-blue-950/40 text-blue-700 dark:text-sky-300 font-semibold rounded-full border border-sky-200 dark:border-blue-800 text-[11px]">
            Personal Health Chart
          </span>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 text-xs">
          <User className="w-4 h-4 text-slate-400" />
          <label className="font-semibold text-slate-700 dark:text-slate-200">Select Patient Chart:</label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="flex-1 max-w-md p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.patientNumber}) &bull; {p.gender}, {p.age} yrs &bull; {p.phoneNumber}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Records History Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading patient medical chart...</div>
        ) : records.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center text-slate-400 text-xs">
            No clinical records logged for this patient yet.
          </div>
        ) : (
          records.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm text-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {r.diagnosis}
                  </h3>
                  <span className="text-slate-500 text-[11px]">
                    Attending Physician: <strong className="text-blue-600 dark:text-sky-400">{r.doctorName}</strong>
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                  {r.visitDate}
                </span>
              </div>

              <div>
                <strong className="text-slate-700 dark:text-slate-300 block mb-0.5">Chief Complaint:</strong>
                <p className="text-slate-600 dark:text-slate-400">{r.chiefComplaint}</p>
              </div>

              {r.icdCode && (
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-md bg-sky-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 font-mono font-bold text-[10px]">
                    ICD Coding: {r.icdCode}
                  </span>
                </div>
              )}

              {r.treatment && (
                <div>
                  <strong className="text-slate-700 dark:text-slate-300 block mb-0.5">Treatment Plan:</strong>
                  <p className="text-slate-600 dark:text-slate-400">{r.treatment}</p>
                </div>
              )}

              {r.notes && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 italic">
                  Physician Clinical Notes: {r.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Examination Record Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Clinical Examination & Diagnosis"
        maxWidth="max-w-2xl"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Patient *
            </label>
            <select
              required
              value={formData.patientId}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            >
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.patientNumber})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Chief Complaint *
            </label>
            <textarea
              required
              rows={2}
              value={formData.chiefComplaint}
              onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
              placeholder="e.g. Acute chest discomfort radiating to left arm for 2 hours..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Primary Diagnosis *
              </label>
              <input
                type="text"
                required
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                placeholder="e.g. Acute Coronary Syndrome"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ICD-10 Code
              </label>
              <input
                type="text"
                value={formData.icdCode}
                onChange={(e) => setFormData({ ...formData, icdCode: e.target.value })}
                placeholder="e.g. I20.0"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Treatment & Clinical Plan
            </label>
            <textarea
              rows={3}
              value={formData.treatment}
              onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
              placeholder="Medications prescribed, bed rest, dietary constraints..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Clinical Progress Notes
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Follow-up scheduled in 7 days, vitals stable..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition"
            >
              Save Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MedicalRecordsPage;
