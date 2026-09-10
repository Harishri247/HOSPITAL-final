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
  Filter
} from 'lucide-react';

export const PatientsPage = () => {
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole(['ROLE_DOCTOR']) || user?.role === 'ROLE_DOCTOR' || user?.role === 'DOCTOR';
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
      status: 'ACTIVE',
    });
    setFormError('');
    setValidationErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setIsEditing(true);
    setCurrentId(p.id);
    setFormData({
      name: p.name || '',
      dateOfBirth: p.dateOfBirth || '',
      gender: p.gender || 'Male',
      bloodGroup: p.bloodGroup || 'O+',
      phoneNumber: p.phoneNumber || '',
      address: p.address || '',
      emergencyContact: p.emergencyContact || '',
      insuranceId: p.insuranceId || '',
      status: p.status || 'ACTIVE',
    });
    setFormError('');
    setValidationErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name || !/^[a-zA-Z\s]+$/.test(formData.name.trim())) {
      errs.name = 'Name must contain only alphabetic characters and spaces';
    }
    if (!formData.phoneNumber || !/^\d{10}$/.test(formData.phoneNumber.trim())) {
      errs.phoneNumber = 'Phone number must be exactly 10 digits';
    }
    if (!formData.dateOfBirth) {
      errs.dateOfBirth = 'Date of birth is required';
    } else {
      const dob = new Date(formData.dateOfBirth);
      if (dob > new Date()) {
        errs.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validateForm()) return;

    try {
      if (isEditing) {
        await patientApi.update(currentId, formData);
      } else {
        await patientApi.register(formData);
      }
      setIsModalOpen(false);
      loadPatients();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save patient. Please check your input.';
      setFormError(msg);
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
    return p.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">
              {isDoctor ? 'My Patients' : 'Patient Registry'}
            </h1>
            {isDoctor && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                🩺 Doctor Panel ({user?.fullName || 'Assigned'})
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-1">
            {isDoctor
              ? `Showing ${patients.length} patients assigned to your consultations and appointments`
              : `Total of ${patients.length} patients registered in the hospital system`}
          </p>
        </div>

        {!isDoctor && hasRole(['ROLE_ADMIN', 'ROLE_RECEPTIONIST', 'ROLE_NURSE']) && (
          <button
            onClick={openRegisterModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" /> Register New Patient
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Patient Name, ID (PAT-...), or 10-digit Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
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
                  <th className="py-3 px-4">Registration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-bold text-teal-600 dark:text-teal-400">
                      {p.patientNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {p.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {p.age} yrs &bull; {p.gender}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                        {p.bloodGroup || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {p.phoneNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {p.registrationDate}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        p.status === 'INPATIENT' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/patients/${p.id}`}
                          className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition"
                          title="View 360 Patient Chart"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {hasRole(['ROLE_ADMIN', 'ROLE_RECEPTIONIST', 'ROLE_DOCTOR']) && (
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {hasRole(['ROLE_ADMIN']) && (
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
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
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-md transition"
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
