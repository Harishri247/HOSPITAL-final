import React, { useState, useEffect } from 'react';
import { patientApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  PlusCircle,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Filter,
  ShieldCheck
} from 'lucide-react';

export const PatientsPage = () => {
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole(['ROLE_DOCTOR']) || user?.role === 'ROLE_DOCTOR' || user?.role === 'DOCTOR';
  const isNurse = hasRole(['ROLE_NURSE']) || user?.role === 'ROLE_NURSE' || user?.role === 'NURSE';
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    gender: 'Male',
    bloodGroup: 'O+',
    phoneNumber: '',
    address: '',
    emergencyContact: '',
    insuranceId: '',
    status: 'ACTIVE',
  });
  const [formError, setFormError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const res = await patientApi.getAll();
      setPatients(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await patientApi.search(searchQuery);
      setPatients(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openRegisterModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      name: '',
      dateOfBirth: '',
      gender: 'Male',
      bloodGroup: 'O+',
      phoneNumber: '',
      address: '',
      emergencyContact: '',
      insuranceId: '',
      status: 'OUTPATIENT',
    });
    setFormError('');
    setValidationErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (patient) => {
    setIsEditing(true);
    setCurrentId(patient.id);
    setFormData({
      name: patient.name || '',
      dateOfBirth: patient.dateOfBirth || '',
      gender: patient.gender || 'Male',
      bloodGroup: patient.bloodGroup || 'O+',
      phoneNumber: patient.phoneNumber || '',
      address: patient.address || '',
      emergencyContact: patient.emergencyContact || '',
      insuranceId: patient.insuranceId || '',
      status: patient.status || 'OUTPATIENT',
    });
    setFormError('');
    setValidationErrors({});
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setValidationErrors({});

    try {
      if (isEditing) {
        await patientApi.update(currentId, formData);
      } else {
        await patientApi.register(formData);
      }
      setIsModalOpen(false);
      loadPatients();
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.validationErrors) {
        setValidationErrors(errorData.validationErrors);
      } else {
        setFormError(errorData?.message || 'Operation failed');
      }
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete patient record for ${name}?`)) {
      try {
        await patientApi.delete(id);
        loadPatients();
      } catch (err) {
        alert(err.response?.data?.message || 'Delete failed');
      }
    }
  };

  const filteredPatients = patients.filter(p => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OUTPATIENT') return p.status === 'OUTPATIENT' || p.status === 'ACTIVE';
    return p.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-700 via-blue-600 to-sky-400" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              {isDoctor ? 'My Clinical Patients' : isNurse ? 'Patient Care Roster' : 'Central Patient Registry'}
            </h1>
            {isDoctor && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-sky-300 border border-blue-500/30 shadow-xs">
                🩺 Doctor Panel ({user?.fullName || 'Assigned'})
              </span>
            )}
            {isNurse && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-blue-600 dark:text-sky-300 border border-sky-500/30 shadow-xs">
                🩺 Nurse Clinical Roster
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
            {isDoctor
              ? `Showing ${patients.length} patients assigned to your consultations and appointments`
              : isNurse
              ? `Showing ${patients.length} hospital patients registered for clinical care & observations`
              : `Total of ${patients.length} patients actively managed in the hospital records system`}
          </p>
        </div>

        {hasRole(['ROLE_ADMIN', 'ROLE_RECEPTIONIST', 'ROLE_DOCTOR']) && (
          <button
            onClick={openRegisterModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-600/30 transition-all active:scale-95 cursor-pointer relative z-10"
          >
            <PlusCircle className="w-4 h-4" /> Register New Patient
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="absolute inset-y-0 left-3.5 my-auto w-4 h-4 text-blue-600 dark:text-sky-400" />
          <input
            type="text"
            placeholder="Search by Patient Name, ID (PAT-...), or 10-digit Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all shadow-xs"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 shadow-xs cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="OUTPATIENT">Outpatient</option>
            <option value="INPATIENT">Inpatient</option>
            <option value="DISCHARGED">Discharged</option>
          </select>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading patient directory...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">No matching patient records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold bg-slate-50/50 dark:bg-slate-900/50">
                <tr>
                  <th className="py-3 px-4">Patient Number</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Age / Gender</th>
                  <th className="py-3 px-4">Blood</th>
                  <th className="py-3 px-4">Phone</th>
                  {!isDoctor && <th className="py-3 px-4">Attending Doctor</th>}
                  <th className="py-3 px-4">Assigned Nurse</th>
                  <th className="py-3 px-4">Ward & Bed</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-xs text-blue-600 dark:text-sky-300 px-2.5 py-1 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 shadow-xs">
                        {p.patientNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-medium">
                      {p.age} yrs &bull; {p.gender}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-black text-[10px] border shadow-xs ${
                        p.bloodGroup?.startsWith('O')
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : p.bloodGroup?.startsWith('A')
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 border-blue-200 dark:border-blue-800'
                          : p.bloodGroup?.startsWith('B')
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                          : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                      }`}>
                        🩸 {p.bloodGroup || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {p.phoneNumber}
                    </td>
                    {!isDoctor && (
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-semibold">
                        {p.primaryDoctorName ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px]">
                            👨‍⚕️ {p.primaryDoctorName}
                          </span>
                        ) : '—'}
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {p.assignedNurseName && p.assignedNurseName !== p.primaryDoctorName ? (
                        <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-1 rounded-xl text-[11px] font-bold border border-sky-200 dark:border-sky-800 shadow-xs">
                          🩺 {p.assignedNurseName}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Unallocated</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {p.bedNumber ? (
                        <span className="font-bold text-blue-700 dark:text-sky-300 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-blue-950/40 border border-sky-200/60 dark:border-blue-800/60">
                          Bed {p.bedNumber} ({p.wardName || 'Ward'})
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">OPD</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-xs ${
                        (p.status === 'OUTPATIENT' || p.status === 'ACTIVE')
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 border-sky-300 dark:border-blue-800'
                          : p.status === 'INPATIENT'
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          (p.status === 'OUTPATIENT' || p.status === 'ACTIVE')
                            ? 'bg-sky-500 animate-pulse'
                            : p.status === 'INPATIENT'
                            ? 'bg-sky-500 animate-pulse'
                            : 'bg-slate-400'
                        }`} />
                        {p.status === 'ACTIVE' ? 'OUTPATIENT' : p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/patients/${p.id}`}
                          className="p-2 rounded-xl text-blue-600 dark:text-sky-400 bg-blue-500/10 dark:bg-blue-500/20 hover:bg-blue-500/20 dark:hover:bg-blue-500/30 border border-blue-500/30 shadow-xs transition-all hover:scale-105"
                          title="View 360 Patient Chart"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {hasRole(['ROLE_ADMIN', 'ROLE_RECEPTIONIST', 'ROLE_DOCTOR']) && (
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-2 rounded-xl text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-500/20 hover:bg-sky-500/20 dark:hover:bg-sky-500/30 border border-sky-500/30 shadow-xs transition-all hover:scale-105 cursor-pointer"
                            title="Edit Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {hasRole(['ROLE_ADMIN']) && (
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-2 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200/80 dark:border-rose-800/80 shadow-xs transition-all hover:scale-105 cursor-pointer"
                            title="Delete Patient Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Register / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Patient Information' : 'Patient Registration Wizard'}
        maxWidth="max-w-2xl"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {!isEditing && (
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-blue-950/40 border border-sky-200/80 dark:border-blue-800/60 flex items-start gap-2.5 text-blue-900 dark:text-sky-200 text-xs">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Patient Privacy & Security Notice</p>
                <p className="text-[11px] text-blue-800/80 dark:text-sky-300/80 mt-0.5">
                  Receptionists do not set or issue patient passwords. The patient creates their own password independently when activating their online portal account using their mobile number or Patient ID.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name (Alphabetic only) *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Robert Smith"
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none ${
                  validationErrors.name ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {validationErrors.name && (
                <span className="text-[10px] text-rose-500 mt-0.5 block">{validationErrors.name}</span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number (10 digits) *
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="9876543210"
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none ${
                  validationErrors.phoneNumber ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {validationErrors.phoneNumber && (
                <span className="text-[10px] text-rose-500 mt-0.5 block">{validationErrors.phoneNumber}</span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none ${
                  validationErrors.dateOfBirth ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {validationErrors.dateOfBirth && (
                <span className="text-[10px] text-rose-500 mt-0.5 block">{validationErrors.dateOfBirth}</span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gender *
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Blood Group
              </label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Insurance ID / Policy #
              </label>
              <input
                type="text"
                value={formData.insuranceId}
                onChange={(e) => setFormData({ ...formData, insuranceId: e.target.value })}
                placeholder="e.g. INS-99882"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Residential Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="House, Street, City, ZIP"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Emergency Contact (Name & Phone)
            </label>
            <input
              type="text"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              placeholder="e.g. Sarah Smith (Spouse) - 9876543212"
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
              className="px-6 py-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 hover:opacity-95 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
            >
              {isEditing ? 'Save Changes' : 'Confirm Registration'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PatientsPage;
