import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RoleBadge } from '../components/RoleBadge';
import { NotificationBell } from '../components/NotificationBell';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Pill,
  BedDouble,
  FlaskConical,
  Receipt,
  ShieldCheck,
  User,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Activity,
  Globe,
  Clock
} from 'lucide-react';

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const isPatient = user?.role === 'ROLE_PATIENT' || user?.role === 'PATIENT';
  const { darkMode, toggleDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate(isPatient ? '/' : '/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, iconColor: 'text-sky-400', roles: ['*'] },
    { label: 'Patients', path: '/patients', icon: Users, iconColor: 'text-indigo-400', roles: ['ROLE_ADMIN', 'ROLE_RECEPTIONIST', 'ROLE_DOCTOR', 'ROLE_NURSE'] },
    { label: 'Appointments', path: '/appointments', icon: Calendar, iconColor: 'text-sky-400', roles: ['ROLE_ADMIN', 'ROLE_RECEPTIONIST', 'ROLE_DOCTOR', 'ROLE_PATIENT'] },
    { label: 'Medical Records', path: '/medical-records', icon: FileText, iconColor: 'text-sky-400', roles: ['ROLE_ADMIN', 'ROLE_DOCTOR', 'ROLE_NURSE', 'ROLE_PATIENT'] },
    { label: 'Prescriptions', path: '/prescriptions', icon: Pill, iconColor: 'text-purple-400', roles: ['ROLE_ADMIN', 'ROLE_DOCTOR', 'ROLE_PHARMACIST', 'ROLE_PATIENT'] },
    { label: 'Wards & Beds', path: '/wards', icon: BedDouble, iconColor: 'text-amber-400', roles: ['ROLE_ADMIN', 'ROLE_NURSE', 'ROLE_DOCTOR', 'ROLE_RECEPTIONIST'] },
    { label: 'Laboratory', path: '/lab', icon: FlaskConical, iconColor: 'text-rose-400', roles: ['ROLE_ADMIN', 'ROLE_LAB_TECHNICIAN', 'ROLE_DOCTOR', 'ROLE_PATIENT'] },
    { label: 'Pharmacy', path: '/pharmacy', icon: Pill, iconColor: 'text-cyan-400', roles: ['ROLE_ADMIN', 'ROLE_PHARMACIST'] },
    { label: 'Billing', path: '/billing', icon: Receipt, iconColor: 'text-sky-400', roles: ['ROLE_ADMIN', 'ROLE_RECEPTIONIST', 'ROLE_PATIENT'] },
    { label: 'Administration', path: '/admin', icon: ShieldCheck, iconColor: 'text-red-400', roles: ['ROLE_ADMIN'] },
    { label: 'Profile', path: '/profile', icon: User, iconColor: 'text-sky-400', roles: ['*'] },
  ];

  const visibleNav = navItems.filter(item => {
    if (item.roles.includes('*')) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 vibrant-mesh-light dark:vibrant-mesh-dark flex flex-col md:flex-row transition-colors duration-300 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex flex-col border-r border-slate-200/90 dark:border-slate-800 shadow-xl transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="p-5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
          <Link to="/" className="flex items-center gap-3 group" title="Visit Public Hospital Homepage">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight block group-hover:text-blue-600 dark:group-hover:text-sky-300 transition-colors">
                HealthCare
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 bg-clip-text text-transparent">
                Hospital PMS
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-3.5 mx-3 my-3 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{user?.fullName}</p>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <RoleBadge role={user?.role} />
                {user?.departmentName && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-sky-300 border border-blue-200 dark:border-blue-500/40">
                    {user.departmentName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Close Portal Button in Sidebar for Patients */}
        {isPatient && (
          <div className="mx-3 mb-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-blue-500/40 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Close Patient Portal and return to hospital homepage"
            >
              <X className="w-4 h-4 text-blue-600 dark:text-sky-300" />
              <span>Close Portal & Return Home</span>
            </button>
          </div>
        )}

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white shadow-md shadow-blue-600/25 font-bold translate-x-1'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:translate-x-1'
                  }`
                }
              >
                <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 ${item.iconColor} group-hover:scale-110 transition-transform shadow-xs`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                </div>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center bg-slate-50/80 dark:bg-slate-950/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{isPatient ? 'Close Portal' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors shadow-xs">
          {/* Top Multi-color Accent Line */}
          <div className="h-[2.5px] w-full palette-gradient-bar" />
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
              <span className="text-xs font-black palette-gradient-text">
                HealthCare Hospital PMS
              </span>
              <span className="hidden sm:inline text-xs text-slate-400">&bull; Secure Portal Active</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Close Portal Button for Patients / Public Link for Staff */}
            {isPatient ? (
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 transition shadow-md shadow-blue-600/25 active:scale-95 cursor-pointer"
                title="Close Patient Portal and return to hospital homepage"
              >
                <X className="w-3.5 h-3.5 text-white" />
                <span>Close Portal & Exit</span>
              </button>
            ) : (
              <Link
                to="/"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Visit Hospital Public Homepage"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Public Site</span>
              </Link>
            )}

            {/* Live Clock / Date & Time Widget */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className="text-slate-300 dark:text-slate-600 font-light">&bull;</span>
              <span className="font-extrabold tabular-nums text-blue-700 dark:text-sky-300">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

        {/* Page Content View - Fullscreen & Fluid */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
