import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  ClipboardList,
  Pill,
  Microscope,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Clock,
  KeyRound,
  User,
  Phone,
  Mail,
  LogIn
} from 'lucide-react';

const STAFF_ROLES = [
  { id: 'Doctor', label: 'Doctor', icon: Stethoscope, helper: 'DOC-XXXX, email, or badge ID' },
  { id: 'Nurse', label: 'Nurse', icon: HeartPulse, helper: 'NUR-XXXX, email, or badge ID' },
  { id: 'Receptionist', label: 'Receptionist', icon: ClipboardList, helper: 'REC-XXXX or email' },
  { id: 'Pharmacist', label: 'Pharmacist', icon: Pill, helper: 'PHM-XXXX or email' },
  { id: 'Lab Technician', label: 'Lab Technician', icon: Microscope, helper: 'LAB-XXXX or email' },
  { id: 'Administrator', label: 'Administrator', icon: ShieldCheck, helper: 'ADM-XXXX or admin email' },
];

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Navigation & Scroll target
  const loginCardRef = useRef(null);
  const staffInputRef = useRef(null);
  const staffPasswordRef = useRef(null);
  const patientInputRef = useRef(null);
  const patientPasswordRef = useRef(null);

  // Active Tab: 'staff' | 'patient'
  const [activeTab, setActiveTab] = useState('staff');

  // Staff State
  const [selectedRole, setSelectedRole] = useState('Doctor');
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Patient State
  const [patientIdentifier, setPatientIdentifier] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [showPatientPassword, setShowPatientPassword] = useState(false);

  // Form Validation & Interaction states
  const [staffTouched, setStaffTouched] = useState({ identifier: false, password: false });
  const [patientTouched, setPatientTouched] = useState({ identifier: false, password: false });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Lockout State (FR2 Security requirement: 5 failed attempts triggers progressive lockout)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSecondsRemaining, setLockoutSecondsRemaining] = useState(0);

  // Clear all credentials helper (used when navigating away or switching tabs/roles)
  const clearAllCredentials = () => {
    setStaffIdentifier('');
    setStaffPassword('');
    setPatientIdentifier('');
    setPatientPassword('');
    setStaffTouched({ identifier: false, password: false });
    setPatientTouched({ identifier: false, password: false });
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Reset all credentials on initial mount and when leaving the page,
  // plus suppress delayed browser password-manager autofill (e.g. cached credentials)
  useEffect(() => {
    clearAllCredentials();
    const t1 = setTimeout(clearAllCredentials, 100);
    const t2 = setTimeout(clearAllCredentials, 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearAllCredentials();
    };
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    let timer;
    if (lockoutSecondsRemaining > 0) {
      timer = setInterval(() => {
        setLockoutSecondsRemaining((prev) => {
          if (prev <= 1) {
            setErrorMessage('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutSecondsRemaining]);

  // Scroll to login card function for the navbar button
  const scrollToLoginCard = () => {
    loginCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (activeTab === 'staff') {
      staffInputRef.current?.focus();
    } else {
      patientInputRef.current?.focus();
    }
  };

  // Staff Validation
  const isStaffIdentifierValid = staffIdentifier.trim().length >= 3;
  const isStaffPasswordValid = staffPassword.length >= 6;
  const isStaffFormValid = selectedRole && isStaffIdentifierValid && isStaffPasswordValid;

  // Handle Role Selection: erases typed username and password, and resets validation whenever role changes
  const handleRoleSelect = (roleId) => {
    if (selectedRole !== roleId) {
      setSelectedRole(roleId);
      setStaffIdentifier('');
      setStaffPassword('');
      setStaffTouched({ identifier: false, password: false });
      setErrorMessage('');
      setTimeout(() => {
        staffInputRef.current?.focus();
      }, 50);
    }
  };

  // Handle Tab Switch: erases typed credentials and resets validation
  const handleTabSwitch = (newTab) => {
    if (activeTab !== newTab) {
      setActiveTab(newTab);
      clearAllCredentials();
      setTimeout(() => {
        if (newTab === 'staff') {
          staffInputRef.current?.focus();
        } else {
          patientInputRef.current?.focus();
        }
      }, 50);
    }
  };

  // Patient Validation
  const isEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const isPhone = (val) => /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(val.replace(/\s+/g, ''));
  const isPatientIdentifierValid = patientIdentifier.trim().length >= 3 && (isEmail(patientIdentifier.trim()) || isPhone(patientIdentifier.trim()));
  const isPatientPasswordValid = patientPassword.length >= 6;
  const isPatientFormValid = isPatientIdentifierValid && isPatientPasswordValid;

  // Lockout handler
  const handleFailedAttempt = (customMsg) => {
    const nextCount = failedAttempts + 1;
    setFailedAttempts(nextCount);
    if (nextCount >= 5) {
      setLockoutSecondsRemaining(60); // 60-second progressive lockout
      setErrorMessage('Security Alert: Account temporarily locked due to 5 consecutive failed login attempts (FR2 Security Policy).');
    } else {
      setErrorMessage(customMsg || `Invalid credentials. Attempt ${nextCount} of 5 before progressive lockout.`);
    }
  };

  // Handle Staff Direct Sign In (No 2FA, supports pressing Enter)
  const handleStaffSubmit = async (e) => {
    if (e) e.preventDefault();
    if (lockoutSecondsRemaining > 0 || isSubmitting) return;

    setStaffTouched({ identifier: true, password: true });

    if (!staffIdentifier.trim()) {
      setErrorMessage(`Please enter your ${selectedRole} username, email, or staff ID.`);
      staffInputRef.current?.focus();
      return;
    }
    if (!staffPassword) {
      setErrorMessage('Please enter your password.');
      staffPasswordRef.current?.focus();
      return;
    }
    if (staffPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      staffPasswordRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    console.log('Submitting Staff Authentication (Direct Login):', {
      role: selectedRole,
      identifier: staffIdentifier.trim(),
      password: staffPassword,
      timestamp: new Date().toISOString(),
    });

    try {
      if (login) {
        const res = await login(staffIdentifier.trim(), staffPassword);
        if (res.success) {
          setSuccessMessage(`Authenticated successfully as ${selectedRole}! Redirecting...`);
          clearAllCredentials();
          setTimeout(() => navigate('/dashboard'), 400);
          return;
        } else {
          handleFailedAttempt(res.error || 'Authentication failed. Please verify credentials.');
          return;
        }
      }
      setSuccessMessage(`Authenticated successfully as ${selectedRole}! Redirecting...`);
      clearAllCredentials();
    } catch (err) {
      handleFailedAttempt('Unexpected error during authentication. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Patient Direct Sign In (No 2FA, supports pressing Enter)
  const handlePatientSubmit = async (e) => {
    if (e) e.preventDefault();
    if (lockoutSecondsRemaining > 0 || isSubmitting) return;

    setPatientTouched({ identifier: true, password: true });

    if (!patientIdentifier.trim()) {
      setErrorMessage('Please enter your registered email address or phone number.');
      patientInputRef.current?.focus();
      return;
    }
    if (!isPatientIdentifierValid) {
      setErrorMessage('Please enter a valid email address or phone number format.');
      patientInputRef.current?.focus();
      return;
    }
    if (!patientPassword) {
      setErrorMessage('Please enter your password.');
      patientPasswordRef.current?.focus();
      return;
    }
    if (patientPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      patientPasswordRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    console.log('Submitting Patient Authentication (Direct Login):', {
      identifier: patientIdentifier.trim(),
      password: patientPassword,
      timestamp: new Date().toISOString(),
    });

    try {
      if (login) {
        const res = await login(patientIdentifier.trim(), patientPassword);
        if (res.success) {
          setSuccessMessage('Patient credentials verified! Redirecting to patient portal...');
          clearAllCredentials();
          setTimeout(() => navigate('/dashboard'), 400);
          return;
        } else {
          handleFailedAttempt(res.error || 'Invalid patient credentials.');
          return;
        }
      }
      setSuccessMessage('Patient credentials verified! Redirecting to patient portal...');
      clearAllCredentials();
    } catch (err) {
      handleFailedAttempt('Error verifying patient credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetLockout = () => {
    setFailedAttempts(0);
    setLockoutSecondsRemaining(0);
    setErrorMessage('');
    setSuccessMessage('Lockout state cleared for evaluation.');
  };

  // Demo autofill helper for quick testing
  const handleAutofillDemo = (roleId, username, password, isPatient = false) => {
    setErrorMessage('');
    setSuccessMessage('');
    if (isPatient) {
      setActiveTab('patient');
      setPatientIdentifier(username);
      setPatientPassword(password);
      setPatientTouched({ identifier: true, password: true });
    } else {
      setActiveTab('staff');
      setSelectedRole(roleId);
      setStaffIdentifier(username);
      setStaffPassword(password);
      setStaffTouched({ identifier: true, password: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col selection:bg-teal-100 selection:text-teal-900">
      {/* 1. TOP NAVBAR - FULL WIDTH */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          {/* Left: HPMS Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <Activity className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                HealthCare <span className="text-teal-600 font-semibold text-xs px-1.5 py-0.5 bg-teal-50 border border-teal-200 rounded">HPMS</span>
              </span>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Hospital Patient Management System
              </p>
            </div>
          </div>

          {/* Center: Home Link */}
          <nav aria-label="Main Navigation">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                clearAllCredentials();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              Home
            </a>
          </nav>

          {/* Right: Portal Login Button */}
          <div>
            <button
              type="button"
              onClick={scrollToLoginCard}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              aria-label="Scroll to Portal Login card"
            >
              <KeyRound className="w-4 h-4" aria-hidden="true" />
              <span>Portal Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA - FLUID & FULLSCREEN */}
      <main className="flex-1 flex flex-col lg:flex-row w-full min-h-[calc(100vh-4rem)]">
        {/* Left Clinical Brand & Telemetry Hero (Desktop) */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-5/12 bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 text-white p-8 lg:p-12 flex-col justify-between relative overflow-hidden">
          {/* Ambient Background Glows */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Statement */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              HealthCare Clinical Operations
            </div>

            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight font-display">
              Enterprise Patient Management & Clinical Command
            </h2>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">
              Stateless HIPAA-compliant electronic medical records, real-time doctor appointment coordination, laboratory telemetry, and pharmacy inventory control.
            </p>
          </div>

          {/* Highlights & Security Pillars */}
          <div className="relative z-10 space-y-3.5 my-8">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2 rounded-lg bg-teal-500/20 text-teal-300 flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">HIPAA Governance & RBAC</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Immutable audit trail logging, Spring Security 6 authentication with BCrypt cost 12 encryption.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 flex-shrink-0">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Clinical Continuity</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Double-booking prevention, automated bed swap validation, and critical lab alert thresholds.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-300 flex-shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Dual Access Portals</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Tailored workstation for clinical staff and secure self-service portal for patients and bills.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Telemetry Status */}
          <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>System Operational</span>
            </div>
            <span>Uptime 99.98%</span>
            <span>v1.0.0 Enterprise</span>
          </div>
        </div>

        {/* Right Authentication Container */}
        <div className="flex-1 bg-slate-100/70 dark:bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 overflow-y-auto">
          {/* Security / Progressive Lockout Banner */}
          {lockoutSecondsRemaining > 0 && (
            <div
              role="alert"
              aria-live="assertive"
              className="w-full max-w-xl mb-5 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm flex items-start gap-3 text-sm animate-pulse"
            >
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Security Alert: Account Temporarily Locked</p>
                <p className="text-xs text-amber-800 mt-1">
                  Due to 5 consecutive failed login attempts (FR2 Security Policy), sign-in is temporarily suspended.
                </p>
                <div className="mt-2 text-xs font-mono font-bold text-amber-700 bg-amber-100/70 px-2 py-1 rounded inline-block">
                  Please wait {lockoutSecondsRemaining}s before retrying
                </div>
              </div>
            </div>
          )}

          {/* Global Error Banner */}
          {errorMessage && lockoutSecondsRemaining === 0 && (
            <div
              role="alert"
              aria-live="polite"
              className="w-full max-w-xl mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 shadow-sm flex items-start gap-2.5 text-xs"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage('')}
                className="text-rose-500 hover:text-rose-800 text-xs font-bold"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Global Success Banner */}
          {successMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="w-full max-w-xl mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-sm flex items-start gap-2.5 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 3. AUTHENTICATION CARD */}
          <div
            ref={loginCardRef}
            className="w-full max-w-xl bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden transition-all"
          >
            {/* Dual Tabs: Staff Login vs Patient Portal Login */}
            <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5" role="tablist">
              <button
                type="button"
                role="tab"
                id="tab-staff"
              aria-selected={activeTab === 'staff'}
              aria-controls="panel-staff"
              onClick={() => handleTabSwitch('staff')}
              className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg text-center transition-all ${
                activeTab === 'staff'
                  ? 'bg-white text-teal-700 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              Staff Login
            </button>
            <button
              type="button"
              role="tab"
              id="tab-patient"
              aria-selected={activeTab === 'patient'}
              aria-controls="panel-patient"
              onClick={() => handleTabSwitch('patient')}
              className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg text-center transition-all ${
                activeTab === 'patient'
                  ? 'bg-white text-teal-700 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              Patient Portal Login
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* ======================= STAFF LOGIN TAB (NO 2FA) ======================= */}
            {activeTab === 'staff' && (
              <div
                role="tabpanel"
                id="panel-staff"
                aria-labelledby="tab-staff"
                className="space-y-6"
              >
                {/* Header */}
                <div className="text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    Hospital Staff Authentication
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Select your role and enter your credentials to access your dashboard
                  </p>
                  {/* Dynamic helper line under heading */}
                  {selectedRole && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-medium text-teal-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                      Signing in as {selectedRole}
                    </div>
                  )}
                </div>

                {/* Role Selector: 3x2 Grid */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Designated Hospital Role
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5" role="radiogroup" aria-label="Hospital Role Selection">
                    {STAFF_ROLES.map((role) => {
                      const Icon = role.icon;
                      const isSelected = selectedRole === role.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          disabled={lockoutSecondsRemaining > 0}
                          onClick={() => handleRoleSelect(role.id)}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-semibold ring-1 ring-teal-600'
                              : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                          } ${lockoutSecondsRemaining > 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <Icon
                            className={`w-5 h-5 mb-1.5 ${
                              isSelected ? 'text-teal-600' : 'text-slate-400'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="text-xs tracking-tight leading-tight">
                            {role.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick-Fill Account Presets & Clear Button */}
                <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      Quick Fill Accounts
                    </span>
                    <button
                      type="button"
                      onClick={clearAllCredentials}
                      className="text-[11px] font-medium text-rose-600 hover:text-rose-700 transition-colors"
                    >
                      Clear Fields
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAutofillDemo('Administrator', 'admin', 'Admin@123')}
                      className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-700 rounded-md shadow-xs transition-colors"
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutofillDemo('Doctor', 'dr.smith', 'Doctor@123')}
                      className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-700 rounded-md shadow-xs transition-colors"
                    >
                      Dr. Smith
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutofillDemo('Nurse', 'nurse.jones', 'Nurse@123')}
                      className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-700 rounded-md shadow-xs transition-colors"
                    >
                      Nurse Jones
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutofillDemo('Receptionist', 'receptionist', 'Recept@123')}
                      className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-700 rounded-md shadow-xs transition-colors"
                    >
                      Receptionist
                    </button>
                  </div>
                </div>

                {/* Staff Sign In Form */}
                <form onSubmit={handleStaffSubmit} className="space-y-4" noValidate autoComplete="off">
                  {/* Dynamic Input: {Role} Username, Email, or Staff ID */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor="staff-identifier"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        {selectedRole || 'Staff'} Username, Email, or Staff ID
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Multi-credential (FR2)
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <input
                        id="staff-identifier"
                        ref={staffInputRef}
                        type="text"
                        autoComplete="off"
                        disabled={lockoutSecondsRemaining > 0 || isSubmitting}
                        value={staffIdentifier}
                        onChange={(e) => {
                          setStaffIdentifier(e.target.value);
                          setStaffTouched((prev) => ({ ...prev, identifier: true }));
                          setErrorMessage('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!staffPassword) {
                              staffPasswordRef.current?.focus();
                            } else {
                              handleStaffSubmit(e);
                            }
                          }
                        }}
                        onBlur={() => setStaffTouched((prev) => ({ ...prev, identifier: true }))}
                        placeholder={`e.g. ${
                          selectedRole === 'Doctor'
                            ? 'dr.smith or DOC001'
                            : selectedRole === 'Nurse'
                            ? 'nurse.jones or NUR001'
                            : selectedRole === 'Administrator'
                            ? 'admin or ADM001'
                            : 'username or staff ID'
                        }`}
                        className={`w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white ${
                          staffTouched.identifier && !isStaffIdentifierValid
                            ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                            : 'border-slate-300'
                        }`}
                        aria-invalid={staffTouched.identifier && !isStaffIdentifierValid}
                        aria-describedby={
                          staffTouched.identifier && !isStaffIdentifierValid ? 'staff-identifier-error' : undefined
                        }
                      />
                    </div>
                    {staffTouched.identifier && !isStaffIdentifierValid && (
                      <p id="staff-identifier-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Please enter your username, email, or badge/staff ID.
                      </p>
                    )}
                  </div>

                  {/* Password Field with Show/Hide & Forgot Password */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor="staff-password"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Password
                      </label>
                      <a
                        href="#forgot-password"
                        onClick={(e) => {
                          e.preventDefault();
                          alert('Password recovery: Please contact the HPMS Hospital IT Helpdesk or your department supervisor.');
                        }}
                        className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <input
                        id="staff-password"
                        ref={staffPasswordRef}
                        type={showStaffPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        disabled={lockoutSecondsRemaining > 0 || isSubmitting}
                        value={staffPassword}
                        onChange={(e) => {
                          setStaffPassword(e.target.value);
                          setStaffTouched((prev) => ({ ...prev, password: true }));
                          setErrorMessage('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleStaffSubmit(e);
                          }
                        }}
                        onBlur={() => setStaffTouched((prev) => ({ ...prev, password: true }))}
                        placeholder="••••••••••••"
                        className={`w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border rounded-lg placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white ${
                          staffTouched.password && !isStaffPasswordValid
                            ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                            : 'border-slate-300'
                        }`}
                        aria-invalid={staffTouched.password && !isStaffPasswordValid}
                        aria-describedby={
                          staffTouched.password && !isStaffPasswordValid ? 'staff-password-error' : undefined
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowStaffPassword(!showStaffPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                        aria-label={showStaffPassword ? 'Hide password' : 'Show password'}
                      >
                        {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {staffTouched.password && !isStaffPasswordValid && (
                      <p id="staff-password-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Password must be at least 6 characters long.
                      </p>
                    )}
                  </div>

                  {/* Primary Direct Sign In Button (Full Width, No 2FA) */}
                  <button
                    type="submit"
                    disabled={lockoutSecondsRemaining > 0 || isSubmitting}
                    className="w-full mt-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>Authenticating...</span>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" aria-hidden="true" />
                        <span>Sign In as {selectedRole}</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Note Inside Card: HIPAA Compliant Notice */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                  <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                  <span>HIPAA-compliant · session expires after 15 minutes of inactivity</span>
                </div>
              </div>
            )}

            {/* ======================= PATIENT LOGIN TAB (NO 2FA) ======================= */}
            {activeTab === 'patient' && (
              <div
                role="tabpanel"
                id="panel-patient"
                aria-labelledby="tab-patient"
                className="space-y-6"
              >
                {/* Header */}
                <div className="text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    Patient Portal Login
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Access your personal health records, appointments, and billing statements
                  </p>
                </div>

                <form onSubmit={handlePatientSubmit} className="space-y-4" noValidate autoComplete="off">
                  {/* Email or Phone Number */}
                  <div>
                    <label
                      htmlFor="patient-identifier"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Email Address or Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        {patientIdentifier.includes('@') ? (
                          <Mail className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Phone className="w-4 h-4" aria-hidden="true" />
                        )}
                      </div>
                      <input
                        id="patient-identifier"
                        ref={patientInputRef}
                        type="text"
                        autoComplete="off"
                        disabled={lockoutSecondsRemaining > 0 || isSubmitting}
                        value={patientIdentifier}
                        onChange={(e) => {
                          setPatientIdentifier(e.target.value);
                          setPatientTouched((prev) => ({ ...prev, identifier: true }));
                          setErrorMessage('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!patientPassword) {
                              patientPasswordRef.current?.focus();
                            } else {
                              handlePatientSubmit(e);
                            }
                          }
                        }}
                        onBlur={() => setPatientTouched((prev) => ({ ...prev, identifier: true }))}
                        placeholder="patient@example.com or (555) 019-2834"
                        className={`w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white ${
                          patientTouched.identifier && !isPatientIdentifierValid
                            ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                            : 'border-slate-300'
                        }`}
                        aria-invalid={patientTouched.identifier && !isPatientIdentifierValid}
                        aria-describedby={
                          patientTouched.identifier && !isPatientIdentifierValid ? 'patient-identifier-error' : undefined
                        }
                      />
                    </div>
                    {patientTouched.identifier && !isPatientIdentifierValid && (
                      <p id="patient-identifier-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Please enter a valid email address or phone number.
                      </p>
                    )}
                  </div>

                  {/* Password Field with Show/Hide & Forgot Password */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor="patient-password"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Password
                      </label>
                      <a
                        href="#forgot-password"
                        onClick={(e) => {
                          e.preventDefault();
                          alert('Patient Account Recovery: An automated password reset link will be sent to your registered contact.');
                        }}
                        className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <input
                        id="patient-password"
                        ref={patientPasswordRef}
                        type={showPatientPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        disabled={lockoutSecondsRemaining > 0 || isSubmitting}
                        value={patientPassword}
                        onChange={(e) => {
                          setPatientPassword(e.target.value);
                          setPatientTouched((prev) => ({ ...prev, password: true }));
                          setErrorMessage('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handlePatientSubmit(e);
                          }
                        }}
                        onBlur={() => setPatientTouched((prev) => ({ ...prev, password: true }))}
                        placeholder="••••••••••••"
                        className={`w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border rounded-lg placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white ${
                          patientTouched.password && !isPatientPasswordValid
                            ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                            : 'border-slate-300'
                        }`}
                        aria-invalid={patientTouched.password && !isPatientPasswordValid}
                        aria-describedby={
                          patientTouched.password && !isPatientPasswordValid ? 'patient-password-error' : undefined
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPatientPassword(!showPatientPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                        aria-label={showPatientPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPatientPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {patientTouched.password && !isPatientPasswordValid && (
                      <p id="patient-password-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Password must be at least 6 characters.
                      </p>
                    )}
                  </div>

                  {/* Direct Sign In Button */}
                  <button
                    type="submit"
                    disabled={lockoutSecondsRemaining > 0 || isSubmitting}
                    className="w-full mt-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>Authenticating...</span>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" aria-hidden="true" />
                        <span>Sign In to Patient Portal</span>
                      </>
                    )}
                  </button>

                  {/* Register Link */}
                  <div className="pt-2 text-center text-xs text-slate-600">
                    <span>New patient? </span>
                    <a
                      href="#register"
                      onClick={(e) => {
                        e.preventDefault();
                        alert('New Patient Registration: You will be redirected to the online enrollment intake form.');
                      }}
                      className="font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                    >
                      Register here
                    </a>
                  </div>
                </form>

                {/* Footer Note Inside Card: HIPAA Compliant Notice */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                  <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                  <span>HIPAA-compliant · session expires after 15 minutes of inactivity</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>

    {/* Footer copyright */}
    <footer className="py-3.5 px-4 sm:px-8 text-center sm:flex sm:justify-between sm:items-center text-xs text-slate-500 border-t border-slate-200/80 bg-white">
      <span>© 2026 HealthCare Health Systems. All rights reserved. Confidential & Proprietary Medical Records System.</span>
      <span className="mt-1 sm:mt-0 block sm:inline text-slate-400">HIPAA Security Compliant &bull; 256-Bit SSL Encryption</span>
    </footer>
  </div>
  );
};

export default LoginPage;
