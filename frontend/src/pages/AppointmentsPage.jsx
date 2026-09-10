import React, { useState, useEffect } from 'react';
import { appointmentApi, patientApi, userApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  Calendar,
  Clock,
  PlusCircle,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  User,
  UserX,
  Activity,
  Check
} from 'lucide-react';

export const AppointmentsPage = () => {
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole(['ROLE_DOCTOR']) || user?.role === 'ROLE_DOCTOR' || user?.role === 'DOCTOR';
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Booking Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    timeSlot: '',
    type: 'OPD',
    notes: '',
  });
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [selectedDoctor, selectedDate, selectedStatus]);

  useEffect(() => {
    if (formData.doctorId && formData.appointmentDate) {
      loadSlots(formData.doctorId, formData.appointmentDate);
    }
  }, [formData.doctorId, formData.appointmentDate]);

  const loadBaseData = async () => {
    setLoading(true);
    try {
      const [docRes, patRes] = await Promise.all([
        userApi.getDoctors(),
        patientApi.getAll(),
      ]);
      setDoctors(docRes.data || []);
      setPatients(patRes.data || []);
      if (isDoctor) {
        setSelectedDoctor(user.id);
      }
      filterAppointments();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = async () => {
    try {
      const docId = isDoctor ? user?.id : (selectedDoctor || null);
      const res = await appointmentApi.filter(
        docId,
        selectedDate || null,
        selectedStatus || null
      );
      setAppointments(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSlots = async (docId, date) => {
    setLoadingSlots(true);
    try {
      const res = await appointmentApi.getSlots(docId, date);
      setAvailableSlots(res.data || []);
    } catch (e) {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const openBookModal = () => {
    const defaultDocId = isDoctor ? user.id : (doctors[0]?.id || '');
    setFormData({
      patientId: patients[0]?.id || '',
      doctorId: defaultDocId,
      appointmentDate: new Date().toISOString().split('T')[0],
      timeSlot: '',
      type: 'OPD',
      notes: '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!formData.timeSlot) {
      setModalError('Please select an appointment time slot');
      return;
    }

    // Verify slot is available in the doctor's live schedule
    const selectedSlotObj = availableSlots.find((s) => s.timeSlot === formData.timeSlot);
    if (selectedSlotObj && !selectedSlotObj.available) {
      setModalError(`Dr. is unavailable for slot ${formData.timeSlot} on ${formData.appointmentDate}. Please choose an open slot.`);
      return;
    }

    try {
      await appointmentApi.book(formData);
      setIsModalOpen(false);
      filterAppointments();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Could not book appointment. Check for scheduling conflicts.');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await appointmentApi.updateStatus(id, status);
      window.dispatchEvent(new Event('notification-updated'));
      filterAppointments();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await appointmentApi.cancel(id);
        window.dispatchEvent(new Event('notification-updated'));
        filterAppointments();
      } catch (err) {
        alert(err.response?.data?.message || 'Cancellation failed');
      }
    }
  };

  // Helper to test if a slot has ended in real-time
  const isSlotPassed = (appointmentDate, timeSlot) => {
    if (!appointmentDate || !timeSlot) return false;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      if (appointmentDate < todayStr) return true;
      if (appointmentDate > todayStr) return false;

      // Same day: check slot end time (e.g., "09:30 - 10:00")
      const parts = timeSlot.split('-');
      if (parts.length < 2) return false;
      const endTimeStr = parts[1].trim();
      const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
      if (isNaN(endHours) || isNaN(endMinutes)) return false;

      const now = new Date();
      const slotEnd = new Date();
      slotEnd.setHours(endHours, endMinutes, 0, 0);
      return now > slotEnd;
    } catch (e) {
      return false;
    }
  };

  // FR6: Waiting time calculation based on queue positions and active patients ahead
  const getEstimatedWait = (appointment, allAppointments) => {
    const status = appointment.status === 'PENDING' ? 'SCHEDULED' : appointment.status;
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)) {
      return { text: '—', type: 'none', count: 0 };
    }

    // Active appointments ahead for same doctor and same date
    const activeAhead = allAppointments.filter((other) => {
      if (other.id === appointment.id) return false;
      if (other.doctorId !== appointment.doctorId) return false;
      if (other.appointmentDate !== appointment.appointmentDate) return false;
      const otherStatus = other.status === 'PENDING' ? 'SCHEDULED' : other.status;
      if (!['SCHEDULED', 'CONFIRMED'].includes(otherStatus)) return false;

      // Compare queue numbers if present, otherwise time slot
      if (other.queueNumber && appointment.queueNumber) {
        return other.queueNumber < appointment.queueNumber;
      }
      return (other.timeSlot || '') < (appointment.timeSlot || '');
    });

    const patientsAhead = activeAhead.length;

    if (patientsAhead === 0) {
      return { text: 'Ready / Next', type: 'ready', count: 0 };
    }

    const waitMins = patientsAhead * 15; // 15 mins estimated per patient consultation
    const formatted = waitMins >= 60
      ? `${Math.floor(waitMins / 60)}h ${waitMins % 60 ? (waitMins % 60) + 'm' : ''}`.trim()
      : `${waitMins} min`;

    return { text: `~${formatted}`, type: 'waiting', count: patientsAhead };
  };

  // Count past pending appointments to assist staff
  const pastPendingCount = appointments.filter(
    (a) =>
      ['SCHEDULED', 'CONFIRMED', 'PENDING'].includes(a.status) &&
      isSlotPassed(a.appointmentDate, a.timeSlot)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">
            Appointments & Consultations
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Manage OPD, Follow-up, Specialist, and Clinical Procedure schedule bookings
          </p>
        </div>

        {!isDoctor && hasRole(['ROLE_ADMIN', 'ROLE_RECEPTIONIST', 'ROLE_PATIENT']) && (
          <button
            onClick={openBookModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" /> Book Appointment
          </button>
        )}
      </div>

      {/* Past slots notice banner if any */}
      {pastPendingCount > 0 && hasRole(['ROLE_ADMIN', 'ROLE_RECEPTIONIST', 'ROLE_DOCTOR']) && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>{pastPendingCount}</strong> appointment slot{pastPendingCount > 1 ? 's have' : ' has'} passed without completion. Please mark as <strong>Completed</strong> or <strong>No-Show</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-slate-400 font-semibold mb-1">Doctor Schedule</label>
          {isDoctor ? (
            <div className="p-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-teal-700 dark:text-teal-300 font-semibold flex items-center gap-1.5">
              <span>🩺</span>
              <span className="truncate">{user?.fullName || 'Your Schedule'} (Locked to your panel)</span>
            </div>
          ) : (
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            >
              <option value="">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName} ({d.departmentName || 'Clinic'})</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Filter by Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Filter by Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </select>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading appointment schedule...</div>
        ) : appointments.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">No scheduled appointments match your filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold bg-slate-50/50 dark:bg-slate-900/50">
                <tr>
                  <th className="py-3 px-4">Queue</th>
                  <th className="py-3 px-4">Est. Wait</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Date & Time Slot</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {appointments.map((a) => {
                  const normalizedStatus = a.status === 'PENDING' ? 'SCHEDULED' : a.status;
                  const isPassed = isSlotPassed(a.appointmentDate, a.timeSlot);
                  const wait = getEstimatedWait(a, appointments);

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      {/* Queue Column */}
                      <td className="py-3 px-4 font-bold text-teal-600 dark:text-teal-400">
                        #{a.queueNumber || '—'}
                      </td>

                      {/* Est. Wait Indicator (FR6) */}
                      <td className="py-3 px-4">
                        {wait.type === 'ready' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {wait.text}
                          </span>
                        ) : wait.type === 'waiting' ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60"
                            title={`${wait.count} patient${wait.count > 1 ? 's' : ''} ahead in queue (~15m/patient)`}
                          >
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            {wait.text}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 font-medium">—</span>
                        )}
                      </td>

                      {/* Patient Column */}
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {a.patientName}
                        <span className="text-[10px] text-slate-400 block font-normal">{a.patientNumber}</span>
                      </td>

                      {/* Doctor Column */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {a.doctorName}
                        <span className="text-[10px] text-slate-400 block">{a.departmentName || 'General'}</span>
                      </td>

                      {/* Date & Time Slot Column */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {a.appointmentDate}
                        <span className="text-[10px] text-slate-400 block">{a.timeSlot}</span>
                      </td>

                      {/* Appointment Type Column (SRS: OPD, FOLLOW_UP, SPECIALIST, PROCEDURE) */}
                      <td className="py-3 px-4">
                        {(() => {
                          switch (a.type) {
                            case 'FOLLOW_UP':
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                  Follow-up
                                </span>
                              );
                            case 'SPECIALIST':
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
                                  Specialist
                                </span>
                              );
                            case 'PROCEDURE':
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                                  Procedure
                                </span>
                              );
                            case 'OPD':
                            default:
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60">
                                  OPD
                                </span>
                              );
                          }
                        })()}
                      </td>

                      {/* Appointment Status Column */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5 items-start">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            normalizedStatus === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-700/60'
                              : normalizedStatus === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300/60 dark:border-blue-700/60'
                              : normalizedStatus === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300/60 dark:border-rose-700/60'
                              : normalizedStatus === 'NO_SHOW'
                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/60 dark:border-amber-700/60'
                          }`}>
                            {normalizedStatus === 'SCHEDULED' ? 'SCHEDULED (Pending Dr.)' : normalizedStatus}
                          </span>
                          {isPassed && ['SCHEDULED', 'CONFIRMED'].includes(normalizedStatus) && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-rose-500 dark:text-rose-400 font-medium">
                              <AlertTriangle className="w-2.5 h-2.5" /> Past slot
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Confirm action for SCHEDULED - Only assigned doctor or Admin */}
                          {normalizedStatus === 'SCHEDULED' && (() => {
                            const canConfirm = hasRole(['ROLE_ADMIN']) || user?.role === 'ROLE_ADMIN' || (isDoctor && (user?.id === a.doctorId || user?.username === a.doctorUsername));
                            return canConfirm ? (
                              <button
                                onClick={() => handleStatusChange(a.id, 'CONFIRMED')}
                                className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold flex items-center gap-1 transition shadow-xs text-xs"
                                title={`Confirm Appointment as Attending Doctor (Dr. ${a.doctorName})`}
                              >
                                <Check className="w-3 h-3" /> Confirm
                              </button>
                            ) : (
                              <span 
                                className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-semibold rounded border border-amber-200/80 dark:border-amber-800/80"
                                title={`Awaiting Dr. ${a.doctorName} to confirm this appointment`}
                              >
                                Awaiting Dr.
                              </span>
                            );
                          })()}

                          {/* Complete action */}
                          {(normalizedStatus === 'CONFIRMED' || normalizedStatus === 'SCHEDULED') &&
                            hasRole(['ROLE_DOCTOR', 'ROLE_ADMIN', 'ROLE_RECEPTIONIST']) && (
                              <button
                                onClick={() => handleStatusChange(a.id, 'COMPLETED')}
                                className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-semibold flex items-center gap-1 transition"
                                title="Mark as Completed"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Complete
                              </button>
                            )}

                          {/* Mark No-Show action */}
                          {(normalizedStatus === 'CONFIRMED' || normalizedStatus === 'SCHEDULED') &&
                            hasRole(['ROLE_DOCTOR', 'ROLE_ADMIN', 'ROLE_RECEPTIONIST']) && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Mark appointment for ${a.patientName} as NO_SHOW?`)) {
                                    handleStatusChange(a.id, 'NO_SHOW');
                                  }
                                }}
                                className={`px-2 py-1 rounded font-semibold flex items-center gap-1 transition ${
                                  isPassed
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-200'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                                title="Mark as No Show"
                              >
                                <UserX className="w-3 h-3" /> No-Show
                              </button>
                            )}

                          {/* Cancel action */}
                          {normalizedStatus !== 'CANCELLED' &&
                            normalizedStatus !== 'COMPLETED' &&
                            normalizedStatus !== 'NO_SHOW' && (
                              <button
                                onClick={() => handleCancel(a.id)}
                                className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                                title="Cancel Appointment"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}

                          {/* Completed or Cancelled or No-Show indicator */}
                          {normalizedStatus === 'COMPLETED' && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </span>
                          )}
                          {normalizedStatus === 'NO_SHOW' && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Recorded
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book Appointment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Clinical Consultation"
        maxWidth="max-w-xl"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleBookSubmit} className="space-y-4 text-xs">
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
              <option value="">Select a patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.patientNumber}) - {p.phoneNumber}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Attending Doctor *
              </label>
              {isDoctor ? (
                <div className="w-full px-3 py-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-teal-800 dark:text-teal-200 font-medium text-xs flex items-center gap-1.5">
                  <span>🩺</span>
                  <span>{user?.fullName || 'You'} (Attending Doctor)</span>
                </div>
              ) : (
                <select
                  required
                  value={formData.doctorId}
                  onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                >
                  <option value="">Choose physician</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.fullName} ({d.departmentName || 'Clinic'})</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Appointment Date *
              </label>
              <input
                type="date"
                required
                value={formData.appointmentDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          {/* Time Slot Picker */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Available Time Slots {loadingSlots && '(Loading...)'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.length === 0 ? (
                <div className="col-span-3 text-slate-400 text-center py-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  Select doctor and date to view live available slots
                </div>
              ) : (
                availableSlots.map((s) => (
                  <button
                    type="button"
                    key={s.timeSlot}
                    disabled={!s.available}
                    onClick={() => setFormData({ ...formData, timeSlot: s.timeSlot })}
                    className={`py-2 px-2 rounded-xl text-center font-medium border transition ${
                      !s.available
                        ? 'opacity-40 bg-slate-100 dark:bg-slate-800 border-slate-200 line-through cursor-not-allowed text-slate-400'
                        : formData.timeSlot === s.timeSlot
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-teal-500'
                    }`}
                  >
                    {s.timeSlot}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Consultation Type (SRS Model) *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                <option value="OPD">OPD (Outpatient)</option>
                <option value="FOLLOW_UP">Follow-up Consultation</option>
                <option value="SPECIALIST">Specialist Consultation</option>
                <option value="PROCEDURE">Clinical Procedure</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes / Reason for Visit
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Chest pain evaluation, follow-up"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
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
              Confirm Appointment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AppointmentsPage;
