import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
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
  Activity
} from 'lucide-react';

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['*'] },
    { label: 'Patients', path: '/patients', icon: Users, roles: ['ROLE_ADMIN', 'ROLE_RECEPTIONIST', 'ROLE_DOCTOR', 'ROLE_NURSE'] },
    { label: 'Appointments', path: '/appointments', icon: Calendar, roles: ['ROLE_ADMIN', 'ROLE_RECEPTIONIST', 'ROLE_DOCTOR', 'ROLE_PATIENT'] },
    { label: 'Medical Records', path: '/medical-records', icon: FileText, roles: ['ROLE_ADMIN', 'ROLE_DOCTOR', 'ROLE_NURSE', 'ROLE_PATIENT'] },
    { label: 'Prescriptions', path: '/prescriptions', icon: Pill, roles: ['ROLE_ADMIN', 'ROLE_DOCTOR', 'ROLE_PHARMACIST', 'ROLE_PATIENT'] },
    { label: 'Wards & Beds', path: '/wards', icon: BedDouble, roles: ['ROLE_ADMIN', 'ROLE_NURSE', 'ROLE_DOCTOR', 'ROLE_RECEPTIONIST'] },
    { label: 'Laboratory', path: '/lab', icon: FlaskConical, roles: ['ROLE_ADMIN', 'ROLE_LAB_TECHNICIAN', 'ROLE_DOCTOR', 'ROLE_PATIENT'] },
    { label: 'Pharmacy', path: '/pharmacy', icon: Pill, roles: ['ROLE_ADMIN', 'ROLE_PHARMACIST'] },
    { label: 'Billing', path: '/billing', icon: Receipt, roles: ['ROLE_ADMIN', 'ROLE_RECEPTIONIST', 'ROLE_PATIENT'] },
    { label: 'Administration', path: '/admin', icon: ShieldCheck, roles: ['ROLE_ADMIN'] },
    { label: 'Profile', path: '/profile', icon: User, roles: ['*'] },
  ];

  const visibleNav = navItems.filter(item => {
    if (item.roles.includes('*')) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <div className="min-h-screen bg-slate-100/75 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-white font-display tracking-tight block">HealthCare</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-teal-400">Hospital PMS</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-600/30 text-teal-300 font-bold flex items-center justify-center border border-teal-500/30">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.fullName}</p>
              <div className="mt-0.5">
                <RoleBadge role={user?.role} />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition duration-150 ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
              Hospital Patient Management System &bull; HealthCare 1.0
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
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
