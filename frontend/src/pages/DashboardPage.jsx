import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  adminApi,
  patientApi,
  appointmentApi,
  recordApi,
  prescriptionApi,
  wardApi,
  labApi,
  billingApi,
  pharmacyApi,
  nurseApi,
} from '../api/apiService';
import { StatCard } from '../components/StatCard';
import { RoleBadge } from '../components/RoleBadge';
import {
  Users,
  Calendar,
  BedDouble,
  Receipt,
  FlaskConical,
  Pill,
  Activity,
  AlertTriangle,
  AlertCircle,
  Clock,
  ArrowRight,
  PlusCircle,
  FileText,
  ShieldAlert,
  Stethoscope,
  HeartPulse,
  CheckCircle2,
  Shield,
  Send,
  CreditCard,
  Calculator,
  User,
  MapPin,
  Phone,
  Mail,
  Printer,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Hash,
  X,
} from 'lucide-react';
import { ConsultationModal } from '../components/ConsultationModal';
import { NurseCareModal } from '../components/NurseCareModal';
import { VitalAlertResponseModal } from '../components/VitalAlertResponseModal';
import { PharmacistDispenseModal } from '../components/PharmacistDispenseModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';

export const DashboardPage = () => {
  const { user, hasRole, logout } = useAuth();
  const navigate = useNavigate();
  const isDoctor = hasRole(['ROLE_DOCTOR']) || user?.role === 'ROLE_DOCTOR' || user?.role === 'DOCTOR';
  const isAdmin = hasRole(['ROLE_ADMIN']) || user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  const isNurse = hasRole(['ROLE_NURSE']) || user?.role === 'ROLE_NURSE' || user?.role === 'NURSE';
  const isReceptionist = hasRole(['ROLE_RECEPTIONIST']) || user?.role === 'ROLE_RECEPTIONIST' || user?.role === 'RECEPTIONIST';
  const isPharmacist = hasRole(['ROLE_PHARMACIST']) || user?.role === 'ROLE_PHARMACIST' || user?.role === 'PHARMACIST';
  const isLabTech = hasRole(['ROLE_LAB_TECHNICIAN']) || user?.role === 'ROLE_LAB_TECHNICIAN' || user?.role === 'LAB_TECHNICIAN';
  const isPatient = hasRole(['ROLE_PATIENT']) || user?.role === 'ROLE_PATIENT' || user?.role === 'PATIENT';

  const [loading, setLoading] = useState(true);
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [allDoctorAppointments, setAllDoctorAppointments] = useState([]);
  const [doctorApptTab, setDoctorApptTab] = useState('ALL'); // 'TODAY', 'UPCOMING', 'PENDING', 'ALL'
  const [inpatientFilter, setInpatientFilter] = useState('ALL'); // 'ALL' or 'MY'
  const [patients, setPatients] = useState([]);
  const [pendingLabs, setPendingLabs] = useState([]);
  const [criticalLabs, setCriticalLabs] = useState([]);
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [lowStockMeds, setLowStockMeds] = useState([]);
  const [wardStats, setWardStats] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [patientBills, setPatientBills] = useState([]);
  const [selectedConsultationAppt, setSelectedConsultationAppt] = useState(null);
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);
  const [doctorVitalAlerts, setDoctorVitalAlerts] = useState([]);
  const [doctorInpatients, setDoctorInpatients] = useState([]);

  // Nurse Dashboard State
  const [nurseDashboard, setNurseDashboard] = useState(null);
  const [selectedNursePatientId, setSelectedNursePatientId] = useState(null);
  const [selectedNursePrescriptionId, setSelectedNursePrescriptionId] = useState(null);
  const [nurseModalTab, setNurseModalTab] = useState('vitals');
  const [isNurseModalOpen, setIsNurseModalOpen] = useState(false);
  const [selectedAlertToRespond, setSelectedAlertToRespond] = useState(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [marFilter, setMarFilter] = useState('ALL'); // 'ALL', 'PENDING', 'GIVEN'
  const [selectedPrescriptionToDispense, setSelectedPrescriptionToDispense] = useState(null);
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTodayStr = () => new Date().toLocaleDateString('en-CA');

  useEffect(() => {
    loadDashboardData();
    const handleUpdate = () => loadDashboardData();
    window.addEventListener('notification-updated', handleUpdate);
    const interval = setInterval(handleUpdate, 12000);
    return () => {
      window.removeEventListener('notification-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const res = await adminApi.getAnalytics();
        setAdminAnalytics(res.data);
      } else if (isDoctor) {
        const [todayRes, allRes, critRes, alertRes, inpatRes] = await Promise.allSettled([
          appointmentApi.getToday(),
          appointmentApi.filter(user?.id, null, null),
          labApi.getCritical(),
          nurseApi.getAlerts(),
          nurseApi.getAssignedPatients(),
        ]);

        const todayData = todayRes.status === 'fulfilled' ? (todayRes.value?.data || []) : [];
        const allData = allRes.status === 'fulfilled' ? (allRes.value?.data || []) : [];
        const inpatients = inpatRes.status === 'fulfilled' 
          ? (inpatRes.value?.data || []).filter(p => p.status !== 'DISCHARGED' && p.status !== 'OUTPATIENT' && p.patientStatus !== 'DISCHARGED' && p.patientStatus !== 'OUTPATIENT')
          : [];
        if (inpatRes.status === 'fulfilled') setDoctorInpatients(inpatients);

        // Union both datasets by ID so no appointment is ever omitted
        const todayStr = getTodayStr();
        const mergedMap = new Map();
        allData.forEach((a) => mergedMap.set(a.id, a));
        todayData.forEach((a) => mergedMap.set(a.id, a));
        const combinedAll = Array.from(mergedMap.values()).sort((a, b) => {
          if (a.appointmentDate !== b.appointmentDate) {
            return b.appointmentDate.localeCompare(a.appointmentDate);
          }
          return (a.timeSlot || '').localeCompare(b.timeSlot || '');
        });

        const todayAppts = combinedAll.filter(
          (a) => a.appointmentDate === todayStr || todayData.some((t) => t.id === a.id)
        );

        setAppointments(todayAppts);
        setAllDoctorAppointments(combinedAll);

        if (critRes.status === 'fulfilled') setCriticalLabs(critRes.value?.data || []);
        if (alertRes.status === 'fulfilled') setDoctorVitalAlerts(alertRes.value?.data || []);
      } else if (isNurse) {
        const [nurseRes, wardRes] = await Promise.all([
          nurseApi.getDashboard(),
          wardApi.getStats(),
        ]);
        setNurseDashboard(nurseRes.data);
        setWardStats(wardRes.data);
      } else if (isReceptionist) {
        const [patRes, appRes, wardRes] = await Promise.all([
          patientApi.getAll(),
          appointmentApi.filter(null, new Date().toISOString().split('T')[0], null),
          wardApi.getStats(),
        ]);
        setPatients(patRes.data || []);
        setAppointments(appRes.data || []);
        setWardStats(wardRes.data);
      } else if (isPharmacist) {
        const [prescRes, lowRes] = await Promise.all([
          prescriptionApi.getPending(),
          pharmacyApi.getLowStock(),
        ]);
        setPendingPrescriptions(prescRes.data || []);
        setLowStockMeds(lowRes.data || []);
      } else if (isLabTech) {
        const [pendingRes, critRes] = await Promise.all([
          labApi.getPending(),
          labApi.getCritical(),
        ]);
        setPendingLabs(pendingRes.data || []);
        setCriticalLabs(critRes.data || []);
      } else if (isPatient) {
        // Patient dashboard
        let patientObj = null;
        try {
          const meRes = await patientApi.getMe();
          patientObj = meRes.data;
        } catch (e) {
          try {
            const patRes = await patientApi.search(user?.username || '');
            if (patRes.data && patRes.data.length > 0) {
              patientObj = patRes.data[0];
            } else {
              const allPats = await patientApi.getAll();
              patientObj = (allPats.data || []).find(
                (p) =>
                  (p.userId && String(p.userId) === String(user.id)) ||
                  (p.name && p.name.toLowerCase() === user.username?.toLowerCase()) ||
                  (user.fullName && p.name && p.name.toLowerCase() === user.fullName.toLowerCase())
              ) || (allPats.data || [])[0];
            }
          } catch (err2) {
            console.warn('Could not load patient profile:', err2);
          }
        }

        if (patientObj) {
          setPatientDetails(patientObj);
          const [histRes, billsRes, apptsRes] = await Promise.all([
            patientApi.getHistory(patientObj.id).catch(() => ({ data: null })),
            billingApi.getByPatient(patientObj.id).catch(() => ({ data: [] })),
            appointmentApi.getByPatient(patientObj.id).catch(() => ({ data: [] })),
          ]);
          setPatientHistory(histRes.data);
          setPatientBills(billsRes.data || []);
          const apptList = Array.isArray(apptsRes.data) ? apptsRes.data : (apptsRes.data ? [apptsRes.data] : []);
          setAppointments(apptList);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allDoctorAppointments.length > 0) {
      const todayStr = getTodayStr();
      const hasToday = allDoctorAppointments.some((a) => a.appointmentDate === todayStr);
      if (hasToday && appointments.length > 0) {
        setDoctorApptTab('TODAY');
      } else {
        setDoctorApptTab('ALL');
      }
    }
  }, [allDoctorAppointments.length]);

  const handleStartAlertConsult = async (alt) => {
    let appt = appointments.find((a) => a.patientId === alt.patientId);
    if (!appt && alt.patientId) {
      try {
        const res = await appointmentApi.getByPatient(alt.patientId);
        const list = res.data || [];
        const active = list.find((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED');
        if (active) appt = active;
      } catch (err) {
        console.warn('Could not fetch patient appointments for alert consultation:', err);
      }
    }
    setSelectedConsultationAppt(
      appt || {
        id: null,
        patientId: alt.patientId,
        patientName: alt.patientName,
        patientNumber: alt.patientNumber,
        notes: `Urgent clinical review for vital alert: ${alt.alertMessage}`,
      }
    );
    setIsConsultationOpen(true);
  };

  const COLORS = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];
  const VIBRANT_CHART_COLORS = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];

  // Clinical check: Newly booked appointments start in NORMAL condition.
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

  const activeDoctorQueueAlerts = doctorVitalAlerts.filter((alt) => {
    if (!alt || !alt.patientId) return false;
    const isApptPatient = allDoctorAppointments.some((a) => String(a.patientId) === String(alt.patientId));
    const isInpatient = doctorInpatients.some((p) => String(p.patientId) === String(alt.patientId));
    return isApptPatient || isInpatient;
  });

  const curToday = getTodayStr();
  const upcomingAppointments = allDoctorAppointments.filter(
    (a) => a.appointmentDate >= curToday && a.status !== 'CANCELLED' && a.status !== 'COMPLETED'
  );
  const pendingAppointments = allDoctorAppointments.filter(
    (a) => a.status === 'SCHEDULED' || a.status === 'PENDING'
  );
  const myInpatients = doctorInpatients.filter(
    (p) => !p.attendingDoctorId || String(p.attendingDoctorId) === String(user?.id)
  );

  const displayedAppointments = (() => {
    if (doctorApptTab === 'TODAY') {
      return allDoctorAppointments.filter(
        (a) => a.appointmentDate === curToday || appointments.some((t) => t.id === a.id)
      );
    }
    if (doctorApptTab === 'UPCOMING') {
      return upcomingAppointments;
    }
    if (doctorApptTab === 'PENDING') {
      return pendingAppointments;
    }
    return allDoctorAppointments; // 'ALL'
  })();

  const displayedInpatients = inpatientFilter === 'MY' ? myInpatients : doctorInpatients;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 lg:p-8 text-white shadow-2xl relative overflow-hidden border border-sky-500/30 backdrop-blur-xl">
        <div className="absolute -right-12 -top-12 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 opacity-15 flex items-center pointer-events-none mr-8">
          <Activity className="w-64 h-64 text-cyan-400" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/20 to-cyan-500/20 border border-cyan-400/40 text-[11px] font-black uppercase tracking-wider text-cyan-300 backdrop-blur-md shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  {isPatient
                    ? 'HealthCare Patient Portal'
                    : isDoctor
                    ? 'HealthCare Clinical Command'
                    : isAdmin
                    ? 'HealthCare Hospital Administration'
                    : 'HealthCare Staff Portal'}
                </span>
                <RoleBadge role={user?.role} />
              </div>
              <h1 className="text-2xl lg:text-4xl font-black tracking-tight font-display">
                {isPatient ? (
                  <span>Hello, <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-sky-300 bg-clip-text text-transparent">{user?.fullName || 'Patient'}</span></span>
                ) : (
                  <span>Welcome back, <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-sky-300 bg-clip-text text-transparent">{user?.fullName || 'Staff'}</span></span>
                )}
              </h1>
              <div className="flex items-center gap-2 mt-2 text-slate-300 text-xs sm:text-sm flex-wrap">
                <span className="text-sky-100/90">{isPatient ? 'Personal Health Record, Real-time OPD Tokens & Care Team' : 'Hospital Core System Operational'}</span>
                {!isPatient && (
                  <>
                    <span className="text-sky-400/60">&bull;</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-sky-500/25 text-sky-200 font-bold text-xs border border-sky-400/40 backdrop-blur-sm">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      Department: {user?.departmentName || (isDoctor ? 'Clinical Medicine' : 'General Operations')}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/10 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/20 text-xs shadow-lg flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 flex-shrink-0 shadow-xs">
                  <Clock className="w-4 h-4 text-cyan-300" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-cyan-300/90 text-[10px] font-black uppercase tracking-wider">Date & Time</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-black text-white text-sm whitespace-nowrap">
                      {currentDateTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="text-cyan-200/50 font-light">&bull;</span>
                    <span className="text-cyan-200 font-extrabold text-sm tabular-nums tracking-wide">
                      {currentDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. ADMIN DASHBOARD */}
      {/* ========================================================= */}
      {isAdmin && adminAnalytics && !isPatient && !isDoctor && (
        <div className="space-y-6">

          {/* Top Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Registered Patients"
              value={adminAnalytics.totalPatients}
              icon={Users}
              color="blue"
              subtitle="Active hospital records"
            />
            <StatCard
              title="Active Doctor Staff"
              value={adminAnalytics.totalDoctors}
              icon={Activity}
              color="sky"
              subtitle={`${adminAnalytics.totalStaff} auxiliary staff`}
            />
            <StatCard
              title="Bed Occupancy"
              value={`${adminAnalytics.bedOccupancyPercentage}%`}
              icon={BedDouble}
              color={adminAnalytics.bedOccupancyPercentage > 85 ? 'rose' : 'amber'}
              subtitle={`${adminAnalytics.occupiedBeds} of ${adminAnalytics.totalBeds} beds occupied`}
            />
            <StatCard
              title="Total Revenue Collected"
              value={`₹${adminAnalytics.totalRevenue ? Number(adminAnalytics.totalRevenue).toLocaleString('en-IN') : '0'}`}
              icon={Receipt}
              color="sky"
              subtitle={`₹${adminAnalytics.outstandingBalance ? Number(adminAnalytics.outstandingBalance).toLocaleString('en-IN') : '0'} pending`}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Department Distribution Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 font-display flex items-center justify-between">
                <span>Clinical Department Staffing</span>
                <span className="text-xs font-normal text-slate-400">Headcount</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(adminAnalytics.departmentStats || {}).map(([name, count]) => ({ name, count }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415520" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {Object.entries(adminAnalytics.departmentStats || {}).map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={VIBRANT_CHART_COLORS[index % VIBRANT_CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Appointment Status Pie */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 font-display">
                Appointment Breakdown
              </h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(adminAnalytics.appointmentStats || {}).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {Object.keys(adminAnalytics.appointmentStats || {}).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent System Activity Logs */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                Real-Time Clinical & System Activity
              </h3>
              <Link to="/admin" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                View Full Audit Logs <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {adminAnalytics.recentActivities?.slice(0, 5).map((act, i) => (
                <div key={i} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                      {act.type?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{act.title}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-md">{act.description}</p>
                    </div>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. DOCTOR DASHBOARD */}
      {/* ========================================================= */}
      {isDoctor && (
        <div className="space-y-6">
          {/* Critical Vital-Sign Telemetry Alerts Banner for Doctors */}
          {activeDoctorQueueAlerts.length > 0 && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/10 border-2 border-rose-500/40 dark:border-rose-500/30 text-slate-800 dark:text-slate-100 shadow-lg shadow-rose-500/5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-600/30 animate-pulse">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-rose-700 dark:text-rose-400 font-display flex items-center gap-2">
                      <span>🚨 Critical Vital-Sign Telemetry Alerts ({activeDoctorQueueAlerts.length} Active in Queue)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">Immediate Attention</span>
                    </h3>
                    <p className="text-xs text-rose-800/80 dark:text-rose-300">
                      Abnormal physiological observations detected requiring attending physician review and clinical response.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {activeDoctorQueueAlerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-rose-200 dark:border-rose-900/60 shadow-xs flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                          {alt.patientName} <span className="text-slate-400 font-normal font-mono">({alt.patientNumber})</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                          {alt.wardName && alt.wardName !== 'N/A' ? `${alt.wardName} - Bed ${alt.bedNumber}` : 'Clinical Alert'}
                        </span>
                      </div>
                      <p className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                        {alt.alertMessage}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 font-mono flex-wrap">
                        <span>T: <strong>{alt.temperature || '--'}°F</strong></span>
                        <span>BP: <strong>{alt.bloodPressure || '--'}</strong></span>
                        <span>HR: <strong>{alt.pulse || '--'} bpm</strong></span>
                        <span className="font-bold text-rose-600">SpO₂: {alt.oxygenSaturation || '--'}%</span>
                        <span className="text-[10px] text-slate-400 ml-auto">
                          Nurse: {alt.recordedByName || 'Staff'} &bull; {new Date(alt.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleStartAlertConsult(alt)}
                        className="px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1 transition"
                      >
                        <Stethoscope className="w-3.5 h-3.5" /> Consult / Review
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAlertToRespond(alt);
                          setIsAlertModalOpen(true);
                        }}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1 transition"
                      >
                        <HeartPulse className="w-3.5 h-3.5" /> Acknowledge Alert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critical Lab Alert Banner if any */}
          {criticalLabs.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-3 text-rose-800 dark:text-rose-200">
              <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <p className="font-bold">CRITICAL CLINICAL ALERT: {criticalLabs.length} test result(s) require urgent review</p>
                <div className="mt-1 space-y-1">
                  {criticalLabs.map((c) => (
                    <div key={c.id}>
                      Order #{c.labOrderId}: Result is <span className="font-bold underline">{c.resultValue} {c.unit}</span> (Ref: {c.referenceRange}) &bull; Verified by {c.verifiedBy}
                    </div>
                  ))}
                </div>
              </div>
              <Link
                to="/lab"
                className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700"
              >
                Review Lab
              </Link>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Today's Queue"
              value={appointments.length}
              icon={Calendar}
              color="sky"
              subtitle={`${allDoctorAppointments.length} total on schedule`}
            />
            <StatCard
              title="Upcoming Schedule"
              value={upcomingAppointments.length}
              icon={Clock}
              color="blue"
              subtitle="Scheduled OPD / IPD visits"
            />
            <StatCard
              title="Pending Approval"
              value={pendingAppointments.length}
              icon={AlertCircle}
              color={pendingAppointments.length > 0 ? "amber" : "blue"}
              subtitle={pendingAppointments.length > 0 ? "Awaiting doctor confirmation" : "Schedule fully confirmed"}
            />
            <StatCard
              title="Admitted Inpatients"
              value={doctorInpatients.length}
              icon={BedDouble}
              color="indigo"
              subtitle={`${myInpatients.length} under direct care`}
            />
          </div>

          {/* Doctor Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500/10 via-white to-blue-500/5 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 p-5 rounded-3xl border border-blue-200 dark:border-blue-800/80 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm font-display">
                  Start Consultation
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Launch active OPD session, record vitals, write clinical notes & e-prescriptions.
                </p>
              </div>
              <button
                onClick={() => {
                  const targetAppt = appointments[0] || upcomingAppointments[0];
                  if (targetAppt) {
                    setSelectedConsultationAppt(targetAppt);
                    setIsConsultationOpen(true);
                  } else {
                    setDoctorApptTab('TODAY');
                  }
                }}
                className="mt-4 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Stethoscope className="w-4 h-4" /> Begin Visit
              </button>
            </div>

            <div className="bg-gradient-to-br from-sky-500/10 via-white to-sky-500/5 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 p-5 rounded-3xl border border-blue-200 dark:border-blue-800/80 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center mb-3">
                  <BedDouble className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm font-display">
                  Inpatient Care Wards
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Assign clinical ward beds, allocate patient rooms, and manage inpatient admissions.
                </p>
              </div>
              <Link
                to="/wards"
                className="mt-4 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition flex items-center justify-center gap-1.5"
              >
                <BedDouble className="w-4 h-4" /> Manage Wards
              </Link>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 via-white to-purple-500/5 dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 p-5 rounded-3xl border border-purple-200 dark:border-purple-800/80 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm font-display">
                  Clinical Lab Orders
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Review laboratory test panels, verify abnormal specimen flags, and monitor pending cultures.
                </p>
              </div>
              <Link
                to="/lab"
                className="mt-4 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition flex items-center justify-center gap-1.5"
              >
                <FlaskConical className="w-4 h-4" /> View Lab Tests
              </Link>
            </div>

            <div className="bg-gradient-to-br from-rose-500/10 via-white to-rose-500/5 dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-900 p-5 rounded-3xl border border-rose-200 dark:border-rose-800/80 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm font-display">
                  Vital Alerts Radar
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Live real-time clinical monitoring of abnormal blood pressure, SpO2, and cardiac alerts.
                </p>
              </div>
              <button
                onClick={() => {
                  if (doctorVitalAlerts.length > 0) {
                    handleSelectAlertConsultation(doctorVitalAlerts[0]);
                  } else {
                    setDoctorApptTab('TODAY');
                  }
                }}
                className="mt-4 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HeartPulse className="w-4 h-4" /> Inspect Vitals ({doctorVitalAlerts.length})
              </button>
            </div>
          </div>

          {/* Doctor Visual Clinical Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Consultation Caseload Bar Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                    Consultation Caseload Breakdown
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Real-time distribution of patient appointments & clinical care</p>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {allDoctorAppointments.length} Active Records
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Today Queue", count: appointments.length },
                      { name: "Upcoming", count: upcomingAppointments.length },
                      { name: "Pending", count: pendingAppointments.length },
                      { name: "Completed", count: allDoctorAppointments.filter(a => a.status === 'COMPLETED').length },
                      { name: "Inpatients", count: doctorInpatients.length },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415520" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {[
                        { name: "Today Queue" },
                        { name: "Upcoming" },
                        { name: "Pending" },
                        { name: "Completed" },
                        { name: "Inpatients" }
                      ].map((entry, index) => (
                        <Cell key={`doc-bar-${index}`} fill={VIBRANT_CHART_COLORS[index % VIBRANT_CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inpatient Distribution Donut Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                  Inpatient Care Flow
                </h3>
                <span className="text-xs text-slate-400">{doctorInpatients.length} Inpatients</span>
              </div>
              <div className="h-64 flex items-center justify-center">
                {doctorInpatients.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <BedDouble className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    No inpatients currently admitted under your direct care
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const counts = {};
                          doctorInpatients.forEach(p => {
                            const ward = p.wardName || 'General Ward';
                            counts[ward] = (counts[ward] || 0) + 1;
                          });
                          return Object.entries(counts).map(([name, value]) => ({ name, value }));
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {VIBRANT_CHART_COLORS.map((color, index) => (
                          <Cell key={`doc-pie-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Consultation Schedule with Interactive Tabs */}
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-7 backdrop-blur-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-display">
                    Doctor Consultation Schedule
                  </h3>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300/80 shadow-xs">
                    Dr. {user?.fullName || 'Doctor'}
                  </span>
                  {user?.departmentName && (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-blue-800 dark:bg-blue-950/70 dark:text-sky-300 border border-sky-300/80 shadow-xs">
                      {user.departmentName}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Showing appointments schedule, consultations, and approvals
                </p>
              </div>

              {/* View Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl flex-wrap">
                <button
                  onClick={() => setDoctorApptTab('TODAY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    doctorApptTab === 'TODAY'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Today's Queue</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    doctorApptTab === 'TODAY'
                      ? 'bg-sky-100 dark:bg-blue-950/80 text-blue-800 dark:text-sky-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {appointments.length}
                  </span>
                </button>

                <button
                  onClick={() => setDoctorApptTab('UPCOMING')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    doctorApptTab === 'UPCOMING'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Upcoming</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    doctorApptTab === 'UPCOMING'
                      ? 'bg-sky-100 dark:bg-blue-950/80 text-blue-800 dark:text-sky-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {upcomingAppointments.length}
                  </span>
                </button>

                <button
                  onClick={() => setDoctorApptTab('PENDING')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    doctorApptTab === 'PENDING'
                      ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Pending Approval</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    doctorApptTab === 'PENDING'
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {pendingAppointments.length}
                  </span>
                </button>

                <button
                  onClick={() => setDoctorApptTab('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    doctorApptTab === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>All ({allDoctorAppointments.length})</span>
                </button>

                <Link
                  to="/appointments"
                  className="px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-sky-400 hover:underline ml-1"
                  title="Open full appointment calendar"
                >
                  Full Page &rarr;
                </Link>
              </div>
            </div>

            {displayedAppointments.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p>No appointments found in this view.</p>
                {allDoctorAppointments.length > 0 && doctorApptTab !== 'ALL' && (
                  <button
                    onClick={() => setDoctorApptTab('ALL')}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    Click to view all {allDoctorAppointments.length} appointments on record &rarr;
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-2">Queue</th>
                      <th className="py-3 px-2">Patient</th>
                      <th className="py-3 px-2">Date & Slot</th>
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedAppointments.map((a) => {
                      const matchingAlert = doctorVitalAlerts.find((alt) => isAlertForAppointment(alt, a));
                      const isTodayAppt = a.appointmentDate === curToday;
                      return (
                        <tr
                          key={a.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition ${
                            matchingAlert ? 'bg-rose-50/50 dark:bg-rose-950/20 border-l-4 border-rose-600' : ''
                          }`}
                        >
                          <td className="py-3 px-2 font-bold text-blue-600">{a.queueNumber || a.id}</td>
                          <td className="py-3 px-2 font-semibold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{a.patientName}</span>
                              <span className="text-slate-400 font-normal">({a.patientNumber || `P#${a.patientId}`})</span>
                              {isTodayAppt && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300">
                                  Today
                                </span>
                              )}
                              {matchingAlert && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-600 text-white animate-pulse inline-flex items-center gap-1 shadow-2xs">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Vital Alert
                                </span>
                              )}
                            </div>
                            {matchingAlert && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-bold mt-0.5">
                                {matchingAlert.alertMessage}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-2 text-slate-500">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{a.appointmentDate}</span> &bull; {a.timeSlot}
                          </td>
                          <td className="py-3 px-2 font-medium">{a.type || 'OPD'}</td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-sky-300' :
                              a.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                              a.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                              a.status === 'NO_SHOW' ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {a.status === 'PENDING' ? 'SCHEDULED' : a.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Start Consultation button for active appointments */}
                              {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW' && (
                                <button
                                  onClick={() => {
                                    setSelectedConsultationAppt(a);
                                    setIsConsultationOpen(true);
                                  }}
                                  className={`px-3 py-1 text-white rounded-lg font-bold text-[11px] shadow-xs flex items-center gap-1 transition ${
                                    matchingAlert
                                      ? 'bg-rose-600 hover:bg-rose-700 animate-pulse'
                                      : 'bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700'
                                  }`}
                                  title={matchingAlert ? `🚨 URGENT: Active vital alert: ${matchingAlert.alertMessage}` : "Start structured clinical consultation (SOAP, Prescriptions, Lab orders, Admission)"}
                                >
                                  <Stethoscope className="w-3.5 h-3.5" /> {matchingAlert ? 'Urgent Consult' : 'Start Consultation'}
                                </button>
                              )}

                              {a.status === 'COMPLETED' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  ✓ Consulted
                                </span>
                              )}

                              {(a.status === 'SCHEDULED' || a.status === 'PENDING') && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await appointmentApi.updateStatus(a.id, 'CONFIRMED');
                                      window.dispatchEvent(new Event('notification-updated'));
                                      loadDashboardData();
                                    } catch (err) {
                                      alert(err.response?.data?.message || 'Failed to confirm appointment');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-[11px] transition shadow-xs"
                                  title="Confirm this appointment as attending doctor"
                                >
                                  Confirm
                                </button>
                              )}
                              <Link
                                to={`/patients/${a.patientId}`}
                                className="px-2.5 py-1 bg-sky-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 rounded-lg hover:bg-sky-100 font-semibold text-[11px]"
                              >
                                Chart
                              </Link>
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

          {/* Admitted Inpatients & Ward Rounds Tracker */}
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-7 backdrop-blur-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-display">
                    Admitted Ward Inpatients & Bedside Vitals
                  </h3>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-blue-800 dark:bg-blue-950/70 dark:text-sky-300 border border-sky-300/80 shadow-xs">
                    {displayedInpatients.length} Inpatients
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Hospital Protocol: Duty nurses check and record bedside vitals. Vitals become visible to doctors after nurse examination.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setInpatientFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      inpatientFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All Beds ({doctorInpatients.length})
                  </button>
                  <button
                    onClick={() => setInpatientFilter('MY')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      inpatientFilter === 'MY'
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    My Patients ({myInpatients.length})
                  </button>
                </div>
                <Link to="/wards" className="text-xs font-semibold text-blue-600 dark:text-sky-400 hover:underline">
                  View Ward Matrix &rarr;
                </Link>
              </div>
            </div>

            {displayedInpatients.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                {inpatientFilter === 'MY' ? 'No inpatients assigned directly to your attending profile.' : 'No inpatients currently admitted in hospital wards.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-3">Patient</th>
                      <th className="py-3 px-2">Ward & Bed</th>
                      <th className="py-3 px-2">Indication / Diagnosis</th>
                      <th className="py-3 px-3">Nurse Checked Vitals</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedInpatients.map((p) => {
                      const hasVitals = !!p.latestVitals;
                      const isMyPatient = !p.attendingDoctorId || String(p.attendingDoctorId) === String(user?.id);
                      return (
                        <tr key={p.patientId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{p.patientName}</span>
                              {isMyPatient && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300">
                                  My Patient
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{p.patientNumber} &bull; {p.age}y {p.gender}</div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-blue-950/60 text-blue-800 dark:text-sky-300 font-bold text-[11px] border border-sky-200 dark:border-blue-800 font-mono">
                              {p.wardName} - Bed {p.bedNumber}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {p.diagnosis || 'Inpatient Observation'}
                          </td>
                          <td className="py-3 px-3">
                            {hasVitals ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-sky-300 border border-sky-300">
                                    ✓ Checked by Nurse {p.latestVitals.recordedByName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {new Date(p.latestVitals.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                                  <span>T: {p.latestVitals.temperature ? `${p.latestVitals.temperature}°F` : '--'}</span>
                                  <span>BP: {p.latestVitals.bloodPressure || '--'}</span>
                                  <span>HR: {p.latestVitals.pulse || '--'}</span>
                                  <span className={p.latestVitals.oxygenSaturation < 92 ? 'text-rose-600 font-extrabold' : ''}>
                                    SpO₂: {p.latestVitals.oxygenSaturation ? `${p.latestVitals.oxygenSaturation}%` : '--'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                Awaiting Duty Nurse Check
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedNursePatientId(p.patientId);
                                  setNurseModalTab('vitals');
                                  setIsNurseModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-[11px] transition"
                              >
                                Vitals History
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedNursePatientId(p.patientId);
                                  setNurseModalTab('mar');
                                  setIsNurseModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-sky-300 hover:bg-blue-100 rounded-lg font-semibold text-[11px] transition flex items-center gap-1"
                              >
                                <Pill className="w-3 h-3" /> Check Doses (MAR)
                              </button>
                              <Link
                                to={`/patients/${p.patientId}`}
                                className="px-2.5 py-1 bg-sky-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 rounded-lg hover:bg-sky-100 font-semibold text-[11px]"
                              >
                                Full Chart
                              </Link>
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
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. NURSE DASHBOARD - SRS CLINICAL OPERATIONS */}
      {/* ========================================================= */}
      {isNurse && (
        <div className="space-y-6">

          {/* A. VITAL-SIGN ALERTS BANNER (SRS #8) */}
          {nurseDashboard?.activeAlerts?.length > 0 && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/10 border-2 border-rose-500/40 dark:border-rose-500/30 text-slate-800 dark:text-slate-100 shadow-lg shadow-rose-500/5 space-y-3 animate-pulse">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-600/30">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-rose-700 dark:text-rose-400 font-display">
                      🚨 Critical Vital-Sign Telemetry Alerts ({nurseDashboard.activeAlerts.length} Unacknowledged)
                    </h3>
                    <p className="text-xs text-rose-800/80 dark:text-rose-300">
                      Abnormal physiological observations detected in assigned ward patients requiring immediate nursing triage.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {nurseDashboard.activeAlerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-rose-200 dark:border-rose-900/60 shadow-xs flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                          {alt.patientName} <span className="text-slate-400 font-normal font-mono">({alt.patientNumber})</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                          Bed {alt.bedNumber} &bull; {alt.wardName}
                        </span>
                      </div>
                      <p className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                        {alt.alertMessage}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 font-mono">
                        <span>T: {alt.temperature || '--'}°F</span>
                        <span>BP: {alt.bloodPressure || '--'}</span>
                        <span>HR: {alt.pulse || '--'}</span>
                        <span className="font-bold text-rose-600">SpO₂: {alt.oxygenSaturation || '--'}%</span>
                        <span className="text-[10px] text-slate-400 ml-auto">
                          {new Date(alt.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setSelectedNursePatientId(alt.patientId);
                          setNurseModalTab('vitals');
                          setIsNurseModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      >
                        Inspect Chart
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAlertToRespond(alt);
                          setIsAlertModalOpen(true);
                        }}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1 transition"
                      >
                        <HeartPulse className="w-3.5 h-3.5" /> Respond to Alert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* B. 4 CLINICAL STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Assigned Ward Patients"
              value={nurseDashboard?.assignedPatientsCount || 0}
              icon={Users}
              color="blue"
              subtitle="Inpatients under nursing care"
            />
            <StatCard
              title="Vital-Sign Alerts"
              value={nurseDashboard?.activeAlertsCount || 0}
              icon={AlertTriangle}
              color={nurseDashboard?.activeAlertsCount > 0 ? 'rose' : 'blue'}
              subtitle={nurseDashboard?.activeAlertsCount > 0 ? 'Action required immediately' : 'All observations stable'}
            />
            <StatCard
              title="Medication Doses Today"
              value={`${nurseDashboard?.givenDosesTodayCount || 0} / ${(nurseDashboard?.givenDosesTodayCount || 0) + (nurseDashboard?.pendingDosesTodayCount || 0)}`}
              icon={Pill}
              color="sky"
              subtitle={`${nurseDashboard?.pendingDosesTodayCount || 0} doses pending administration`}
            />
            <StatCard
              title="Ward Capacity Rate"
              value={`${wardStats ? Math.round(wardStats.occupancyRate) : 0}%`}
              icon={BedDouble}
              color="amber"
              subtitle={`${wardStats?.occupiedBeds || 0} of ${wardStats?.totalBeds || 0} beds assigned`}
            />
          </div>

          {/* Nurse Visual Care Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MAR Medication Progress Donut */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                    Medication Administration (MAR) Today
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Progress of scheduled medication doses across ward</p>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-sky-300 border border-blue-200 dark:border-blue-800">
                  {(nurseDashboard?.givenDosesTodayCount || 0) + (nurseDashboard?.pendingDosesTodayCount || 0)} Total Doses
                </span>
              </div>
              <div className="h-56 flex items-center justify-center">
                {((nurseDashboard?.givenDosesTodayCount || 0) + (nurseDashboard?.pendingDosesTodayCount || 0)) === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <Pill className="w-7 h-7 mx-auto mb-1.5 text-slate-300 dark:text-slate-600" />
                    No medication doses scheduled today
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Administered', value: nurseDashboard?.givenDosesTodayCount || 0 },
                          { name: 'Pending / Due', value: nurseDashboard?.pendingDosesTodayCount || 0 },
                          { name: 'Vital Alerts', value: nurseDashboard?.activeAlertsCount || 0 },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {['#10b981', '#3b82f6', '#f43f5e'].map((color, index) => (
                          <Cell key={`mar-pie-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Ward Bed Capacity Donut */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                    Ward Bed Capacity & Occupancy
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Current bed utilization across hospital inpatient wards</p>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {wardStats?.totalBeds || 0} Total Beds
                </span>
              </div>
              <div className="h-56 flex items-center justify-center">
                {!wardStats || wardStats.totalBeds === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <BedDouble className="w-7 h-7 mx-auto mb-1.5 text-slate-300 dark:text-slate-600" />
                    No ward beds registered in system
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Occupied Beds', value: wardStats.occupiedBeds || 0 },
                          { name: 'Available Beds', value: Math.max(0, wardStats.totalBeds - (wardStats.occupiedBeds || 0)) },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {['#6366f1', '#06b6d4'].map((color, index) => (
                          <Cell key={`bed-pie-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* C. ASSIGNED WARD PATIENTS ROSTER (SRS #1, #2, #3, #4, #7, #9, #10) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                    Assigned Ward Inpatients
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300 border border-sky-300">
                    {nurseDashboard?.assignedPatients?.length || 0} Patients Admitted
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/wards"
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <BedDouble className="w-3.5 h-3.5 text-blue-600" /> Ward Matrix
                </Link>
                <Link
                  to="/patients"
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" /> All Patients
                </Link>
              </div>
            </div>

            {(!nurseDashboard?.assignedPatients || nurseDashboard.assignedPatients.length === 0) ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <BedDouble className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                No patients currently allocated to ward beds. Patients admitted via doctor admission orders will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Bed & Unit</th>
                      <th className="py-3 px-3">Patient Details</th>
                      <th className="py-3 px-2">Demographics</th>
                      <th className="py-3 px-3">Admission Indication</th>
                      <th className="py-3 px-3">Attending Physician</th>
                      <th className="py-3 px-3">Latest Vitals</th>
                      <th className="py-3 px-3 text-right">Care Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {nurseDashboard.assignedPatients.map((p) => (
                      <tr
                        key={p.patientId}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition cursor-pointer ${
                          p.hasActiveAlert ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                        }`}
                        onClick={() => {
                          setSelectedNursePatientId(p.patientId);
                          setNurseModalTab('vitals');
                          setIsNurseModalOpen(true);
                        }}
                      >
                        <td className="py-3.5 px-3">
                          <div className="font-extrabold text-blue-700 dark:text-sky-400 font-mono text-sm">
                            {p.bedNumber}
                          </div>
                          <span className="text-[10px] text-slate-400">{p.wardName}</span>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                            {p.patientName}
                            {p.hasActiveAlert && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Active Vital Alert" />
                            )}
                          </div>
                          <span className="font-mono text-slate-400 text-[10px]">{p.patientNumber}</span>
                        </td>

                        <td className="py-3.5 px-2 text-slate-600 dark:text-slate-300 text-[11px]">
                          <div>{p.age} yrs &bull; {p.gender}</div>
                          <span className="font-semibold text-rose-600 dark:text-rose-400 text-[10px]">
                            Blood: {p.bloodGroup || '—'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2 max-w-xs text-[11px]">
                            {p.diagnosis}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                          <span className="font-semibold">Dr. {p.attendingDoctorName}</span>
                        </td>

                        <td className="py-3.5 px-3">
                          {p.latestVitals ? (
                            <div className="text-[11px] font-mono">
                              <span className="block font-semibold text-slate-800 dark:text-slate-200">
                                {p.latestVitals.temperature ? `${p.latestVitals.temperature}°F` : '--'}, {p.latestVitals.bloodPressure || '--'}
                              </span>
                              <span className={`text-[10px] font-bold ${p.latestVitals.oxygenSaturation < 92 ? 'text-rose-600' : 'text-slate-500'}`}>
                                SpO₂: {p.latestVitals.oxygenSaturation || '--'}% &bull; HR: {p.latestVitals.pulse || '--'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                              Needs Baseline Vitals
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => {
                                setSelectedNursePatientId(p.patientId);
                                setNurseModalTab('vitals');
                                setIsNurseModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-sky-50 dark:bg-blue-950 text-blue-700 dark:text-sky-300 hover:bg-sky-100 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                              title="Record vital signs"
                            >
                              <HeartPulse className="w-3.5 h-3.5" /> Vitals
                            </button>
                            <button
                              onClick={() => {
                                setSelectedNursePatientId(p.patientId);
                                setNurseModalTab('mar');
                                setIsNurseModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-sky-300 hover:bg-blue-100 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                              title="Medication Administration Record"
                            >
                              <Pill className="w-3.5 h-3.5" /> MAR
                            </button>
                            <button
                              onClick={() => {
                                setSelectedNursePatientId(p.patientId);
                                setNurseModalTab('treatment');
                                setIsNurseModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold transition"
                              title="Open Complete Nursing Dossier"
                            >
                              Dossier &rarr;
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* D. MEDICATION ADMINISTRATION SCHEDULE (MAR) (SRS #5, #6) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-blue-600" />
                    Today's Medication Administration Schedule (MAR)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300">
                    {nurseDashboard?.medicationSchedule?.length || 0} Doses Scheduled
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enforces clinical standard: Doctor prescribes &bull; Pharmacist dispenses &bull; Nurse administers & documents
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setMarFilter('ALL')}
                  className={`px-3 py-1 rounded-lg transition ${
                    marFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-300 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  All ({nurseDashboard?.medicationSchedule?.length || 0})
                </button>
                <button
                  onClick={() => setMarFilter('PENDING')}
                  className={`px-3 py-1 rounded-lg transition ${
                    marFilter === 'PENDING'
                      ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Pending ({nurseDashboard?.medicationSchedule?.filter((m) => !m.isGivenToday).length || 0})
                </button>
                <button
                  onClick={() => setMarFilter('GIVEN')}
                  className={`px-3 py-1 rounded-lg transition ${
                    marFilter === 'GIVEN'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-300 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Administered ({nurseDashboard?.medicationSchedule?.filter((m) => m.isGivenToday).length || 0})
                </button>
              </div>
            </div>

            {(!nurseDashboard?.medicationSchedule || nurseDashboard.medicationSchedule.length === 0) ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No active medication orders scheduled for admitted patients today.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Slot</th>
                      <th className="py-3 px-3">Patient & Bed</th>
                      <th className="py-3 px-3">Prescribed Medication</th>
                      <th className="py-3 px-2">Dose / Route</th>
                      <th className="py-3 px-2">Frequency</th>
                      <th className="py-3 px-2">Pharmacy Status</th>
                      <th className="py-3 px-3">MAR Administration Status</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {nurseDashboard.medicationSchedule
                      .filter((m) => {
                        if (marFilter === 'PENDING') return !m.isGivenToday;
                        if (marFilter === 'GIVEN') return m.isGivenToday;
                        return true;
                      })
                      .map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-3 font-mono font-bold text-blue-700 dark:text-sky-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {m.scheduledSlot}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {m.patientName}
                            </span>
                            <span className="text-[10px] text-blue-600 font-mono font-semibold">
                              Bed {m.bedNumber} ({m.wardName})
                            </span>
                          </td>

                          <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {m.medicationName}
                          </td>

                          <td className="py-3 px-2 text-slate-600 dark:text-slate-400">
                            {m.dosage} &bull; {m.route}
                          </td>

                          <td className="py-3 px-2 text-slate-500 font-mono text-[11px]">
                            {m.frequency}
                          </td>

                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.dispensingStatus === 'DISPENSED'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {m.dispensingStatus}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            {m.isGivenToday ? (
                              <span className="inline-flex items-center gap-1 text-blue-700 dark:text-sky-400 font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Given by {m.lastGivenByName || 'Nurse'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                                <Clock className="w-3.5 h-3.5" /> Due / Pending
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedNursePatientId(m.patientId);
                                setSelectedNursePrescriptionId(m.prescriptionId);
                                setNurseModalTab('mar');
                                setIsNurseModalOpen(true);
                              }}
                              className="px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition"
                            >
                              {m.isGivenToday ? 'Record Another Dose' : 'Administer Dose'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. RECEPTIONIST DASHBOARD */}
      {/* ========================================================= */}
      {isReceptionist && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Registered Patients"
              value={patients.length}
              icon={Users}
              color="blue"
              subtitle="Total master database"
            />
            <StatCard
              title="Today's Appointments"
              value={appointments.length}
              icon={Calendar}
              color="sky"
              subtitle="Patients in queue"
            />
            <StatCard
              title="Available Beds"
              value={wardStats ? wardStats.totalBeds - wardStats.occupiedBeds : 0}
              icon={BedDouble}
              color="sky"
              subtitle="Ready for intake"
            />
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-sky-500/10 via-white to-sky-500/5 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 p-6 rounded-3xl border border-sky-200 dark:border-blue-800/80 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-sky-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center mb-3">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 font-display text-base">
                  New Patient Intake
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Register arriving walk-in patients with demographic verification.
                </p>
              </div>
              <Link
                to="/patients"
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 transition"
              >
                <PlusCircle className="w-4 h-4" /> Register Patient
              </Link>
            </div>

            <div className="bg-gradient-to-br from-sky-500/10 via-white to-sky-500/5 dark:from-sky-950/40 dark:via-slate-900 dark:to-slate-900 p-6 rounded-3xl border border-sky-200 dark:border-sky-800/80 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 font-display text-base">
                  Book Consultation
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Schedule time-slot bookings with specialist doctors.
                </p>
              </div>
              <Link
                to="/appointments"
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 transition"
              >
                <Calendar className="w-4 h-4" /> Schedule Visit
              </Link>
            </div>

            <div className="bg-gradient-to-br from-sky-500/10 via-white to-sky-500/5 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 p-6 rounded-3xl border border-blue-200 dark:border-blue-800/80 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-sky-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center mb-3">
                  <BedDouble className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 font-display text-base">
                  Beds & Nurse Allocation
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Assign inpatient beds and allocate dedicated nurses to patients.
                </p>
              </div>
              <Link
                to="/wards"
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 transition"
              >
                <BedDouble className="w-4 h-4" /> Manage Beds & Nurses
              </Link>
            </div>

            <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 p-6 rounded-3xl border border-amber-200 dark:border-amber-800/80 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 font-display text-base">
                  Consultation Billing
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Calculate consultation fees and prescribed medicines to issue bills.
                </p>
              </div>
              <Link
                to="/billing"
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition"
              >
                <CreditCard className="w-4 h-4" /> Calculate & Manage Bills
              </Link>
            </div>
          </div>

          {/* Receptionist Flow Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                    Today's Reception OPD Caseload
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Appointments scheduled vs active consultations</p>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {appointments.length} Bookings
                </span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Booked', count: appointments.length },
                      { name: 'In Queue', count: appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'SCHEDULED').length },
                      { name: 'Completed', count: appointments.filter(a => a.status === 'COMPLETED').length },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415520" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {['#3b82f6', '#06b6d4', '#10b981'].map((color, index) => (
                        <Cell key={`rec-bar-${index}`} fill={color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                    Bed Availability for Inpatient Admissions
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Available vs occupied beds</p>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-sky-300 border border-blue-200 dark:border-blue-800">
                  {wardStats ? wardStats.totalBeds - wardStats.occupiedBeds : 0} Available
                </span>
              </div>
              <div className="h-56 flex items-center justify-center">
                {!wardStats || wardStats.totalBeds === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <BedDouble className="w-7 h-7 mx-auto mb-1.5 text-slate-300 dark:text-slate-600" />
                    No ward beds registered in system
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Available Beds', value: Math.max(0, wardStats.totalBeds - (wardStats.occupiedBeds || 0)) },
                          { name: 'Occupied Beds', value: wardStats?.occupiedBeds || 0 },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {['#10b981', '#f59e0b'].map((color, index) => (
                          <Cell key={`rec-pie-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. PHARMACIST DASHBOARD */}
      {/* ========================================================= */}
      {isPharmacist && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Pending Prescriptions"
              value={pendingPrescriptions.length}
              icon={Pill}
              color="amber"
              subtitle="Awaiting medication dispensing"
            />
            <StatCard
              title="Low Stock Medicines"
              value={lowStockMeds.length}
              icon={AlertTriangle}
              color={lowStockMeds.length > 0 ? 'rose' : 'blue'}
              subtitle="Below replenishment threshold"
            />
            <StatCard
              title="Pharmacy Hub"
              value="Dispense"
              icon={Receipt}
              color="blue"
              subtitle="Direct inventory deduction"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                Pending Prescription Dispense Queue
              </h3>
              <Link to="/prescriptions" className="text-xs font-semibold text-blue-600 hover:underline">
                View All Prescriptions
              </Link>
            </div>

            {pendingPrescriptions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                All patient prescriptions have been dispensed.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPrescriptions.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm block">
                        {p.medicationName} ({p.dosage})
                      </span>
                      <span className="text-slate-500">
                        Patient: {p.patientName} &bull; Route: {p.route} &bull; {p.frequency} &bull; Duration: {p.duration}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPrescriptionToDispense(p);
                        setIsDispenseModalOpen(true);
                      }}
                      className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white rounded-xl font-bold transition transform active:scale-95 shadow-sm inline-flex items-center gap-1.5"
                    >
                      <Pill className="w-3.5 h-3.5" /> Review & Dispense
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. LAB TECHNICIAN DASHBOARD */}
      {/* ========================================================= */}
      {isLabTech && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Pending Specimen Orders"
              value={pendingLabs.length}
              icon={FlaskConical}
              color="amber"
              subtitle="Tests requiring analysis"
            />
            <StatCard
              title="Critical Results Flagged"
              value={criticalLabs.length}
              icon={AlertTriangle}
              color={criticalLabs.length > 0 ? 'rose' : 'blue'}
              subtitle="Alerts dispatched to physicians"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-display">
                Laboratory Analysis Workbench
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Enter specimen values, reference ranges, and trigger critical physician notifications.
              </p>
            </div>
            <Link
              to="/lab"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              Open Lab Orders <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. PATIENT DASHBOARD */}
      {/* ========================================================= */}
      {isPatient && (() => {
        const activeAppointments = (appointments || []).filter(
          (a) => a.status !== 'CANCELLED' && a.status !== 'COMPLETED'
        );
        const upcomingCount = activeAppointments.length > 0
          ? activeAppointments.length
          : ((patientHistory?.appointments || []).filter(
              (a) => a.status !== 'CANCELLED' && a.status !== 'COMPLETED'
            ).length || 0);

        const currentAppt = activeAppointments[0] || (appointments && appointments[0]) || null;
        const attendingDoctor = currentAppt?.doctorName || patientDetails?.primaryDoctorName || '';
        const department = currentAppt?.departmentName || patientDetails?.departmentName || '';

        return (
          <div className="space-y-6">
            {/* Welcome & Medical ID Header Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950 text-white p-6 sm:p-8 shadow-2xl shadow-blue-950/40 border border-sky-500/20 backdrop-blur-xl">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-display">
                    Welcome, <span className="bg-gradient-to-r from-sky-200 via-blue-200 to-white bg-clip-text text-transparent">{patientDetails?.name || user?.fullName || 'Patient'}</span>
                  </h2>
                  <p className="text-sky-100/80 text-xs sm:text-sm mt-1.5 max-w-xl leading-relaxed">
                    View your verified clinical profile, active OPD appointment schedule, live queue tokens, and medical records in real time.
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 mt-5 text-xs font-medium">
                    <span className="px-3.5 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-1.5 font-mono shadow-xs text-white">
                      <Hash className="w-3.5 h-3.5 text-sky-300" />
                      <span className="text-slate-300 text-[11px]">MRN:</span>
                      <strong className="text-sky-200">{patientDetails?.patientNumber || 'PAT-RECORD'}</strong>
                    </span>
                    <span className="px-3.5 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-1.5 font-mono shadow-xs text-white">
                      <Phone className="w-3.5 h-3.5 text-sky-300" />
                      <span>{patientDetails?.phoneNumber || user?.phoneNumber || 'Registered Mobile'}</span>
                    </span>
                    <span className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 text-blue-200 border border-sky-400/30 flex items-center gap-1.5 font-bold shadow-xs backdrop-blur-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-300" />
                      <span>{patientDetails?.status || 'OUTPATIENT'} &bull; Verified</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/40 text-rose-100 hover:text-white font-bold text-xs backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg shadow-rose-950/30"
                    title="Close Patient Portal and return to hospital homepage"
                  >
                    <X className="w-4 h-4 text-rose-300" />
                    <span>Close Portal & Return Home</span>
                  </button>
                  <a
                    href="/#book-appointment"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-500 hover:from-sky-400 hover:to-sky-400 text-slate-950 font-extrabold text-xs shadow-xl shadow-sky-500/20 transition-all transform active:scale-95 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-slate-950" />
                    <span>Book OPD Consultation</span>
                  </a>
                  <Link
                    to="/appointments"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs backdrop-blur-md transition-all active:scale-95"
                  >
                    <Calendar className="w-4 h-4 text-sky-300" />
                    <span>All Consultations</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Upcoming Consultations"
                value={upcomingCount}
                icon={Calendar}
                color="blue"
                subtitle="Scheduled doctor sessions"
              />
              <StatCard
                title="Active Queue Token"
                value={currentAppt ? (currentAppt.queueNumber ? `Token #${currentAppt.queueNumber}` : `Appt #${currentAppt.id}`) : 'No Active Visit'}
                icon={Clock}
                color="sky"
                subtitle={currentAppt ? (currentAppt.departmentName ? `OPD ${currentAppt.departmentName}` : 'OPD Consultation') : 'Next visit token'}
              />
              <StatCard
                title="e-Prescriptions"
                value={patientHistory?.prescriptions?.length || 0}
                icon={Pill}
                color="sky"
                subtitle="Active medication regimens"
              />
              <StatCard
                title="Medical Records"
                value={patientHistory?.medicalRecords?.length || 0}
                icon={FileText}
                color="indigo"
                subtitle="Clinical notes & diagnoses"
              />
            </div>

            {/* Patient Colorful Quick Access Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/appointments"
                className="bg-gradient-to-br from-blue-500/10 via-white to-blue-500/5 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 p-5 rounded-3xl border border-blue-200 dark:border-blue-800/80 shadow-sm hover:shadow-md transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs font-display">
                      OPD Visits & Queue
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Tokens & dates</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/prescriptions"
                className="bg-gradient-to-br from-sky-500/10 via-white to-sky-500/5 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 p-5 rounded-3xl border border-blue-200 dark:border-blue-800/80 shadow-sm hover:shadow-md transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs font-display">
                      e-Prescriptions
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Dosages & refills</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-sky-500 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/records"
                className="bg-gradient-to-br from-purple-500/10 via-white to-purple-500/5 dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 p-5 rounded-3xl border border-purple-200 dark:border-purple-800/80 shadow-sm hover:shadow-md transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs font-display">
                      Medical Records
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Clinical summaries</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-500 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/billing"
                className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 p-5 rounded-3xl border border-amber-200 dark:border-amber-800/80 shadow-sm hover:shadow-md transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs font-display">
                      Billing & Invoices
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Payments & receipts</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Pending Consultation Bill Payment Banner */}
            {(() => {
              const pendingBill = (patientBills || []).find(b => b.status !== 'PAID' && (b.balanceAmount > 0 || b.balanceAmount == null));
              if (!pendingBill) return null;
              return (
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-transparent border border-amber-400/40 dark:border-amber-700/60 shadow-lg shadow-amber-500/5 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20 font-bold">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                          Consultation Invoice Pending Payment
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60">
                          Due Action
                        </span>
                      </div>
                      <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 block mt-0.5">
                        Invoice #{pendingBill.id} &bull; Outstanding Balance: <span className="text-amber-600 dark:text-amber-400">₹{pendingBill.balanceAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                        Calculated by reception desk for your recent doctor consultation & prescribed pharmacy medications.
                      </span>
                    </div>
                  </div>
                  <Link
                    to="/billing"
                    className="px-5 py-3 bg-gradient-to-r from-blue-600 via-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-all transform active:scale-95 whitespace-nowrap cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" /> Pay Bill (₹{pendingBill.balanceAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                  </Link>
                </div>
              );
            })()}

            {/* SECTION: Scheduled OPD Consultations & Live Queue Tokens */}
            <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-7 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-display">
                        Your Scheduled OPD Consultations & Live Queue Tokens
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Live appointment schedule, OPD queue token positions, doctor details, and room assignments
                      </p>
                    </div>
                  </div>
                </div>
                <Link
                  to="/appointments"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-blue-950/40 text-xs font-bold text-blue-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-blue-900/50 transition"
                >
                  <span>View in Appointments</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="mt-5 space-y-4">
                {appointments && appointments.length > 0 ? (
                  appointments.map((appt) => {
                    const isUpcoming = appt.status === 'SCHEDULED' || appt.status === 'CONFIRMED';
                    return (
                      <div
                        key={appt.id}
                        className={`p-5 sm:p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
                          isUpcoming
                            ? 'bg-gradient-to-br from-white via-sky-50/30 to-cyan-50/20 dark:from-slate-850 dark:via-slate-850 dark:to-blue-950/30 border-sky-300/80 dark:border-sky-500/40 shadow-lg hover:shadow-2xl'
                            : 'bg-slate-50/90 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-80'
                        }`}
                      >
                        {/* Top decorative accent */}
                        {isUpcoming && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500" />
                        )}

                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                          <div className="space-y-3.5 flex-1">
                            {/* Badges row */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-4 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                <span>Token #{appt.queueNumber ? appt.queueNumber : appt.id}</span>
                              </span>
                              <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Ref: APT-{appt.id}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wide ${
                                appt.status === 'CONFIRMED'
                                  ? 'bg-sky-500/15 text-blue-700 dark:text-sky-300 border border-sky-400/40 shadow-xs'
                                  : appt.status === 'SCHEDULED'
                                  ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-400/40 shadow-xs'
                                  : appt.status === 'COMPLETED'
                                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/40'
                              }`}>
                                {appt.status || 'SCHEDULED'}
                              </span>
                            </div>

                            {/* Details grid with tailored colors */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
                              <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-sky-200/60 dark:border-blue-800/60 shadow-xs hover:border-sky-400 transition">
                                <span className="text-blue-600 dark:text-sky-400 block text-[11px] font-bold uppercase tracking-wider">Attending Specialist</span>
                                <strong className="text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5 mt-1 font-bold">
                                  <span>👨‍⚕️</span>
                                  <span>Dr. {appt.doctorName}</span>
                                </strong>
                                <span className="text-[11px] text-blue-600 dark:text-sky-400 font-semibold block mt-0.5">
                                  {appt.departmentName ? `Dept: ${appt.departmentName}` : 'Clinical Consultation'}
                                </span>
                              </div>

                              <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-sky-200/60 dark:border-sky-800/60 shadow-xs hover:border-sky-400 transition">
                                <span className="text-sky-600 dark:text-sky-400 block text-[11px] font-bold uppercase tracking-wider">Consultation Slot</span>
                                <strong className="text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5 mt-1">
                                  <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                  <span>{appt.appointmentDate}</span>
                                </strong>
                                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1 mt-0.5 font-mono">
                                  <Clock className="w-3 h-3 text-sky-500" />
                                  <span>{appt.timeSlot}</span>
                                </span>
                              </div>

                              <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-blue-200/60 dark:border-blue-800/60 shadow-xs hover:border-sky-400 transition">
                                <span className="text-blue-600 dark:text-sky-400 block text-[11px] font-bold uppercase tracking-wider">OPD Station</span>
                                <strong className="text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5 mt-1">
                                  <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                                  <span>{appt.roomNumber ? `Room ${appt.roomNumber}` : 'OPD Consultation Room'}</span>
                                </strong>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                  {appt.departmentName ? `${appt.departmentName} Wing` : 'Ambulatory Care'}
                                </span>
                              </div>

                              <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-amber-200/60 dark:border-amber-800/60 shadow-xs hover:border-amber-400 transition">
                                <span className="text-amber-600 dark:text-amber-400 block text-[11px] font-bold uppercase tracking-wider">Chief Complaint</span>
                                <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold truncate mt-1" title={appt.notes}>
                                  {appt.notes || 'Clinical consultation & review'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Print Slip & Actions */}
                          <div className="flex sm:flex-col items-center justify-end gap-2.5 border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-700/80 pt-3 lg:pt-0 lg:pl-5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const printWindow = window.open('', '_blank');
                                if (printWindow) {
                                  printWindow.document.write(`
                                    <html>
                                      <head>
                                        <title>HealthCare Hospital - Appointment Slip #${appt.id}</title>
                                        <style>
                                          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; }
                                          .header { border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 20px; }
                                          .title { font-size: 20px; font-weight: bold; color: #0f172a; margin: 0; }
                                          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
                                          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #ccfbf1; color: #0f766e; font-weight: bold; font-size: 12px; }
                                          .token { font-size: 28px; font-weight: 800; color: #0d9488; margin: 15px 0 5px 0; }
                                          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 20px; font-size: 13px; }
                                          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
                                          .card-title { font-weight: bold; color: #475569; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; }
                                          .guidelines { margin-top: 24px; padding: 12px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; font-size: 12px; color: #92400e; }
                                          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
                                        </style>
                                      </head>
                                      <body>
                                        <div class="header">
                                          <p class="title">HealthCare Medical Center & Hospital</p>
                                          <p class="subtitle">NABH & JCI Accredited Hospital Management System &bull; OPD Consultation Slip</p>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                          <div>
                                            <span class="badge">LIVE OPD APPOINTMENT SLIP</span>
                                            <div class="token">Token #${appt.queueNumber ? appt.queueNumber : appt.id}</div>
                                            <p style="margin: 0; font-size: 12px; color: #64748b;">Booking Reference: <strong>APT-${appt.id}</strong></p>
                                          </div>
                                          <div style="text-align: right; font-size: 12px;">
                                            <p style="margin: 2px 0;"><strong>Date:</strong> ${appt.appointmentDate}</p>
                                            <p style="margin: 2px 0;"><strong>Slot:</strong> ${appt.timeSlot}</p>
                                            <p style="margin: 2px 0;"><strong>Station:</strong> ${appt.roomNumber ? 'Room ' + appt.roomNumber : 'OPD Consultation Room'} &bull; ${appt.departmentName || 'General'} Wing</p>
                                          </div>
                                        </div>
                                        <div class="grid">
                                          <div class="card">
                                            <div class="card-title">Patient Details</div>
                                            <p style="margin: 4px 0;"><strong>Name:</strong> ${patientDetails?.name || user?.fullName || 'Patient'}</p>
                                            <p style="margin: 4px 0;"><strong>MRN:</strong> ${patientDetails?.patientNumber || user?.patientNumber || 'N/A'}</p>
                                            <p style="margin: 4px 0;"><strong>Contact:</strong> ${patientDetails?.phoneNumber || user?.phoneNumber || 'N/A'}</p>
                                          </div>
                                          <div class="card">
                                            <div class="card-title">Attending Doctor</div>
                                            <p style="margin: 4px 0;"><strong>Doctor:</strong> Dr. ${appt.doctorName}</p>
                                            <p style="margin: 4px 0;"><strong>Department:</strong> ${appt.departmentName}</p>
                                            <p style="margin: 4px 0;"><strong>Chief Complaint:</strong> ${appt.notes || 'General OPD'}</p>
                                          </div>
                                        </div>
                                        <div class="guidelines">
                                          <strong>Important Instructions:</strong>
                                          <ul style="margin: 4px 0 0 0; padding-left: 18px;">
                                            <li>Please present this slip or your Token # at the triage counter 15 minutes before your time slot.</li>
                                            <li>Carry your previous prescription records or lab reports if applicable.</li>
                                          </ul>
                                        </div>
                                        <div class="footer">
                                          System Generated OPD Slip &bull; HealthCare Hospital Portal &bull; Verification Code: ${appt.id}-${patientDetails?.id || 1}
                                        </div>
                                        <script>window.print();</script>
                                      </body>
                                    </html>
                                  `);
                                  printWindow.document.close();
                                }
                              }}
                              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer border border-slate-200 dark:border-slate-700"
                              title="Print this appointment slip"
                            >
                              <Printer className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                              <span>Print Slip</span>
                            </button>

                            <Link
                              to="/appointments"
                              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-sky-500/20 whitespace-nowrap hover:scale-105"
                            >
                              <span>Details</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 px-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-dashed border-slate-200 dark:border-slate-700">
                    <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Consultations Scheduled</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      You currently have no scheduled doctor visits. Use the hospital OPD scheduler to book an appointment with our specialists.
                    </p>
                    <a
                      href="/#book-appointment"
                      className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Book OPD Consultation
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION: Patient Profile & Medical Identity Record */}
            <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-7 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-400 to-indigo-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-lg shadow-sky-500/25">
                    <User className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-display">
                      Patient Clinical Profile & Identity Record
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Synchronized Medical Record Number (MRN) and hospital outpatient demographics
                    </p>
                  </div>
                </div>
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
                >
                  <span>Edit Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* 4 Distinct Colorful Jewel-tone Demographic Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                {/* 1. Legal Name - Cyan/Teal */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-cyan-50/50 dark:from-slate-800/80 dark:to-blue-950/30 border border-sky-200 dark:border-blue-800/70 hover:border-sky-400 transition shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-sky-400">
                      Full Legal Name
                    </span>
                    <div className="w-5 h-5 rounded-full bg-sky-500/20 text-blue-600 dark:text-sky-300 flex items-center justify-center">
                      <User className="w-3 h-3" />
                    </div>
                  </div>
                  <strong className="text-sm font-extrabold text-slate-900 dark:text-slate-100 block">
                    {patientDetails?.name || user?.fullName || 'Patient'}
                  </strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1 font-medium">
                    Gender: {patientDetails?.gender || 'Other'} &bull; Age: {patientDetails?.age ? `${patientDetails.age} yrs` : '30+'}
                  </span>
                </div>

                {/* 2. Medical Record Number - Indigo/Purple */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 dark:from-slate-800/80 dark:to-indigo-950/30 border border-indigo-200 dark:border-indigo-800/70 hover:border-indigo-400 transition shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      Medical Record No. (MRN)
                    </span>
                    <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
                      <Hash className="w-3 h-3" />
                    </div>
                  </div>
                  <strong className="text-sm font-mono font-black text-indigo-700 dark:text-indigo-300 block">
                    {patientDetails?.patientNumber || 'PAT-RECORD'}
                  </strong>
                  <span className="text-[11px] text-blue-600 dark:text-sky-400 font-bold flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active Registry
                  </span>
                </div>

                {/* 3. Registered Mobile & Email - Sky Blue */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-blue-50/50 dark:from-slate-800/80 dark:to-sky-950/30 border border-sky-200 dark:border-sky-800/70 hover:border-sky-400 transition shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400">
                      Registered Mobile
                    </span>
                    <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300 flex items-center justify-center">
                      <Phone className="w-3 h-3" />
                    </div>
                  </div>
                  <strong className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 block">
                    {patientDetails?.phoneNumber || user?.phoneNumber || 'Registered Mobile'}
                  </strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block mt-1" title={user?.email || patientDetails?.email}>
                    {user?.email || 'patient@hospital.org'}
                  </span>
                </div>

                {/* 4. Blood Group & Status - Vibrant Ruby Red */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/70 via-white to-red-50/50 dark:from-slate-800/80 dark:to-rose-950/30 border border-rose-200 dark:border-rose-800/70 hover:border-rose-400 transition shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                      Blood Group
                    </span>
                    <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                      <HeartPulse className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 text-white font-black text-sm shadow-xs">
                    {patientDetails?.bloodGroup && patientDetails.bloodGroup !== 'Unknown' ? patientDetails.bloodGroup : 'Not Recorded'}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1 font-medium">
                    Status: {patientDetails?.status || 'OUTPATIENT'} &bull; Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Dedicated Care Team & Hospital Station Card */}
            <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-7 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-display">
                    Your Care Team & Ward Station
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Synchronized medical staff and room assignment
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-sky-50 text-blue-700 dark:bg-blue-900/30 dark:text-sky-300 text-xs font-bold border border-sky-200/60 dark:border-blue-800/60">
                  Active Patient Care
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Attending Doctor - Teal/Cyan Theme */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-cyan-50/40 dark:from-slate-850 dark:to-blue-950/30 border border-sky-200 dark:border-blue-700/60 flex items-center gap-4 hover:border-sky-400 transition shadow-xs hover:shadow-lg">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-500 to-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-500/30">
                    <Stethoscope className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-sky-400 block">
                      Attending Doctor
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 block flex items-center gap-1 mt-0.5">
                      <span>👨‍⚕️</span>
                      <span>
                        {attendingDoctor
                          ? (attendingDoctor.startsWith('Dr.') || attendingDoctor.startsWith('Dr ')
                              ? attendingDoctor
                              : `Dr. ${attendingDoctor}`)
                          : 'No Doctor Assigned'}
                      </span>
                    </span>
                    <span className="text-xs text-blue-600 dark:text-sky-400 font-bold block mt-0.5">
                      {department ? `Department of ${department}` : 'General OPD'}
                    </span>
                  </div>
                </div>

                {/* Assigned Nurse - Sky/Indigo Theme */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-indigo-50/40 dark:from-slate-850 dark:to-indigo-950/30 border border-sky-200 dark:border-sky-700/60 flex items-center gap-4 hover:border-sky-400 transition shadow-xs hover:shadow-lg">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-500/30">
                    <HeartPulse className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 block">
                      Assigned Primary Nurse
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5">
                      {patientDetails?.assignedNurseName
                        ? (patientDetails.assignedNurseName.toLowerCase().startsWith('nurse')
                            ? patientDetails.assignedNurseName
                            : `Nurse ${patientDetails.assignedNurseName}`)
                        : 'Unallocated / General Ward'}
                    </span>
                    <span className="text-xs text-sky-600 dark:text-sky-400 font-bold block mt-0.5">
                      {patientDetails?.assignedNurseName ? 'Dedicated Care Nurse' : 'Awaiting Nurse Allocation'}
                    </span>
                  </div>
                </div>

                {/* Ward & Bed Location - Amber/Orange Theme */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 dark:from-slate-850 dark:to-amber-950/30 border border-amber-200 dark:border-amber-700/60 flex items-center gap-4 hover:border-amber-400 transition shadow-xs hover:shadow-lg">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/30">
                    <BedDouble className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                      Ward & Bed Station
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5 font-mono">
                      {patientDetails?.bedNumber ? `Bed ${patientDetails.bedNumber}` : 'Outpatient Consultation'}
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                      {patientDetails?.wardName || (department ? `${department} Wing` : 'Ambulatory Care')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Health Summary Links - Distinct Colorful Cards */}
            <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-7 backdrop-blur-xl">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-display mb-4">
                Your Health Summary & Hospital Services
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {/* 1. Appointments - Cyan/Teal */}
                <Link to="/appointments" className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-50/60 via-white to-cyan-50/40 dark:from-slate-850 dark:to-blue-950/30 border border-sky-200/80 dark:border-blue-700/70 hover:border-sky-400 block group transition-all duration-300 hover:-translate-y-1.5 shadow-sm hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-sky-500/25 group-hover:scale-110 transition-transform">
                        <Calendar className="w-4 h-4" />
                      </div>
                      Appointments
                    </span>
                    <ArrowRight className="w-4 h-4 text-blue-600 dark:text-sky-400 group-hover:translate-x-1.5 transition-transform" />
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 mt-2.5 block font-medium">View consultation queue, tokens and slips</span>
                </Link>

                {/* 2. Prescriptions - Fuchsia/Purple */}
                <Link to="/prescriptions" className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50/60 via-white to-fuchsia-50/40 dark:from-slate-850 dark:to-purple-950/30 border border-purple-200/80 dark:border-purple-700/70 hover:border-purple-400 block group transition-all duration-300 hover:-translate-y-1.5 shadow-sm hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-fuchsia-500 text-white flex items-center justify-center shadow-md shadow-purple-500/25 group-hover:scale-110 transition-transform">
                        <Pill className="w-4 h-4" />
                      </div>
                      e-Prescriptions
                    </span>
                    <ArrowRight className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:translate-x-1.5 transition-transform" />
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 mt-2.5 block font-medium">Check dosage, medicines and pharmacy</span>
                </Link>

                {/* 3. Invoices - Emerald/Gold */}
                <Link to="/billing" className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/60 via-white to-sky-50/40 dark:from-slate-850 dark:to-blue-950/30 border border-blue-200/80 dark:border-blue-700/70 hover:border-sky-400 block group transition-all duration-300 hover:-translate-y-1.5 shadow-sm hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/25 group-hover:scale-110 transition-transform">
                        <Receipt className="w-4 h-4" />
                      </div>
                      Invoices & Bills
                    </span>
                    <ArrowRight className="w-4 h-4 text-blue-600 dark:text-sky-400 group-hover:translate-x-1.5 transition-transform" />
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 mt-2.5 block font-medium">Review charges and pay consultation balance</span>
                </Link>

                {/* 4. Medical Records - Indigo/Blue */}
                <Link to="/medical-records" className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/40 dark:from-slate-850 dark:to-indigo-950/30 border border-indigo-200/80 dark:border-indigo-700/70 hover:border-indigo-400 block group transition-all duration-300 hover:-translate-y-1.5 shadow-sm hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:scale-110 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      Medical Records
                    </span>
                    <ArrowRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1.5 transition-transform" />
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 mt-2.5 block font-medium">Doctor clinical notes & diagnoses</span>
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Structured Clinical Consultation Modal - Strictly for Doctors */}
      {isDoctor && (
        <ConsultationModal
          isOpen={isConsultationOpen}
          onClose={() => {
            setIsConsultationOpen(false);
            setSelectedConsultationAppt(null);
          }}
          appointment={selectedConsultationAppt}
          onSuccess={() => {
            loadDashboardData();
          }}
        />
      )}

      {/* Comprehensive Nurse Clinical Care Modal */}
      <NurseCareModal
        isOpen={isNurseModalOpen}
        onClose={() => {
          setIsNurseModalOpen(false);
          setSelectedNursePatientId(null);
          setSelectedNursePrescriptionId(null);
        }}
        patientId={selectedNursePatientId}
        initialTab={nurseModalTab}
        initialPrescriptionId={selectedNursePrescriptionId}
        onDataUpdated={() => {
          loadDashboardData();
        }}
      />

      {/* Vital Alert Response & Triage Modal */}
      <VitalAlertResponseModal
        isOpen={isAlertModalOpen}
        onClose={() => {
          setIsAlertModalOpen(false);
          setSelectedAlertToRespond(null);
        }}
        alert={selectedAlertToRespond}
        onSuccess={() => {
          loadDashboardData();
        }}
      />

      {/* Clinical Pharmacist Safety Review & Dispense Modal */}
      <PharmacistDispenseModal
        isOpen={isDispenseModalOpen}
        onClose={() => {
          setIsDispenseModalOpen(false);
          setSelectedPrescriptionToDispense(null);
        }}
        prescription={selectedPrescriptionToDispense}
        onDispensed={() => {
          loadDashboardData();
        }}
      />
    </div>
  );
};

export default DashboardPage;
