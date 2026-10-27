import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/apiService';
import { Modal } from '../components/Modal';
import {
  Activity,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  Heart,
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
  Users,
  Phone,
  Mail,
  LogIn,
  Calendar,
  Sparkles
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, login, logout } = useAuth();

  // Navigation & Scroll target
  const loginCardRef = useRef(null);
  const staffInputRef = useRef(null);
  const staffPasswordRef = useRef(null);
  const patientInputRef = useRef(null);
  const patientPasswordRef = useRef(null);

  // Default to patient portal login unless staff login is explicitly requested
  const isStaffRequested = searchParams.get('tab') === 'staff' || location.state?.activeTab === 'staff';
  const isPatientRequested = !isStaffRequested || searchParams.get('tab') === 'patient' || location.state?.activeTab === 'patient';
  const incomingDetails = location.state?.patientDetails || null;

  // Active Tab: 'patient' (default) | 'staff'
  const [activeTab, setActiveTab] = useState(() => (isStaffRequested ? 'staff' : 'patient'));

  // Staff State
  const [selectedRole, setSelectedRole] = useState('Doctor');
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Patient State - completely clear by default
  const [patientIdentifier, setPatientIdentifier] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [showPatientPassword, setShowPatientPassword] = useState(false);
  const [trackingDetails, setTrackingDetails] = useState(null);

  // Form Validation & Interaction states
  const [staffTouched, setStaffTouched] = useState({ identifier: false, password: false });
  const [patientTouched, setPatientTouched] = useState({ identifier: false, password: false });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Lockout State (FR2 Security requirement: 5 failed attempts triggers progressive lockout)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSecondsRemaining, setLockoutSecondsRemaining] = useState(0);

  // Patient Self-Service Activation Modal State
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [activationForm, setActivationForm] = useState({ identifier: '', newPassword: '', confirmPassword: '' });
  const [showActivationPassword, setShowActivationPassword] = useState(false);
  const [showActivationConfirmPassword, setShowActivationConfirmPassword] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');
  const [activationSubmitting, setActivationSubmitting] = useState(false);

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

  useEffect(() => {
    // Force complete clearance of all credential fields on page load
    setStaffIdentifier('');
    setStaffPassword('');
    setPatientIdentifier('');
    setPatientPassword('');
    setTrackingDetails(null);
    setStaffTouched({ identifier: false, password: false });
    setPatientTouched({ identifier: false, password: false });
    setErrorMessage('');
    setSuccessMessage('');

    if (isStaffRequested) {
      setActiveTab('staff');
      return;
    }

    // Default or patient route
    if (user && user.role !== 'ROLE_PATIENT') {
      logout();
    }
    setActiveTab('patient');
  }, [location.pathname, isPatientRequested, isStaffRequested]);

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
  const isPatientIdentifierValid = patientIdentifier.trim().length >= 3;
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

  // Handle Patient Self-Service Account Activation & Custom Password Creation
  const handleActivationSubmit = async (e) => {
    e.preventDefault();
    setActivationError('');
    setActivationSuccess('');

    if (!activationForm.identifier.trim()) {
      setActivationError('Please enter your registered 10-digit mobile number or Patient ID (MRN).');
      return;
    }
    if (!activationForm.newPassword || activationForm.newPassword.length < 6) {
      setActivationError('Password must be at least 6 characters long.');
      return;
    }
    if (activationForm.newPassword !== activationForm.confirmPassword) {
      setActivationError('Passwords do not match. Please verify both passwords match.');
      return;
    }

    setActivationSubmitting(true);
    try {
      const res = await authApi.activatePatient({
        identifier: activationForm.identifier.trim(),
        newPassword: activationForm.newPassword.trim()
      });
      const data = res.data;
      
      // Store authenticated session
      const userData = {
        id: data.id,
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        staffId: data.staffId,
        departmentId: data.departmentId,
        departmentName: data.departmentName || null,
      };
      localStorage.setItem('hpms_token', data.accessToken);
      localStorage.setItem('hpms_user', JSON.stringify(userData));

      setActivationSuccess('Account successfully activated with your chosen password! Loading your Patient Portal...');
      setTimeout(() => {
        setIsActivationModalOpen(false);
        navigate('/dashboard');
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Patient activation failed:', err);
      const msg = err.response?.data?.message || err.message || 'Activation failed. Please check your mobile number or Patient ID.';
      setActivationError(msg);
    } finally {
      setActivationSubmitting(false);
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
    <div className="min-h-screen bg-slate-100/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-sky-500/20 selection:text-blue-700 dark:selection:text-sky-300">
      {/* 1. TOP NAVBAR - FULL WIDTH */}
      <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        {/* Luminous Neon Gradient Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] palette-gradient-bar" />
        <div className="w-full px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          {/* Left: HPMS Logo & Name */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 font-display">
                Health<span className="palette-gradient-text">Care</span>
                <span className="text-blue-600 dark:text-sky-300 font-bold text-[10px] px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded-md shadow-xs uppercase tracking-wider">HPMS</span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block font-medium">
                Hospital Patient Management System
              </p>
            </div>
          </Link>

          {/* Center: Home Link */}
          <nav aria-label="Main Navigation">
            <Link
              to="/"
              className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-300 transition-colors px-3.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
            >
              Back to Home
            </Link>
          </nav>

          {/* Right: Portal Login Button */}
          <div>
            <button
              type="button"
              onClick={scrollToLoginCard}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 hover:from-blue-800 hover:to-sky-600 active:scale-95 transition-all shadow-md shadow-blue-500/25 cursor-pointer"
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
        <div className="hidden lg:flex lg:w-5/12 xl:w-5/12 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8 lg:p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800/80">
          {/* Ambient Background Glows using Blue Shades */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-800/25 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Statement */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/40 text-sky-300 text-xs font-black mb-6 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              HealthCare Clinical Operations Command
            </div>

            <h2 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight font-display">
              Enterprise Patient Management & Clinical Command
            </h2>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed font-medium">
              Stateless HIPAA-compliant electronic medical records, real-time doctor appointment coordination, laboratory telemetry, and pharmacy inventory control.
            </p>
          </div>

          {/* Highlights & Security Pillars */}
          <div className="relative z-10 space-y-3.5 my-8">
            <div className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md flex items-start gap-3.5 transition-all">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 text-white flex-shrink-0 shadow-md shadow-blue-500/30">
                <ShieldCheck className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">HIPAA Governance & RBAC</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed font-medium">
                  Immutable audit trail logging, Spring Security 6 authentication with BCrypt cost 12 encryption.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md flex items-start gap-3.5 transition-all">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-800 to-blue-600 text-white flex-shrink-0 shadow-md shadow-blue-700/30">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Clinical Continuity</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed font-medium">
                  Double-booking prevention, automated bed swap validation, and critical lab alert thresholds.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md flex items-start gap-3.5 transition-all">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 text-white flex-shrink-0 shadow-md shadow-blue-500/30">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Dual Access Portals</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed font-medium">
                  Tailored workstation for clinical staff and secure self-service portal for patients and bills.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Telemetry Status */}
          <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-sky-300 font-bold">System Operational</span>
            </div>
            <span>Uptime 99.98%</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px] font-bold border border-blue-500/30">v1.0.0 Enterprise</span>
          </div>
        </div>

        {/* Right Authentication Container */}
        <div className="flex-1 bg-gradient-to-br from-slate-100/90 via-slate-50 to-slate-100/90 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 overflow-y-auto">
          {/* Security / Progressive Lockout Banner */}
          {lockoutSecondsRemaining > 0 && (
            <div
              role="alert"
              aria-live="assertive"
              className="w-full max-w-xl mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-md flex items-start gap-3 text-sm animate-pulse"
            >
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Security Alert: Account Temporarily Locked</p>
                <p className="text-xs text-amber-800 mt-1">
                  Due to 5 consecutive failed login attempts (FR2 Security Policy), sign-in is temporarily suspended.
                </p>
                <div className="mt-2 text-xs font-mono font-bold text-amber-700 bg-amber-100/70 px-2.5 py-1 rounded-md inline-block border border-amber-300">
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
              className="w-full max-w-xl mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 shadow-md flex items-start gap-2.5 text-xs animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-medium">{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage('')}
                className="text-rose-500 hover:text-rose-800 text-xs font-black cursor-pointer"
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
              className="w-full max-w-xl mb-5 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 shadow-md flex items-start gap-2.5 text-xs animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {/* 3. AUTHENTICATION CARD WITH LUMINOUS GRADIENT BORDER */}
          <div
            ref={loginCardRef}
            className="w-full max-w-xl p-[1.5px] rounded-[28px] bg-gradient-to-tr from-blue-700/70 via-sky-400/60 via-blue-600/70 to-sky-300/70 shadow-2xl shadow-blue-600/15"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[26px] overflow-hidden">
              {/* Dual Tabs: Staff Login vs Patient Portal Login */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-1.5" role="tablist">
                <button
                  type="button"
                  role="tab"
                  id="tab-staff"
                  aria-selected={activeTab === 'staff'}
                  aria-controls="panel-staff"
                  onClick={() => handleTabSwitch('staff')}
                  className={`flex-1 py-3 px-4 text-sm rounded-2xl text-center transition-all cursor-pointer ${
                    activeTab === 'staff'
                      ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white shadow-md shadow-blue-600/25 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
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
                  className={`flex-1 py-3 px-4 text-sm rounded-2xl text-center transition-all cursor-pointer ${
                    activeTab === 'patient'
                      ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white shadow-md shadow-blue-600/25 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
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
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
                        Hospital Staff Authentication
                      </h1>
                      <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Select your role and enter your credentials to access your dashboard
                      </p>
                      {/* Dynamic helper line under heading */}
                      {selectedRole && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-blue-950/60 border border-sky-200 dark:border-blue-800 text-xs font-bold text-blue-800 dark:text-sky-200 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                          Signing in as {selectedRole}
                        </div>
                      )}
                    </div>

                    {/* Role Selector: 3x2 Grid */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
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
                              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                                isSelected
                                  ? 'border-sky-500 bg-sky-50/80 dark:bg-blue-950/60 text-blue-950 dark:text-sky-200 font-black ring-2 ring-sky-500/40 shadow-sm scale-[1.02]'
                                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300'
                              } ${lockoutSecondsRemaining > 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <Icon
                                className={`w-5 h-5 mb-1.5 ${
                                  isSelected ? 'text-blue-600 dark:text-sky-400' : 'text-slate-400'
                                }`}
                                aria-hidden="true"
                              />
                              <span className="text-xs tracking-tight leading-tight font-bold">
                                {role.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick-Fill Account Presets & Clear Button */}
                    <div className="mb-4 p-3.5 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Quick Fill Demo Accounts
                        </span>
                        <button
                          type="button"
                          onClick={clearAllCredentials}
                          className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline transition-colors cursor-pointer"
                        >
                          Clear Fields
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAutofillDemo('Administrator', 'admin', 'Admin@123')}
                          className="px-3 py-1 text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          Admin
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAutofillDemo('Doctor', 'dr.patel', 'Doctor@123')}
                          className="px-3 py-1 text-xs font-bold bg-sky-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 border border-sky-200 dark:border-blue-800 hover:bg-sky-100 rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          Doctor
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAutofillDemo('Nurse', 'nurse', 'Nurse@123')}
                          className="px-3 py-1 text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          Nurse
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAutofillDemo('Receptionist', 'receptionist', 'Recept@123')}
                          className="px-3 py-1 text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          Receptionist
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAutofillDemo('Pharmacist', 'pharmacist', 'Pharm@123')}
                          className="px-3 py-1 text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          Pharmacist
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAutofillDemo('Lab Technician', 'labtech', 'LabTech@123')}
                          className="px-3 py-1 text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          Lab Tech
                        </button>
                      </div>
                    </div>

                {/* Staff Sign In Form */}
                <form onSubmit={handleStaffSubmit} className="space-y-4" noValidate autoComplete="off">
                  {/* Invisible decoy fields to intercept and prevent browser autofill */}
                  <input type="text" name="hpms_prevent_autofill_u" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                  <input type="password" name="hpms_prevent_autofill_p" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
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
                        name="staff_identifier_unq"
                        ref={staffInputRef}
                        type="text"
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
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
                            ? 'dr.patel or DOC001'
                            : selectedRole === 'Nurse'
                            ? 'nurse or NUR001'
                            : selectedRole === 'Administrator'
                            ? 'admin or ADM001'
                            : selectedRole === 'Pharmacist'
                            ? 'pharmacist or PHM001'
                            : selectedRole === 'Lab Technician'
                            ? 'labtech or LAB001'
                            : 'receptionist or REC001'
                        }`}
                        className={`w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50/80 border rounded-xl placeholder-slate-400 transition-all focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 focus:bg-white shadow-xs ${
                          staffTouched.identifier && !isStaffIdentifierValid
                            ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        aria-invalid={staffTouched.identifier && !isStaffIdentifierValid}
                        aria-describedby={
                          staffTouched.identifier && !isStaffIdentifierValid ? 'staff-identifier-error' : undefined
                        }
                      />
                    </div>
                    {staffTouched.identifier && !isStaffIdentifierValid && (
                      <p id="staff-identifier-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
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
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
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
                        name="staff_password_unq"
                        ref={staffPasswordRef}
                        type={showStaffPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-form-type="other"
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
                        className={`w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50/80 border rounded-xl placeholder-slate-400 transition-all focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 focus:bg-white shadow-xs ${
                          staffTouched.password && !isStaffPasswordValid
                            ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        aria-invalid={staffTouched.password && !isStaffPasswordValid}
                        aria-describedby={
                          staffTouched.password && !isStaffPasswordValid ? 'staff-password-error' : undefined
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowStaffPassword(!showStaffPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={showStaffPassword ? 'Hide password' : 'Show password'}
                      >
                        {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {staffTouched.password && !isStaffPasswordValid && (
                      <p id="staff-password-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Password must be at least 6 characters long.
                      </p>
                    )}
                  </div>

                  {/* Primary Direct Sign In Button */}
                  <button
                    type="submit"
                    disabled={lockoutSecondsRemaining > 0 || isSubmitting}
                    className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 hover:from-blue-800 hover:to-sky-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-600/35 transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Authenticating...
                      </span>
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
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-sky-300 border border-blue-500/30 mb-2">
                    <Heart className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                    <span>Patient Health Portal</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Welcome Back to Your Care Portal
                  </h1>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Secure self-service access to your clinical records, active consultations, prescriptions, and lab reports
                  </p>
                </div>

                {/* Self-Activation Callout Card for Reception-registered Patients */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-blue-600/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-900 dark:text-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-sky-400/15 to-transparent rounded-bl-full pointer-events-none" />
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-700 to-sky-500 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold block text-slate-900 dark:text-white text-sm">Registered at Clinic or First Visit?</span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed block mt-0.5">
                        Hospital receptionists do not issue passwords. Activate your account and create your own private password.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActivationError('');
                      setActivationSuccess('');
                      setActivationForm({ identifier: '', newPassword: '', confirmPassword: '' });
                      setIsActivationModalOpen(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-700 to-sky-500 hover:from-blue-800 hover:to-sky-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 text-xs transition active:scale-95 flex-shrink-0 cursor-pointer text-center relative z-10"
                  >
                    Activate & Set Password
                  </button>
                </div>

                {/* Active Patient Consultation & Tracking Details */}
                {trackingDetails && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 via-cyan-500/10 to-indigo-500/10 border-2 border-sky-300/80 text-xs space-y-3 shadow-md animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-blue-950">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
                        </span>
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">Active OPD Consultation Order</span>
                      </div>
                      <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-blue-600 text-white shadow-xs">
                        {trackingDetails.bookingRef || 'CONFIRMED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] pt-2.5 border-t border-sky-200/80">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Patient Name</span>
                        <strong className="text-slate-900 text-xs">{trackingDetails.name}</strong>
                      </div>
                      {trackingDetails.mrn && (
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Medical Record #</span>
                          <strong className="text-indigo-700 font-mono text-xs">{trackingDetails.mrn}</strong>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Attending Specialist</span>
                        <strong className="text-slate-900">{trackingDetails.doctor}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Department</span>
                        <strong className="text-slate-900">{trackingDetails.department}</strong>
                      </div>
                      {trackingDetails.timeSlot && (
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Consultation Slot</span>
                          <strong className="text-slate-900">{trackingDetails.date} at {trackingDetails.timeSlot}</strong>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Status & Queue</span>
                        <span className="inline-flex items-center gap-1 font-bold text-blue-700">
                          <span className="w-2 h-2 rounded-full bg-sky-500" />
                          Token #{trackingDetails.queueNumber || 1} &bull; {trackingDetails.status || 'SCHEDULED'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/90 border border-sky-200 text-[11px] text-blue-950 flex items-start gap-2.5 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>
                        Your login credentials have been pre-filled below. Click <strong>"Sign In to Track Consultation"</strong> to view live OPD token call, doctor prescriptions, and medical summary.
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick-Fill Patient Presets */}
                <div className="p-3 bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/80 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      Quick Fill Patient Accounts
                    </span>
                    <button
                      type="button"
                      onClick={clearAllCredentials}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                    >
                      Clear Fields
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleAutofillDemo('Patient', 'hari', 'Patient@123', true)}
                      className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:border-sky-500 hover:text-blue-700 hover:bg-sky-50/50 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutofillDemo('Patient', 'robert', 'Patient@123', true)}
                      className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:border-cyan-500 hover:text-cyan-700 hover:bg-cyan-50/50 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      Robert
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutofillDemo('Patient', 'sujatha', 'Patient@123', true)}
                      className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:border-purple-500 hover:text-purple-700 hover:bg-purple-50/50 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Sujatha
                    </button>
                  </div>
                </div>

                <form onSubmit={handlePatientSubmit} className="space-y-4" noValidate autoComplete="off">
                  {/* Invisible decoy fields to intercept and prevent browser autofill */}
                  <input type="text" name="hpms_prevent_autofill_patient_u" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                  <input type="password" name="hpms_prevent_autofill_patient_p" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                  {/* Username, Email or Phone Number */}
                  <div>
                    <label
                      htmlFor="patient-identifier"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Username, Email, or Phone Number
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
                        name="patient_portal_identifier_unq"
                        ref={patientInputRef}
                        type="text"
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
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
                        placeholder="e.g. hari, robert, patient@example.com, or phone"
                        className={`w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50/80 border rounded-xl placeholder-slate-400 transition-all focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 focus:bg-white shadow-xs ${
                          patientTouched.identifier && !isPatientIdentifierValid
                            ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        aria-invalid={patientTouched.identifier && !isPatientIdentifierValid}
                        aria-describedby={
                          patientTouched.identifier && !isPatientIdentifierValid ? 'patient-identifier-error' : undefined
                        }
                      />
                    </div>
                    {patientTouched.identifier && !isPatientIdentifierValid && (
                      <p id="patient-identifier-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Please enter a valid username, email address or phone number.
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
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
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
                        name="patient_portal_password_unq"
                        ref={patientPasswordRef}
                        type={showPatientPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-form-type="other"
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
                        className={`w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50/80 border rounded-xl placeholder-slate-400 transition-all focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 focus:bg-white shadow-xs ${
                          patientTouched.password && !isPatientPasswordValid
                            ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        aria-invalid={patientTouched.password && !isPatientPasswordValid}
                        aria-describedby={
                          patientTouched.password && !isPatientPasswordValid ? 'patient-password-error' : undefined
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPatientPassword(!showPatientPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={showPatientPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPatientPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {patientTouched.password && !isPatientPasswordValid && (
                      <p id="patient-password-error" className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Password must be at least 6 characters.
                      </p>
                    )}
                  </div>

                  {/* Direct Sign In Button */}
                  <button
                    type="submit"
                    disabled={lockoutSecondsRemaining > 0 || isSubmitting}
                    className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 hover:from-blue-800 hover:to-sky-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-600/35 transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Authenticating...
                      </span>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" aria-hidden="true" />
                        <span>{trackingDetails ? 'Sign In to Track Consultation' : 'Sign In to Patient Portal'}</span>
                      </>
                    )}
                  </button>

                  {/* Register & Activation Links */}
                  <div className="pt-2 text-center text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-center gap-2">
                    <div>
                      <span>Registered at hospital? </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActivationError('');
                          setActivationSuccess('');
                          setActivationForm({ identifier: '', newPassword: '', confirmPassword: '' });
                          setIsActivationModalOpen(true);
                        }}
                        className="font-bold text-blue-600 dark:text-sky-400 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        Activate Account
                      </button>
                    </div>
                    <span className="hidden sm:inline text-slate-300">&bull;</span>
                    <div>
                      <span>Need consultation? </span>
                      <a
                        href="/#book-appointment"
                        className="font-bold text-blue-600 dark:text-sky-400 hover:text-blue-800 hover:underline"
                      >
                        Book OPD Consultation
                      </a>
                    </div>
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
      </div>
    </main>

    {/* Patient Account Activation & Password Creation Modal */}
    <Modal
      isOpen={isActivationModalOpen}
      onClose={() => setIsActivationModalOpen(false)}
      title="Patient Portal Account Activation"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleActivationSubmit} className="space-y-4 text-xs">
        <div className="p-3.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/30 flex items-start gap-2.5 text-slate-900 dark:text-white">
          <KeyRound className="w-4 h-4 text-blue-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Create Your Own Secure Password</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              If you were registered by a hospital receptionist, enter your registered 10-digit mobile number or Patient ID (e.g. PAT-2026...) below and create your private password.
            </p>
          </div>
        </div>

        {activationError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{activationError}</span>
          </div>
        )}

        {activationSuccess && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 flex items-start gap-2 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>{activationSuccess}</span>
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Registered Mobile Number or Patient ID (MRN) *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              placeholder="e.g. 9876543210 or PAT-20260917-0017"
              value={activationForm.identifier}
              onChange={(e) => setActivationForm({ ...activationForm, identifier: e.target.value })}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Enter the 10-digit phone number provided at the front desk or your Patient ID card number.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Create New Password *
            </label>
            <div className="relative">
              <input
                type={showActivationPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Min 6 characters"
                value={activationForm.newPassword}
                onChange={(e) => setActivationForm({ ...activationForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 pr-9 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowActivationPassword(!showActivationPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showActivationPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showActivationConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Re-enter password"
                value={activationForm.confirmPassword}
                onChange={(e) => setActivationForm({ ...activationForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 pr-9 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowActivationConfirmPassword(!showActivationConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showActivationConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsActivationModalOpen(false)}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={activationSubmitting}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 hover:from-blue-800 hover:to-sky-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-600/35 transition-all active:scale-[0.99] flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {activationSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Activating Account...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Activate & Access Portal</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>

    {/* Footer copyright */}
    <footer className="py-3.5 px-4 sm:px-8 text-center sm:flex sm:justify-between sm:items-center text-xs text-slate-500 border-t border-slate-200/80 bg-white">
      <span>© 2026 HealthCare Health Systems. All rights reserved. Confidential & Proprietary Medical Records System.</span>
      <span className="mt-1 sm:mt-0 block sm:inline text-slate-400">HIPAA Security Compliant &bull; 256-Bit SSL Encryption</span>
    </footer>
  </div>
  );
};

export default LoginPage;
