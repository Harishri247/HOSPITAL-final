import React, { useState, useEffect } from 'react';
import { prescriptionApi, patientApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Pill, PlusCircle, CheckCircle2, AlertCircle, Clock, Check } from 'lucide-react';

export const PrescriptionsPage = () => {
  const { user, hasRole } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPending, setFilterPending] = useState(false);

  // New Prescription Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: user?.id || '',
    medicationName: '',
    dosage: '',
    frequency: 'Once daily',
    duration: '7 days',
    route: 'Oral',
  });
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    loadData();
  }, [filterPending]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [patRes, prescRes] = await Promise.all([
        patientApi.getAll(),
        filterPending ? prescriptionApi.getPending() : (
          hasRole(['ROLE_PATIENT']) ? prescriptionApi.getByPatient(1) : prescriptionApi.getPending()
        )
      ]);
      setPatients(patRes.data || []);
      setPrescriptions(prescRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setFormData({
      patientId: patients[0]?.id || '',
      doctorId: user?.id || '',
      medicationName: '',
      dosage: '',
      frequency: 'Once daily',
      duration: '7 days',
      route: 'Oral',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      await prescriptionApi.create(formData);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to issue prescription');
    }
  };

  const handleDispense = async (id) => {
    try {
      await prescriptionApi.dispense(id, { status: 'DISPENSED' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Dispensing failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">
            Pharmacy e-Prescriptions
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Clinical e-prescribing and pharmacist dispensing verification
          </p>
        </div>

        {hasRole(['ROLE_DOCTOR', 'ROLE_ADMIN']) && (
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" /> Issue New Prescription
          </button>
        )}
      </div>

      {/* Prescriptions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading prescriptions queue...</div>
        ) : prescriptions.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">No pending prescriptions in the pharmacy queue.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold bg-slate-50/50 dark:bg-slate-900/50">
                <tr>
                  <th className="py-3 px-4">Medication</th>
                  <th className="py-3 px-4">Dosage</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Duration & Route</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {prescriptions.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {pr.medicationName}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">{pr.dosage}</td>
                    <td className="py-3 px-4 text-slate-500">{pr.frequency}</td>
                    <td className="py-3 px-4 text-slate-500">{pr.duration} &bull; {pr.route}</td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                      {pr.patientName}
                      <span className="text-[10px] text-slate-400 block">{pr.patientNumber}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        pr.dispensingStatus === 'DISPENSED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {pr.dispensingStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {pr.dispensingStatus === 'PENDING' && hasRole(['ROLE_PHARMACIST', 'ROLE_ADMIN']) && (
                        <button
                          onClick={() => handleDispense(pr.id)}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Dispense
                        </button>
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
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Patient *
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
                placeholder="e.g. Amoxicillin 250mg"
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
                placeholder="e.g. 500mg or 1 tablet"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Frequency *
              </label>
              <input
                type="text"
                required
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                placeholder="e.g. Twice daily"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration *
              </label>
              <input
                type="text"
                required
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g. 10 days"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
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
              </select>
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
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-md transition"
            >
              Sign & Issue Prescription
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PrescriptionsPage;
