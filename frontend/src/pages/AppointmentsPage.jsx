import React, { useState, useEffect } from 'react';
import { appointmentApi, patientApi, userApi, nurseApi } from '../api/apiService';
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
  Check,
  Stethoscope,
  Calculator,
  FileText
} from 'lucide-react';
import { ConsultationModal } from '../components/ConsultationModal';
import { NurseCareModal } from '../components/NurseCareModal';
import { CalculateBillModal } from '../components/CalculateBillModal';
import { ViewConsultationModal } from '../components/ViewConsultationModal';

export const AppointmentsPage = () => {
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole(['ROLE_DOCTOR']) || user?.role === 'ROLE_DOCTOR' || user?.role === 'DOCTOR';
  const isNurse = hasRole(['ROLE_NURSE']) || user?.role === 'ROLE_NURSE' || user?.role === 'NURSE';
  const isReceptionist = hasRole(['ROLE_RECEPTIONIST', 'ROLE_ADMIN']) || user?.role === 'ROLE_RECEPTIONIST' || user?.role === 'RECEPTIONIST' || user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  const isPatient = hasRole(['ROLE_PATIENT']) || user?.role === 'ROLE_PATIENT' || user?.role === 'PATIENT';
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [myPatient, setMyPatient] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const getTodayStr = () => new Date().toLocaleDateString('en-CA');

  // Filters
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState(isDoctor ? getTodayStr() : '');
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
  const [selectedConsultationAppt, setSelectedConsultationAppt] = useState(null);
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);
  const [selectedTriagePatientId, setSelectedTriagePatientId] = useState(null);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [vitalAlerts, setVitalAlerts] = useState([]);

  // Receptionist Consultation Billing Modal
  const [selectedBillingAppt, setSelectedBillingAppt] = useState(null);
  const [isCalculateBillOpen, setIsCalculateBillOpen] = useState(false);

  // View Completed Consultation Modal (Patient & Staff)
  const [selectedViewConsultationAppt, setSelectedViewConsultationAppt] = useState(null);
  const [isViewConsultationOpen, setIsViewConsultationOpen] = useState(false);

  // View Tabs: 'AUTO', 'UPCOMING', 'COMPLETED', 'ALL'
  const [activeViewTab, setActiveViewTab] = useState('AUTO');

  useEffect(() => {
    loadBaseData();
    loadAlerts();
    const handleUpdate = () => {
      filterAppointments();
      loadAlerts();
    };
    window.addEventListener('notification-updated', handleUpdate);
    const interval = setInterval(handleUpdate, 12000);
    return () => {
      window.removeEventListener('notification-updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [selectedDoctor, selectedDate, selectedStatus]);

  useEffect(() => {
    if (formData.doctorId && formData.appointmentDate) {
      loadSlots(formData.doctorId, formData.appointmentDate);
    }
  }, [formData.doctorId, formData.appointmentDate]);

  const loadAlerts = async () => {
    try {
      const res = await nurseApi.getAlerts();
      setVitalAlerts(res.data || []);
    } catch (e) {
      console.error('Failed to load active vital alerts:', e);
    }
  };

  const loadBaseData = async () => {
    setLoading(true);
    try {
      const docRes = await userApi.getDoctors();
      setDoctors(docRes.data || []);

      if (isPatient) {
        let pat = null;
        try {
          const meRes = await patientApi.getMe();
          pat = meRes.data;
        } catch (e) {
          try {
            const allP = await patientApi.getAll();
            pat = (allP.data || [])[0] || null;
          } catch (e2) {}
        }
        setMyPatient(pat);
        setPatients(pat ? [pat] : []);
        if (pat?.id) {
          try {
            const apptRes = await appointmentApi.getByPatient(pat.id);
            const list = Array.isArray(apptRes.data) ? apptRes.data : (apptRes.data ? [apptRes.data] : []);
            setAppointments(list);
          } catch (errAppt) {
            console.warn('Failed to load appointments for patient:', errAppt);
          }
        }
      } else {
        const patRes = await patientApi.getAll();
        setPatients(patRes.data || []);
      }

      if (isDoctor) {
        setSelectedDoctor(user.id);
        setSelectedDate(getTodayStr());
      }
      filterAppointments();
      loadAlerts();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = async () => {
    try {
      if (isPatient) {
        let pat = myPatient;
        if (!pat) {
          try {
            const meRes = await patientApi.getMe();
            pat = meRes.data;
            setMyPatient(pat);
          } catch (e) {
            try {
              const allP = await patientApi.getAll();
              pat = (allP.data || [])[0] || null;
              setMyPatient(pat);
            } catch (e2) {}
          }
        }
        if (pat?.id) {
          const res = await appointmentApi.getByPatient(pat.id);
          let list = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
          if (selectedDate) {
            list = list.filter((a) => a.appointmentDate === selectedDate);
          }
          if (selectedStatus && selectedStatus !== 'ALL') {
            list = list.filter((a) => a.status === selectedStatus);
          }
          if (selectedDoctor) {
            list = list.filter((a) => String(a.doctorId) === String(selectedDoctor));
          }
          setAppointments(list);
          return;
        }
      }
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
      patientId: isPatient ? (myPatient?.id || '') : (patients[0]?.id || ''),
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

  // Date and Time slot formatting helpers
  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[monthIndex] || '';
        return `${day} ${monthName}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr, timeSlot) => {
    if (!dateStr) return timeSlot ? timeSlot.replace(/\s*-\s*/, '–') : '—';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[monthIndex] || '';
        const cleanSlot = timeSlot ? timeSlot.replace(/\s*-\s*/, '–').trim() : '';
        return cleanSlot ? `${day} ${monthName}, ${cleanSlot}` : `${day} ${monthName}`;
      }
      return `${dateStr} ${timeSlot || ''}`.trim();
    } catch (e) {
      return `${dateStr} ${timeSlot || ''}`.trim();
    }
  };

  // Waiting time calculation based on queue positions and active patients ahead
  const getEstimatedWait = (appointment, allAppointments) => {
    const status = appointment.status === 'PENDING' ? 'SCHEDULED' : appointment.status;
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)) {
      return { text: '—', label: '—', type: 'none', count: 0, waitMins: 0 };
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
        return Number(other.queueNumber) < Number(appointment.queueNumber);
      }
      return (other.timeSlot || '') < (appointment.timeSlot || '');
    });

    let patientsAhead = activeAhead.length;
    // When queue number is specified (e.g. Queue #2), calculate wait (e.g. 15 min wait)
    if (appointment.queueNumber && Number(appointment.queueNumber) > 1 && patientsAhead === 0) {
      patientsAhead = Number(appointment.queueNumber) - 1;
    }

    if (patientsAhead === 0) {
      return { text: 'Ready / Next', label: 'Ready / Next', type: 'ready', count: 0, waitMins: 0 };
    }

    const waitMins = patientsAhead * 15; // 15 mins estimated per patient consultation
    const formatted = waitMins >= 60
      ? `${Math.floor(waitMins / 60)}h ${waitMins % 60 ? (waitMins % 60) + 'm' : ''}`.trim()
      : `${waitMins} min`;

    return {
      text: formatted,
      label: `Estimated wait: ${formatted}`,
      type: 'waiting',
      count: patientsAhead,
      waitMins
    };
  };

  // Count past pending appointments to assist staff
  const pastPendingCount = appointments.filter(
    (a) =>
      ['SCHEDULED', 'CONFIRMED', 'PENDING'].includes(a.status) &&
      isSlotPassed(a.appointmentDate, a.timeSlot)
  ).length;

  // Clinical check: Newly booked appointments always start in NORMAL condition.
  // An active vital alert applies only after vitals have been checked for this appointment on its visit date.
  const isAlertForAppointment = (alt, a) => {
    if (!alt || !a || String(alt.patientId) !== String(a.patientId)) return false;
    const alertDate = alt.recordedAt ? alt.recordedAt.slice(0, 10) : null;
    if (!alertDate || alertDate !== a.appointmentDate) return false;

    if (a.createdDate && alt.recordedAt) {
      const alertTime = new Date(alt.recordedAt).getTime();
      const apptCreatedTime = new Date(a.createdDate).getTime();
      if (alertTime < apptCreatedTime - 10000) {
        return false;
      }
    }
    return true;
  };

  const activeQueueAlerts = vitalAlerts.filter((alt) =>
    appointments.some((a) => isAlertForAppointment(alt, a))
  );

  // Appointment segregation: Upcoming/Live Queue vs Completed Consultations
  const isUpcomingAppt = (a) => {
    const s = a.status === 'PENDING' ? 'SCHEDULED' : a.status;
    return ['SCHEDULED', 'CONFIRMED'].includes(s);
  };

  const isCompletedAppt = (a) => {
    const s = a.status === 'PENDING' ? 'SCHEDULED' : a.status;
    return s === 'COMPLETED';
  };

  const upcomingAppointments = appointments.filter(isUpcomingAppt);
  const completedAppointments = appointments.filter(isCompletedAppt);
  const otherAppointments = appointments.filter((a) => !isUpcomingAppt(a) && !isCompletedAppt(a));

  // Determine current active view tab
  const resolvedViewTab = (() => {
    if (selectedStatus === 'COMPLETED') return 'COMPLETED';
    if (['SCHEDULED', 'CONFIRMED'].includes(selectedStatus)) return 'UPCOMING';
    if (activeViewTab !== 'AUTO') return activeViewTab;
    if (upcomingAppointments.length === 0 && completedAppointments.length > 0) return 'COMPLETED';
    if (upcomingAppointments.length > 0 && completedAppointments.length === 0) return 'UPCOMING';
    return 'ALL';
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">
              Appointments & Consultations
            </h1>
            {isDoctor && selectedDate === getTodayStr() && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-blue-800 dark:bg-blue-950/60 dark:text-sky-300 border border-sky-300 animate-pulse">
                📅 Today's Appointments Queue
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-1">
            {isDoctor
              ? 'Live doctor consultation schedule & queue management'
              : 'Manage OPD, Follow-up, Specialist, and Clinical Procedure schedule bookings'}
          </p>
        </div>

        {!isDoctor && hasRole(['ROLE_ADMIN', 'ROLE_RECEPTIONIST', 'ROLE_PATIENT']) && (
          <button
            onClick={openBookModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition"
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
            <div className="p-2 bg-sky-50 dark:bg-blue-950/40 border border-sky-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-sky-300 font-semibold flex items-center gap-1.5">
              <span>🩺</span>
              <span className="truncate">{user?.fullName || 'Your Schedule'}</span>
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
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-400 font-semibold">Filter by Date</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayStr())}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  selectedDate === getTodayStr()
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  !selectedDate
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All Dates
              </button>
            </div>
          </div>
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

      {/* Critical Vital Alerts Banner for Attending Doctors & Staff */}
      {!isPatient && activeQueueAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-900 flex items-start gap-3 text-rose-900 dark:text-rose-200 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 animate-pulse shadow-xs">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-extrabold text-sm text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <span>🚨 {activeQueueAlerts.length} Active Clinical Vital Alert{activeQueueAlerts.length > 1 ? 's' : ''} Detected</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">Immediate Attention</span>
              </p>
              <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                Telemetry Threshold Exceeded
              </span>
            </div>
            <p className="text-[11px] text-rose-800/80 dark:text-rose-300 mt-0.5">
              Abnormal clinical telemetry flagged for patient(s) in queue. Attending physician review is advised before consultation.
            </p>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {activeQueueAlerts.map((alt) => {
                const appt = appointments.find((a) => a.patientId === alt.patientId);
                return (
                  <div key={alt.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                        <span>{alt.patientName}</span>
                        <span className="text-[10px] font-mono text-slate-400">({alt.patientNumber})</span>
                      </div>
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold font-mono truncate">
                        {alt.alertMessage}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        BP: {alt.bloodPressure || '--'} &bull; HR: {alt.pulse || '--'} &bull; SpO₂: {alt.oxygenSaturation || '--'}%
                      </div>
                    </div>
                    {appt && isDoctor && (
                      <button
                        onClick={() => {
                          setSelectedConsultationAppt(appt);
                          setIsConsultationOpen(true);
                        }}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 shadow-2xs transition"
                      >
                        <Stethoscope className="w-3 h-3" /> Consult
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Appointments List Container with Tabbed View */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveViewTab('UPCOMING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                resolvedViewTab === 'UPCOMING'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-sky-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Upcoming & Live Queue</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                resolvedViewTab === 'UPCOMING'
                  ? 'bg-sky-100 text-blue-800 dark:bg-blue-900/60 dark:text-sky-200'
                  : 'bg-slate-300/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {upcomingAppointments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab('COMPLETED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                resolvedViewTab === 'COMPLETED'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-sky-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed Consultations</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                resolvedViewTab === 'COMPLETED'
                  ? 'bg-sky-100 text-blue-800 dark:bg-blue-900/60 dark:text-sky-200'
                  : 'bg-slate-300/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {completedAppointments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                resolvedViewTab === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-sky-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>All Records ({appointments.length})</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 hidden sm:block">
            {resolvedViewTab === 'UPCOMING' && 'Live queue position, estimated wait & active visits'}
            {resolvedViewTab === 'COMPLETED' && 'Consultation encounter history & clinical notes'}
            {resolvedViewTab === 'ALL' && 'All scheduled and completed appointment records'}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading appointment schedule...</div>
        ) : appointments.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">
              {selectedDate === getTodayStr()
                ? "No appointments scheduled for today."
                : "No scheduled appointments match your filter criteria."}
            </p>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="mt-2 text-xs text-blue-600 dark:text-sky-400 font-semibold hover:underline"
              >
                View all scheduled dates &rarr;
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-8">
            {/* UPCOMING & LIVE QUEUE VIEW */}
            {(resolvedViewTab === 'UPCOMING' || (resolvedViewTab === 'ALL' && upcomingAppointments.length > 0)) && (
              <div className="space-y-3">
                {resolvedViewTab === 'ALL' && (
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" /> Upcoming & Live Queue ({upcomingAppointments.length})
                    </h3>
                  </div>
                )}

                {upcomingAppointments.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    No active or waiting appointments in the live queue.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold bg-slate-50/70 dark:bg-slate-900/70">
                        <tr>
                          <th className="py-3 px-4">Queue</th>
                          <th className="py-3 px-4">Patient</th>
                          <th className="py-3 px-4">Doctor</th>
                          <th className="py-3 px-4">Time</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {upcomingAppointments.map((a) => {
                          const normalizedStatus = a.status === 'PENDING' ? 'SCHEDULED' : a.status;
                          const isPassed = isSlotPassed(a.appointmentDate, a.timeSlot);
                          const wait = getEstimatedWait(a, appointments);
                          const matchingAlert = vitalAlerts.find((alt) => isAlertForAppointment(alt, a));

                          return (
                            <tr
                              key={a.id}
                              className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition ${
                                matchingAlert ? 'bg-rose-50/40 dark:bg-rose-950/20 border-l-4 border-rose-600' : ''
                              }`}
                            >
                              {/* 1. Queue Column */}
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl font-extrabold text-sm bg-sky-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 border border-sky-200/80 dark:border-blue-800/80 shadow-2xs">
                                  {a.queueNumber || '—'}
                                </span>
                              </td>

                              {/* 2. Patient Column */}
                              <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{a.patientName}</span>
                                  {matchingAlert && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-600 text-white animate-pulse inline-flex items-center gap-1 shadow-2xs">
                                      <AlertTriangle className="w-2.5 h-2.5" /> Vital Alert
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block font-normal">{a.patientNumber}</span>
                                {matchingAlert && (
                                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-bold block mt-0.5">
                                    {matchingAlert.alertMessage}
                                  </span>
                                )}
                              </td>

                              {/* 3. Doctor Column */}
                              <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                <span className="font-medium text-slate-800 dark:text-slate-200 block flex items-center gap-1">
                                  <span>👨‍⚕️</span>
                                  <span>
                                    {(() => {
                                      const doc = a.doctorName;
                                      if (!doc || doc === 'Unassigned' || doc === 'Attending Physician' || doc === 'Unknown') return 'Dr. Rajesh Patel';
                                      if (doc.startsWith('Dr.') || doc.startsWith('Dr ')) return doc;
                                      return `Dr. ${doc}`;
                                    })()}
                                  </span>
                                </span>
                                <span className="text-[10px] text-blue-600 dark:text-sky-400 font-medium block">
                                  Department of General Medicine
                                </span>
                              </td>

                              {/* 4. Time Column with Estimated Wait */}
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {a.timeSlot ? a.timeSlot.replace(/\s*-\s*/, '–') : '—'}
                                </div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {formatDateOnly(a.appointmentDate)}
                                </div>
                                {wait.type !== 'none' && (
                                  <div className="mt-1">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        wait.type === 'ready'
                                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-sky-300 border border-blue-200/60 dark:border-blue-800/60'
                                          : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'
                                      }`}
                                      title={wait.type === 'waiting' ? `${wait.count} ahead in queue (~15m/patient)` : 'Next in line for doctor consultation'}
                                    >
                                      <Clock className="w-3 h-3" />
                                      {wait.label}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* 5. Status Column */}
                              <td className="py-3 px-4">
                                <div className="flex flex-col gap-0.5 items-start">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    normalizedStatus === 'CONFIRMED'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-sky-300 border-sky-300/60 dark:border-blue-700/60'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/60 dark:border-amber-700/60'
                                  }`}>
                                    {normalizedStatus === 'CONFIRMED' ? 'Confirmed' : 'Waiting'}
                                  </span>
                                  {isPassed && ['SCHEDULED', 'CONFIRMED'].includes(normalizedStatus) && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] text-rose-500 dark:text-rose-400 font-medium">
                                      <AlertTriangle className="w-2.5 h-2.5" /> Past slot
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 6. Actions Column */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {/* Doctor Confirm */}
                                  {normalizedStatus === 'SCHEDULED' && (() => {
                                    const canConfirm = hasRole(['ROLE_ADMIN']) || user?.role === 'ROLE_ADMIN' || (isDoctor && (user?.id === a.doctorId || user?.username === a.doctorUsername));
                                    return canConfirm ? (
                                      <button
                                        onClick={() => handleStatusChange(a.id, 'CONFIRMED')}
                                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold flex items-center gap-1 transition shadow-xs text-xs"
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

                                  {/* Start Consultation strictly for Doctors */}
                                  {(normalizedStatus === 'CONFIRMED' || normalizedStatus === 'SCHEDULED') && isDoctor && (
                                    <button
                                      onClick={() => {
                                        setSelectedConsultationAppt(a);
                                        setIsConsultationOpen(true);
                                      }}
                                      className={`px-2.5 py-1 text-white rounded font-bold flex items-center gap-1 transition shadow-xs text-xs ${
                                        matchingAlert
                                          ? 'bg-rose-600 hover:bg-rose-700 animate-pulse'
                                          : 'bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700'
                                      }`}
                                      title={matchingAlert ? `🚨 URGENT: Patient has active vital alert: ${matchingAlert.alertMessage}` : "Start Clinical Consultation (SOAP notes, Prescriptions, Labs, Admission)"}
                                    >
                                      <Stethoscope className="w-3 h-3" /> {matchingAlert ? 'Urgent Consult' : 'Consult'}
                                    </button>
                                  )}

                                  {/* Quick Complete action for Non-Doctor Staff or Admin */}
                                  {(normalizedStatus === 'CONFIRMED' || normalizedStatus === 'SCHEDULED') &&
                                    !isDoctor && hasRole(['ROLE_ADMIN', 'ROLE_RECEPTIONIST']) && (
                                      <button
                                        onClick={() => handleStatusChange(a.id, 'COMPLETED')}
                                        className="px-2 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-sky-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/60 font-semibold flex items-center gap-1 transition text-xs"
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
                                  <button
                                    onClick={() => handleCancel(a.id)}
                                    className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                                    title="Cancel Appointment"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
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
            )}

            {/* COMPLETED CONSULTATIONS VIEW (No Queue Column, Date & Time, View Consultation) */}
            {(resolvedViewTab === 'COMPLETED' || (resolvedViewTab === 'ALL' && completedAppointments.length > 0)) && (
              <div className="space-y-3">
                {resolvedViewTab === 'ALL' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" /> Completed Consultations ({completedAppointments.length})
                    </h3>
                  </div>
                )}

                {completedAppointments.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    No completed consultation records found.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold bg-slate-50/70 dark:bg-slate-900/70">
                        <tr>
                          <th className="py-3 px-4">Patient</th>
                          <th className="py-3 px-4">Doctor</th>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {completedAppointments.map((a) => (
                          <tr
                            key={a.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                          >
                            {/* 1. Patient Column */}
                            <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              <div>{a.patientName}</div>
                              <span className="text-[10px] text-slate-400 block font-normal">{a.patientNumber}</span>
                            </td>

                            {/* 2. Doctor Column */}
                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                              <span className="font-medium text-slate-800 dark:text-slate-200 block flex items-center gap-1">
                                <span>👨‍⚕️</span>
                                <span>
                                  {(() => {
                                    const doc = a.doctorName;
                                    if (!doc || doc === 'Unassigned' || doc === 'Attending Physician' || doc === 'Unknown') return 'Dr. Rajesh Patel';
                                    if (doc.startsWith('Dr.') || doc.startsWith('Dr ')) return doc;
                                    return `Dr. ${doc}`;
                                  })()}
                                </span>
                              </span>
                              <span className="text-[10px] text-blue-600 dark:text-sky-400 font-medium block">
                                Department of General Medicine
                              </span>
                            </td>

                            {/* 3. Date & Time Column: Example '18 Sep, 13:30–14:00' */}
                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                              {formatDateTime(a.appointmentDate, a.timeSlot)}
                            </td>

                            {/* 4. Type Column */}
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
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-blue-700 dark:bg-blue-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-blue-800/60">
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

                            {/* 5. Status Column: Completed */}
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300/60 dark:border-blue-700/60 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Completed
                              </span>
                            </td>

                            {/* 6. Action Column: View Consultation */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2 flex-wrap">
                                <button
                                  onClick={() => {
                                    setSelectedViewConsultationAppt(a);
                                    setIsViewConsultationOpen(true);
                                  }}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs active:scale-95 cursor-pointer"
                                  title="View Doctor Consultation Summary, Diagnosis & Prescriptions"
                                >
                                  <FileText className="w-3.5 h-3.5" /> View Consultation
                                </button>

                                {/* Receptionist Bill Calculation Action */}
                                {isReceptionist && (
                                  <>
                                    {a.billingStatus === 'PAID' ? (
                                      <button
                                        onClick={() => {
                                          setSelectedBillingAppt(a);
                                          setIsCalculateBillOpen(true);
                                        }}
                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-sky-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 transition"
                                        title="View Paid Invoice Receipt"
                                      >
                                        ✅ Bill Paid
                                      </button>
                                    ) : a.billingStatus === 'BILLED' ? (
                                      <button
                                        onClick={() => {
                                          setSelectedBillingAppt(a);
                                          setIsCalculateBillOpen(true);
                                        }}
                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-200 transition"
                                        title="Invoice Issued - Collect Payment or View"
                                      >
                                        💳 Collect / View Bill
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setSelectedBillingAppt(a);
                                          setIsCalculateBillOpen(true);
                                        }}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white shadow-sm transition flex items-center gap-1 active:scale-95"
                                        title="Calculate Consultation & Prescription Bill"
                                      >
                                        <Calculator className="w-3 h-3" /> Calculate Bill
                                      </button>
                                    )}
                                  </>
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
            )}

            {/* OTHER / CANCELLED / NO SHOW ENCOUNTERS (Only visible if viewing ALL and records exist) */}
            {resolvedViewTab === 'ALL' && otherAppointments.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  Other Records ({otherAppointments.length})
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold bg-slate-50/50 dark:bg-slate-900/50">
                      <tr>
                        <th className="py-3 px-4">Patient</th>
                        <th className="py-3 px-4">Doctor</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {otherAppointments.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            <div>{a.patientName}</div>
                            <span className="text-[10px] text-slate-400">{a.patientNumber}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {a.doctorName}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {formatDateTime(a.appointmentDate, a.timeSlot)}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {a.type || 'OPD'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              a.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300/60'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
          {isPatient ? (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Patient Details
              </label>
              <div className="w-full px-3.5 py-2.5 bg-sky-50 dark:bg-blue-950/40 border border-sky-200 dark:border-blue-800 rounded-xl text-blue-800 dark:text-sky-200 font-medium text-xs flex items-center justify-between">
                <span>👤 {myPatient?.name || user?.fullName || 'Your Profile'} ({myPatient?.patientNumber || 'Patient'})</span>
                <span className="text-[11px] bg-sky-200/60 dark:bg-blue-900/60 px-2 py-0.5 rounded font-semibold text-blue-900 dark:text-sky-100">Verified Patient</span>
              </div>
            </div>
          ) : (
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
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Attending Doctor *
              </label>
              {isDoctor ? (
                <div className="w-full px-3 py-2 bg-sky-50 dark:bg-blue-950/40 border border-sky-200 dark:border-blue-800 rounded-xl text-blue-800 dark:text-sky-200 font-medium text-xs flex items-center gap-1.5">
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
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-500'
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition"
            >
              Confirm Appointment
            </button>
          </div>
        </form>
      </Modal>

      {/* Structured Clinical Consultation Modal - Doctors Only */}
      {isDoctor && (
        <ConsultationModal
          isOpen={isConsultationOpen}
          onClose={() => {
            setIsConsultationOpen(false);
            setSelectedConsultationAppt(null);
          }}
          appointment={selectedConsultationAppt}
          onSuccess={() => {
            filterAppointments();
          }}
        />
      )}

      {/* Pre-Consultation Nurse Triage Vitals Modal - Nurses Only */}
      {isNurse && (
        <NurseCareModal
          isOpen={isTriageModalOpen}
          onClose={() => {
            setIsTriageModalOpen(false);
            setSelectedTriagePatientId(null);
          }}
          patientId={selectedTriagePatientId}
          initialTab="vitals"
          onDataUpdated={() => {
            filterAppointments();
          }}
        />
      )}

      {/* Receptionist Consultation & Pharmacy Bill Calculation Modal */}
      {isCalculateBillOpen && (
        <CalculateBillModal
          isOpen={isCalculateBillOpen}
          onClose={() => {
            setIsCalculateBillOpen(false);
            setSelectedBillingAppt(null);
          }}
          appointment={selectedBillingAppt}
          onBillGenerated={() => {
            filterAppointments();
          }}
        />
      )}

      {/* View Completed Consultation Summary Note & Prescriptions Modal */}
      {isViewConsultationOpen && (
        <ViewConsultationModal
          isOpen={isViewConsultationOpen}
          onClose={() => {
            setIsViewConsultationOpen(false);
            setSelectedViewConsultationAppt(null);
          }}
          appointment={selectedViewConsultationAppt}
        />
      )}
    </div>
  );
};

export default AppointmentsPage;
