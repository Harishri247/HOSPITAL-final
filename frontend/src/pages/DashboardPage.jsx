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
  Clock,
  ArrowRight,
  PlusCircle,
  FileText,
  ShieldAlert,
} from 'lucide-react';
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
import { Link } from 'react-router-dom';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [pendingLabs, setPendingLabs] = useState([]);
  const [criticalLabs, setCriticalLabs] = useState([]);
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [lowStockMeds, setLowStockMeds] = useState([]);
  const [wardStats, setWardStats] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (user?.role === 'ROLE_ADMIN') {
        const res = await adminApi.getAnalytics();
        setAdminAnalytics(res.data);
      } else if (user?.role === 'ROLE_DOCTOR') {
        const [appRes, critRes] = await Promise.all([
          appointmentApi.filter(user.id, null, null),
          labApi.getCritical(),
        ]);
        setAppointments(appRes.data || []);
        setCriticalLabs(critRes.data || []);
      } else if (user?.role === 'ROLE_NURSE') {
        const [wardRes, patRes] = await Promise.all([
          wardApi.getStats(),
          patientApi.getAll(),
        ]);
        setWardStats(wardRes.data);
        setPatients(patRes.data || []);
      } else if (user?.role === 'ROLE_RECEPTIONIST') {
        const [patRes, appRes, wardRes] = await Promise.all([
          patientApi.getAll(),
          appointmentApi.filter(null, new Date().toISOString().split('T')[0], null),
          wardApi.getStats(),
        ]);
        setPatients(patRes.data || []);
        setAppointments(appRes.data || []);
        setWardStats(wardRes.data);
      } else if (user?.role === 'ROLE_PHARMACIST') {
        const [prescRes, lowRes] = await Promise.all([
          prescriptionApi.getPending(),
          pharmacyApi.getLowStock(),
        ]);
        setPendingPrescriptions(prescRes.data || []);
        setLowStockMeds(lowRes.data || []);
      } else if (user?.role === 'ROLE_LAB_TECHNICIAN') {
        const [pendingRes, critRes] = await Promise.all([
          labApi.getPending(),
          labApi.getCritical(),
        ]);
        setPendingLabs(pendingRes.data || []);
        setCriticalLabs(critRes.data || []);
      } else if (user?.role === 'ROLE_PATIENT') {
        // Patient dashboard
        const patRes = await patientApi.search(user.username);
        const patientObj = patRes.data && patRes.data[0];
        if (patientObj) {
          const histRes = await patientApi.getHistory(patientObj.id);
          setPatientHistory(histRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0d9488', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none mr-8">
          <Activity className="w-64 h-64 text-teal-400" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-widest text-teal-400 font-semibold">
                  HealthCare Clinical Command
                </span>
                <RoleBadge role={user?.role} />
              </div>
              <h1 className="text-2xl lg:text-4xl font-extrabold tracking-tight">
                Welcome back, {user?.fullName}
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Hospital System operational &bull; Department: {user?.departmentName || 'General Operations'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-xs">
                <span className="text-slate-300 block">Today's Date</span>
                <span className="font-bold text-white">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. ADMIN DASHBOARD */}
      {/* ========================================================= */}
      {user?.role === 'ROLE_ADMIN' && adminAnalytics && (
        <div className="space-y-6">
          {/* Top Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Registered Patients"
              value={adminAnalytics.totalPatients}
              icon={Users}
              color="teal"
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
              value={`$${adminAnalytics.totalRevenue ? Number(adminAnalytics.totalRevenue).toLocaleString() : '0'}`}
              icon={Receipt}
              color="emerald"
              subtitle={`$${adminAnalytics.outstandingBalance ? Number(adminAnalytics.outstandingBalance).toLocaleString() : '0'} pending`}
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
                    <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
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
              <Link to="/admin" className="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1">
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
      {user?.role === 'ROLE_DOCTOR' && (
        <div className="space-y-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Today's Appointments"
              value={appointments.length}
              icon={Calendar}
              color="sky"
              subtitle="Scheduled OPD / IPD visits"
            />
            <StatCard
              title="Critical Lab Alerts"
              value={criticalLabs.length}
              icon={AlertTriangle}
              color={criticalLabs.length > 0 ? 'rose' : 'teal'}
              subtitle="Abnormal values requiring attention"
            />
            <StatCard
              title="Clinical Shortcuts"
              value="Quick Tools"
              icon={FileText}
              color="teal"
              subtitle="Notes, Prescriptions & Lab orders"
            />
          </div>

          {/* Today's Queue */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                Your Patient Schedule
              </h3>
              <Link to="/appointments" className="text-xs font-semibold text-teal-600 hover:underline">
                View All Appointments
              </Link>
            </div>

            {appointments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No active appointments booked in your schedule.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-2">Queue #</th>
                      <th className="py-3 px-2">Patient</th>
                      <th className="py-3 px-2">Date & Slot</th>
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {appointments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-2 font-bold text-teal-600">#{a.queueNumber || '—'}</td>
                        <td className="py-3 px-2 font-semibold text-slate-800 dark:text-slate-200">
                          {a.patientName} ({a.patientNumber})
                        </td>
                        <td className="py-3 px-2 text-slate-500">
                          {a.appointmentDate} &bull; {a.timeSlot}
                        </td>
                        <td className="py-3 px-2 font-medium">{a.type}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
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
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-[11px] shadow-xs transition"
                                title="Confirm this appointment as attending doctor"
                              >
                                Confirm
                              </button>
                            )}
                            <Link
                              to={`/patients/${a.patientId}`}
                              className="px-3 py-1 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-lg hover:bg-teal-100 font-semibold"
                            >
                              Open Chart
                            </Link>
                          </div>
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
      {/* 3. NURSE DASHBOARD */}
      {/* ========================================================= */}
      {user?.role === 'ROLE_NURSE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Ward Beds"
              value={wardStats?.totalBeds || 0}
              icon={BedDouble}
              color="teal"
              subtitle="Configured across units"
            />
            <StatCard
              title="Occupied Beds"
              value={wardStats?.occupiedBeds || 0}
              icon={Users}
              color="amber"
              subtitle="Admitted patients"
            />
            <StatCard
              title="Ward Occupancy Rate"
              value={`${wardStats ? Math.round(wardStats.occupancyRate) : 0}%`}
              icon={Activity}
              color="sky"
              subtitle="Floor capacity"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-display">
                Ward & Bed Allocation Matrix
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Manage ICU admissions, bed transfers, and patient discharge.
              </p>
            </div>
            <Link
              to="/wards"
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              Open Ward Matrix <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. RECEPTIONIST DASHBOARD */}
      {/* ========================================================= */}
      {user?.role === 'ROLE_RECEPTIONIST' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Registered Patients"
              value={patients.length}
              icon={Users}
              color="teal"
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
              color="emerald"
              subtitle="Ready for intake"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-base">
                  New Patient Intake
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Register arriving walk-in patients with demographic verification.
                </p>
              </div>
              <Link
                to="/patients"
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold"
              >
                <PlusCircle className="w-4 h-4" /> Register Patient
              </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display text-base">
                  Book Doctor Consultation
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Schedule time-slot bookings with specialist doctors.
                </p>
              </div>
              <Link
                to="/appointments"
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold"
              >
                <Calendar className="w-4 h-4" /> Schedule Visit
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. PHARMACIST DASHBOARD */}
      {/* ========================================================= */}
      {user?.role === 'ROLE_PHARMACIST' && (
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
              color={lowStockMeds.length > 0 ? 'rose' : 'teal'}
              subtitle="Below replenishment threshold"
            />
            <StatCard
              title="Pharmacy Hub"
              value="Dispense"
              icon={Receipt}
              color="teal"
              subtitle="Direct inventory deduction"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                Pending Prescription Dispense Queue
              </h3>
              <Link to="/prescriptions" className="text-xs font-semibold text-teal-600 hover:underline">
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
                    <Link
                      to="/prescriptions"
                      className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition"
                    >
                      Dispense Now
                    </Link>
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
      {user?.role === 'ROLE_LAB_TECHNICIAN' && (
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
              color={criticalLabs.length > 0 ? 'rose' : 'teal'}
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
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              Open Lab Orders <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. PATIENT DASHBOARD */}
      {/* ========================================================= */}
      {user?.role === 'ROLE_PATIENT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Upcoming Visits"
              value={patientHistory?.appointments?.filter(a => a.status === 'CONFIRMED').length || 0}
              icon={Calendar}
              color="teal"
              subtitle="Scheduled doctor sessions"
            />
            <StatCard
              title="Prescribed Medications"
              value={patientHistory?.prescriptions?.length || 0}
              icon={Pill}
              color="sky"
              subtitle="Current medication regimens"
            />
            <StatCard
              title="Medical Records"
              value={patientHistory?.medicalRecords?.length || 0}
              icon={FileText}
              color="emerald"
              subtitle="Past clinical notes"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display mb-3">
              Your Health Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <Link to="/appointments" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 transition border border-slate-100 dark:border-slate-700 block">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">Appointments</span>
                <span className="text-slate-500">View upcoming dates or request follow-up</span>
              </Link>
              <Link to="/prescriptions" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 transition border border-slate-100 dark:border-slate-700 block">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">e-Prescriptions</span>
                <span className="text-slate-500">Check dosage, route and pharmacy status</span>
              </Link>
              <Link to="/billing" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 transition border border-slate-100 dark:border-slate-700 block">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">Invoices & Bills</span>
                <span className="text-slate-500">Review hospital charges and pay balance</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
