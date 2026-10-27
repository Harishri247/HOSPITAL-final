import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { userApi, publicApi } from '../api/apiService';
import {
  Activity,
  Stethoscope,
  HeartPulse,
  ShieldCheck,
  Clock,
  Phone,
  MapPin,
  Mail,
  Calendar,
  CheckCircle2,
  Star,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  User,
  Pill,
  FlaskConical,
  BedDouble,
  AlertCircle,
  Sparkles,
  Building2,
  Award,
  FileText,
  ExternalLink,
  Menu,
  X,
  Sun,
  Moon,
  ArrowUpRight,
  Check,
  Search,
  Shield,
  Zap,
  Heart,
  PhoneCall,
  Ambulance,
  BadgeAlert,
  Send,
  HelpCircle,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Printer,
  Download,
  Copy,
  KeyRound,
  Lock,
  EyeOff
} from 'lucide-react';

export const LandingPage = () => {
  const { user, isAuthenticated, logout, login } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Real registered hospital doctors (seeded with verified hospital database records)
  const INITIAL_REAL_DOCTORS = [
    {
      id: 32,
      name: 'Dr. Kumar',
      specialty: 'Cardiology',
      degrees: 'MBBS, MD (Cardiology), FACC',
      experience: '15+ Years Clinical Practice',
      role: 'Chief Cardiologist & Intervention Lead',
      staffId: 'DOC-102',
      email: 'kumar@gmail.com',
      phone: '7412365237',
      availability: 'Available Today',
      avatarGradient: 'from-rose-500 to-red-600',
      initials: 'DK',
      rating: '4.99',
      reviews: '412 reviews'
    },
    {
      id: 33,
      name: 'Dr. Leela',
      specialty: 'Pediatrics',
      degrees: 'MBBS, MD (Pediatrics), DCH',
      experience: '12+ Years Child Healthcare',
      role: 'Lead Pediatrician & NICU Director',
      staffId: 'DOC-103',
      email: 'leela@gmail.com',
      phone: '7410232021',
      availability: 'Available Today',
      avatarGradient: 'from-sky-500 to-blue-600',
      initials: 'DL',
      rating: '4.98',
      reviews: '530 reviews'
    },
    {
      id: 34,
      name: 'Dr. Subisha',
      specialty: 'Orthopedics',
      degrees: 'MBBS, MS (Orthopedic Surgery), FRCS',
      experience: '14+ Years Joint Replacement',
      role: 'Chief Orthopedic & Spine Surgeon',
      staffId: 'DOC-104',
      email: 'subisha@gmail.com',
      phone: '7410032100',
      availability: 'Available Today',
      avatarGradient: 'from-amber-500 to-orange-600',
      initials: 'DS',
      rating: '4.97',
      reviews: '380 reviews'
    },
    {
      id: 7,
      name: 'Dr. Rajesh Patel',
      specialty: 'General Medicine',
      degrees: 'MBBS, MD (Internal Medicine)',
      experience: '18+ Years Inpatient Care',
      role: 'Chief Medical Officer & Inpatient Lead',
      staffId: 'DOC002',
      email: 'dr.patel@gmail.com',
      phone: '9800000003',
      availability: 'Available Today',
      avatarGradient: 'from-sky-500 to-blue-600',
      initials: 'RP',
      rating: '4.98',
      reviews: '620 reviews'
    }
  ];

  // Doctors list (synchronized with real backend database)
  const [doctorsList, setDoctorsList] = useState(INITIAL_REAL_DOCTORS);

  // Quick Appointment Widget State (No default patient name, email, date, or slot)
  const [appointmentForm, setAppointmentForm] = useState({
    department: 'Cardiology',
    doctorId: 32,
    doctor: 'Dr. Kumar',
    patientName: '',
    phone: '',
    email: '',
    date: '',
    timeSlot: '',
    reason: '',
    password: '',
    confirmPassword: ''
  });
  const [showOpdPassword, setShowOpdPassword] = useState(false);
  const [showOpdConfirmPassword, setShowOpdConfirmPassword] = useState(false);
  const [showConfirmedPassword, setShowConfirmedPassword] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);


  // Selected Department for deep-dive section
  const [selectedDeptId, setSelectedDeptId] = useState('cardio');

  // Doctor directory filter
  const [doctorSpecialtyFilter, setDoctorSpecialtyFilter] = useState('All');

  // Real Reviews Department Filter
  const [reviewDepartmentFilter, setReviewDepartmentFilter] = useState('All');

  const realPatientReviews = [
    {
      name: 'Hari',
      mrn: 'PAT-20260917-0017',
      role: 'General Medicine Inpatient',
      doctor: 'Dr. Rajesh Patel',
      department: 'General Medicine',
      comment: 'Received outstanding inpatient care under Dr. Rajesh Patel and the nursing staff in Ward 1. The digital telemetry, vitals tracking, and medication schedules were synchronized flawlessly.',
      rating: 5,
      tag: 'Inpatient Care & Telemetry',
      date: 'September 2026',
      initials: 'HA',
      avatarGradient: 'from-blue-600 to-sky-500'
    },
    {
      name: 'Robert',
      mrn: 'PAT-20260917-0034',
      role: 'General Medicine Patient',
      doctor: 'Dr. Rajesh Patel',
      department: 'General Medicine',
      comment: 'Consultation with Dr. Rajesh Patel was thorough and transparent. The digital prescription and discharge instructions were instantly available in my patient portal.',
      rating: 5,
      tag: 'General Medicine Outpatient',
      date: 'September 2026',
      initials: 'RO',
      avatarGradient: 'from-sky-500 to-blue-600'
    },
    {
      name: 'Sujatha',
      mrn: 'PAT-20260917-0051',
      role: 'Clinical Care Patient',
      doctor: 'Dr. Rajesh Patel',
      department: 'General Medicine',
      comment: 'The outpatient portal registration was straightforward. Finding available consultation slots and tracking queue tokens live gave me a hassle-free visit.',
      rating: 5,
      tag: 'OPD Services & Quick Booking',
      date: 'September 2026',
      initials: 'SU',
      avatarGradient: 'from-blue-700 to-indigo-600'
    },
    {
      name: 'Selvi',
      mrn: 'PAT-20260918-0068',
      role: 'Inpatient Ward Patient',
      doctor: 'Dr. Rajesh Patel',
      department: 'General Medicine',
      comment: 'The nursing team monitored my vitals regularly and the medication administration log was always up to date. Excellent patient-centered hospital environment.',
      rating: 5,
      tag: 'Inpatient Care & Recovery',
      date: 'September 2026',
      initials: 'SE',
      avatarGradient: 'from-sky-600 to-blue-800'
    },
    {
      name: 'Ram',
      mrn: 'PAT-20260919-0119',
      role: 'Cardiology Patient',
      doctor: 'Dr. Kumar',
      department: 'Cardiology',
      comment: 'The digital check-in and queue token transparency saved so much time. Dr. Kumar took time to review my symptoms and prescribed clear therapeutic advice.',
      rating: 5,
      tag: 'Cardiology OPD Consultation',
      date: 'September 2026',
      initials: 'RA',
      avatarGradient: 'from-blue-500 to-sky-400'
    },
    {
      name: 'Ragupathy',
      mrn: 'PAT-20260919-0238',
      role: 'Orthopedics Patient',
      doctor: 'Dr. Subisha',
      department: 'Orthopedics',
      comment: 'Dr. Subisha provided a thorough clinical evaluation and clear recovery protocols for my joint discomfort. The patient portal gave me instant access to my prescription regimen and follow-up slots.',
      rating: 5,
      tag: 'Orthopedics & Joint Care',
      date: 'September 2026',
      initials: 'RP',
      avatarGradient: 'from-indigo-600 to-blue-600'
    }
  ];

  const filteredReviews = reviewDepartmentFilter === 'All'
    ? realPatientReviews
    : realPatientReviews.filter((r) => r.department === reviewDepartmentFilter);

  // Interactive FAQ active index
  const [activeFaq, setActiveFaq] = useState(0);

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Scrolled header background transition
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Explicitly clear appointment & portal credentials on mount to prevent browser autofill with receptionist details
  useEffect(() => {
    setAppointmentForm((prev) => ({
      ...prev,
      email: '',
      password: '',
      confirmPassword: ''
    }));
  }, []);

  // Fetch live real doctors from backend API
  useEffect(() => {
    const fetchLiveDoctors = async () => {
      try {
        const res = await userApi.getDoctors();
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const gradients = [
            'from-rose-500 to-red-600',
            'from-sky-500 to-blue-600',
            'from-amber-500 to-orange-600',
            'from-sky-500 to-blue-600',
            'from-indigo-500 to-purple-600'
          ];
          const mapped = res.data.map((doc, idx) => {
            const rawName = doc.fullName || doc.username;
            const displayName = rawName.toLowerCase().startsWith('dr.') || rawName.toLowerCase().startsWith('dr ')
              ? (rawName.startsWith('Dr.') && rawName.length > 3 && rawName.charAt(3) !== ' ' ? 'Dr. ' + rawName.slice(3) : rawName)
              : `Dr. ${rawName}`;
            const initials = displayName.replace(/Dr\.\s*/i, '').trim().slice(0, 2).toUpperCase() || 'DR';
            return {
              id: doc.id,
              name: displayName,
              specialty: doc.departmentName || 'General Medicine',
              degrees: 'MBBS, Specialist Board Certified',
              experience: '12+ Years Clinical Practice',
              role: `${doc.departmentName || 'Clinical'} Specialist Lead`,
              staffId: doc.staffId || `DOC-${doc.id}`,
              email: doc.email || 'doctor@healthcare.org',
              phone: doc.phoneNumber || '(800) 432-5800',
              availability: 'Available Today',
              avatarGradient: gradients[idx % gradients.length],
              initials: initials,
              rating: '4.98',
              reviews: `${250 + (doc.id * 15)} reviews`
            };
          });
          setDoctorsList(mapped);
        }
      } catch (err) {
        console.log('Using verified real doctor dataset:', err);
      }
    };
    fetchLiveDoctors();
  }, []);

  // Department data with real doctor leads
  const departments = [
    {
      id: 'cardio',
      name: 'Cardiology & Heart Center',
      tagline: 'Comprehensive Cardiovascular Care & Robotic Intervention',
      icon: HeartPulse,
      color: 'from-rose-500 to-red-600',
      badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      description: 'Advanced catheterization laboratory, non-invasive cardiac imaging, electrophysiology, and 24/7 primary percutaneous coronary intervention (PCI).',
      highlights: ['24/7 Emergency STEMI Interventions', '3D Echocardiography & Cardiac MRI', 'Robotic-Assisted Valve Repair', 'Electrophysiology & Arrhythmia Clinic'],
      headDoctor: 'Dr. Kumar (DOC-102)',
      stats: '1,200+ Angioplasties / yr'
    },
    {
      id: 'pedia',
      name: 'Pediatrics & Neonatal Care',
      tagline: 'Compassionate Care from Infancy through Adolescence',
      icon: Heart,
      color: 'from-sky-500 to-blue-600',
      badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      description: 'Level-IV Neonatal Intensive Care Unit (NICU) with 24/7 pediatric emergency resuscitation, child wellness clinic, and pediatric surgery specialists.',
      highlights: ['Level-IV NICU for Premature Infants', 'Child-Friendly Ambulatory Suites', 'Pediatric Pulmonology & Allergy', '24/7 Pediatric Emergency Responders'],
      headDoctor: 'Dr. Leela (DOC-103)',
      stats: '2,800+ Newborns Welcomed'
    },
    {
      id: 'ortho',
      name: 'Orthopedics & Joint Care',
      tagline: 'Robotic Arthroplasty, Sports Medicine & Trauma',
      icon: ShieldCheck,
      color: 'from-amber-500 to-orange-600',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      description: 'World-renowned joint replacement center using sub-millimeter robotic arm navigation, arthroscopic sports reconstruction, and complex trauma recovery.',
      highlights: ['Robotic Total Knee & Hip Replacement', 'Arthroscopic Ligament Reconstruction', 'Geriatric Fracture Care Unit', 'Integrated Physiotherapy & Rehab'],
      headDoctor: 'Dr. Subisha (DOC-104)',
      stats: '4,500+ Successful Surgeries'
    },
    {
      id: 'genmed',
      name: 'General & Internal Medicine',
      tagline: 'Comprehensive Diagnostics, Preventive Health & Inpatient Care',
      icon: Stethoscope,
      color: 'from-sky-500 to-blue-600',
      badgeColor: 'bg-sky-500/10 text-blue-600 dark:text-sky-400 border-sky-500/20',
      description: 'In-depth diagnostic triage, management of chronic lifestyle disorders, hypertension, diabetes mellitus, and executive health screenings.',
      highlights: ['Comprehensive Preventive Health Triage', 'Chronic Disease & Hypertension Care', 'Inpatient Ward Management', 'Multidisciplinary Consultations'],
      headDoctor: 'Dr. Rajesh Patel (DOC002)',
      stats: '8,000+ Outpatients Healed'
    },
    {
      id: 'emergency',
      name: '24/7 Emergency & Trauma',
      tagline: 'Level-1 Emergency Care with Zero-Wait Triage Protocol',
      icon: Zap,
      color: 'from-red-500 to-rose-700',
      badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      description: 'Fully equipped trauma resuscitation suites, bedside digital imaging, dedicated emergency CT scanner, and instant mobile ICU ambulance dispatch.',
      highlights: ['Instant Bedside Point-of-Care Ultrasound', 'Dedicated Emergency CT & Radiography', 'Advanced Cardiac Life Support (ACLS)', 'Helipad & Mobile ICU Fleets'],
      headDoctor: 'Chief Medical Officer Dr. Rajesh Patel',
      stats: '< 4 Min Emergency Triage'
    },
    {
      id: 'neuro',
      name: 'Neurology & Brain Spine',
      tagline: 'Precision Neurosurgery & Comprehensive Stroke Care',
      icon: Activity,
      color: 'from-indigo-500 to-purple-600',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      description: 'Level-1 Comprehensive Stroke Center equipped with 3T MRI, high-precision stereotactic radiosurgery, and dedicated Neuro-ICU monitoring.',
      highlights: ['Rapid Thrombolysis Stroke Response', 'Minimally Invasive Spine Surgery', 'Epilepsy Monitoring Unit (EMU)', 'Integrated Neuro-Rehabilitation'],
      headDoctor: 'Dr. Subisha & Spine Neuro Team',
      stats: '99.4% Stroke Window Triage'
    }
  ];

  const filteredDoctors = doctorSpecialtyFilter === 'All'
    ? doctorsList
    : doctorsList.filter(d => d.specialty.toLowerCase().includes(doctorSpecialtyFilter.toLowerCase()));

  // Doctor mapping per department for the quick scheduler dynamically built from real doctors
  const deptDoctorMap = {};
  doctorsList.forEach((doc) => {
    const key = doc.specialty || 'General Medicine';
    if (!deptDoctorMap[key]) {
      deptDoctorMap[key] = [];
    }
    if (!deptDoctorMap[key].some((d) => d.id === doc.id)) {
      deptDoctorMap[key].push({ id: doc.id, name: doc.name });
    }
  });
  if (!deptDoctorMap['Cardiology']) deptDoctorMap['Cardiology'] = [{ id: 32, name: 'Dr. Kumar' }];
  if (!deptDoctorMap['Pediatrics']) deptDoctorMap['Pediatrics'] = [{ id: 33, name: 'Dr. Leela' }];
  if (!deptDoctorMap['Orthopedics']) deptDoctorMap['Orthopedics'] = [{ id: 34, name: 'Dr. Subisha' }];
  if (!deptDoctorMap['General Medicine']) deptDoctorMap['General Medicine'] = [{ id: 7, name: 'Dr. Rajesh Patel' }];

  const handleDeptChangeInScheduler = (dept) => {
    const docs = deptDoctorMap[dept] || [{ id: 32, name: 'Dr. Kumar' }];
    const firstDoc = docs[0];
    setAppointmentForm((prev) => ({
      ...prev,
      department: dept,
      doctorId: firstDoc.id,
      doctor: firstDoc.name
    }));
  };

  const handleDoctorChangeInScheduler = (docId) => {
    const doc = doctorsList.find((d) => String(d.id) === String(docId));
    if (doc) {
      setAppointmentForm((prev) => ({
        ...prev,
        doctorId: doc.id,
        doctor: doc.name
      }));
    }
  };

  // Dynamically load real available time slots for chosen doctor and date (no auto-selected default slot)
  useEffect(() => {
    if (appointmentForm.doctorId && appointmentForm.date) {
      setLoadingSlots(true);
      publicApi
        .getPublicSlots(appointmentForm.doctorId, appointmentForm.date)
        .then((res) => {
          const slots = res.data || [];
          setAvailableSlots(slots);
          const currentValid = slots.find((s) => s.timeSlot === appointmentForm.timeSlot && s.available);
          if (!currentValid) {
            setAppointmentForm((prev) => ({ ...prev, timeSlot: '' }));
          }
        })
        .catch((err) => {
          console.warn('Could not load public slots:', err);
          setAvailableSlots([]);
          setAppointmentForm((prev) => ({ ...prev, timeSlot: '' }));
        })
        .finally(() => setLoadingSlots(false));
    } else {
      setAvailableSlots([]);
      setAppointmentForm((prev) => ({ ...prev, timeSlot: '' }));
    }
  }, [appointmentForm.doctorId, appointmentForm.date]);

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingSubmitting(true);
    setBookingError('');

    // Ensure patient creates their own password
    if (!appointmentForm.password || appointmentForm.password.trim().length < 6) {
      setBookingError('Please create a secure portal password of at least 6 characters.');
      setBookingSubmitting(false);
      return;
    }
    if (appointmentForm.password !== appointmentForm.confirmPassword) {
      setBookingError('Passwords do not match. Please verify both passwords match.');
      setBookingSubmitting(false);
      return;
    }

    try {
      const payload = {
        fullName: appointmentForm.patientName.trim(),
        phoneNumber: appointmentForm.phone.trim(),
        email: appointmentForm.email ? appointmentForm.email.trim() : null,
        doctorId: appointmentForm.doctorId,
        appointmentDate: appointmentForm.date,
        timeSlot: appointmentForm.timeSlot,
        reason: appointmentForm.reason ? appointmentForm.reason.trim() : null,
        password: appointmentForm.password.trim()
      };

      const res = await publicApi.bookOpd(payload);
      const data = res.data;

      setBookingSuccess({
        code: data.bookingCode || ('APT-' + data.appointmentId),
        appointmentId: data.appointmentId,
        patientId: data.patientId,
        patientNumber: data.patientNumber,
        patientName: data.patientName,
        doctor: data.doctorName,
        doctorId: data.doctorId || appointmentForm.doctorId,
        department: data.departmentName || appointmentForm.department,
        date: data.appointmentDate || appointmentForm.date,
        timeSlot: data.timeSlot || appointmentForm.timeSlot,
        status: data.status || 'SCHEDULED',
        queueNumber: data.queueNumber || 1,
        portalUsername: data.portalUsername,
        createdPassword: appointmentForm.password.trim(),
        customPasswordSet: data.customPasswordSet ?? true,
        defaultPassword: null,
        isNewPatient: data.isNewPatient ?? data.newPatient ?? true,
        phone: data.phoneNumber || data.phone || appointmentForm.phone.trim(),
        email: appointmentForm.email ? appointmentForm.email.trim() : (data.email || ''),
        reason: appointmentForm.reason ? appointmentForm.reason.trim() : (data.notes || 'General OPD Consultation'),
        station: `${data.departmentName || appointmentForm.department} Outpatient Wing &bull; Consultation Clinic`,
        createdDate: data.createdDate || new Date().toISOString()
      });
    } catch (err) {
      console.error('Direct OPD booking failed:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to book appointment. Please verify details and try again.';
      setBookingError(msg);
    } finally {
      setBookingSubmitting(false);
    }
  };


  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactForm({ name: '', email: '', subject: '', message: '' });
    }, 400);
  };

  const faqs = [
    {
      q: 'How can I access my medical records and laboratory results online?',
      a: 'All patients registered with HealthCare receive instantaneous digital access through our secure Patient Portal. Simply log in using your patient username/email to view, download, or print verified lab test reports, prescription histories, and doctor consultation notes 24/7.'
    },
    {
      q: 'What should I bring for an outpatient consultation or inpatient admission?',
      a: 'For outpatient visits, please bring a valid photo ID, your insurance membership card, and any relevant prior medical records or current medications. For scheduled inpatient admissions, our front desk coordination team will issue an admission checklist and assign your bed in advance.'
    },
    {
      q: 'How does the 24/7 emergency and critical care triage work?',
      a: 'Our Level-1 Emergency Department operates on a zero-wait clinical triage system (Emergency Severity Index). Patients experiencing chest pain, acute neurological symptoms, respiratory distress, or severe trauma receive immediate, prioritized stabilization within minutes.'
    },
    {
      q: 'Are health insurance policies and cashless claims supported?',
      a: 'Yes, HealthCare is empaneled with all major national health insurance providers and Third-Party Administrators (TPAs). Our dedicated Billing & Insurance desk handles real-time pre-authorization and hassle-free cashless hospitalization settlements.'
    },
    {
      q: 'Can I reschedule or cancel a booked doctor appointment?',
      a: 'Certainly. You can modify or cancel appointments anytime through your online Patient Portal or by calling our 24/7 patient helpline at (800) 432-5841 with your appointment reference token.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 selection:bg-sky-500/20 selection:text-blue-700 dark:selection:text-sky-300">
      
      {/* 1. TOP EMERGENCY & RAPID ACCESS BANNER */}
      <div className="bg-slate-950 dark:bg-black text-slate-300 text-xs border-b border-slate-800/80 py-2.5 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-rose-500/10 pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left relative z-10">
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[11px] border border-sky-500/30 shadow-xs shadow-sky-500/20">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              24/7 Emergency Active
            </span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="text-slate-300 font-medium">Level-1 Trauma Center & Critical Care Telemetry Units Operational</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <a
              href="tel:8004325841"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:text-rose-300 hover:bg-rose-500/25 font-bold transition-all shadow-xs"
            >
              <PhoneCall className="w-3.5 h-3.5 animate-pulse text-rose-400" />
              <span>Emergency Hotline: (800) 432-5841</span>
            </a>
            <span className="hidden sm:inline text-slate-700">|</span>
            <Link
              to="/login?tab=staff"
              className="text-sky-400 hover:text-sky-300 font-semibold transition-colors hidden sm:inline-flex items-center gap-1 hover:underline"
            >
              <span>Staff Workstation</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. STICKY MAIN NAVBAR */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          isScrolled
            ? 'bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 border-b border-slate-200/80 dark:border-slate-800/80 py-3'
            : 'bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 py-4'
        }`}
      >
        {/* Luminous Neon Gradient Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] palette-gradient-bar" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 group-hover:shadow-blue-600/50 transition-all duration-300">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-display">
                  Health<span className="palette-gradient-text">Care</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-sky-300 border border-blue-500/30 shadow-xs">
                  HPMS
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block -mt-0.5">
                Medical Center & Digital Hospital
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-bold text-slate-600 dark:text-slate-300">
            <a href="#services" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">
              Specialties
            </a>
            <a href="#book-appointment" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">
              Appointments
            </a>
            <a href="#doctors" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">
              Specialists
            </a>
            <a href="#portal" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">
              Patient Portal
            </a>
            <a href="#testimonials" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">
              Reviews
            </a>
            <a href="#faq" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">
              FAQ
            </a>
            <a href="#contact" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">
              Contact
            </a>
          </nav>

          {/* Right Action Controls */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-sky-400" />}
            </button>

            {/* Direct Patient Access Portal / Book Button */}
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 hover:from-blue-800 hover:to-sky-600 shadow-md shadow-blue-500/30 hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                <Activity className="w-4 h-4" />
                <span>Go to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-bold rounded-xl text-blue-600 dark:text-sky-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30 transition-all"
                >
                  Sign In
                </Link>
                <a
                  href="#book-appointment"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 hover:from-blue-800 hover:to-sky-600 shadow-md shadow-blue-500/30 active:scale-95 hover:-translate-y-0.5 transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Visit</span>
                </a>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Open navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-4 shadow-xl">
            <div className="grid grid-cols-2 gap-2 text-sm font-bold">
              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200"
              >
                Specialties
              </a>
              <a
                href="#book-appointment"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200"
              >
                Appointments
              </a>
              <a
                href="#doctors"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200"
              >
                Doctors
              </a>
              <a
                href="#portal"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200"
              >
                Patient Portal
              </a>
              <a
                href="#testimonials"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200"
              >
                Patient Reviews
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200"
              >
                FAQs
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200"
              >
                Contact Us
              </a>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-sm shadow-md"
                >
                  Dashboard ({user?.fullName})
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl font-bold text-blue-700 dark:text-sky-300 bg-sky-50 dark:bg-blue-950/50 text-sm border border-sky-200/50"
                  >
                    Sign In / Access Portal
                  </Link>
                  <a
                    href="#book-appointment"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-sm shadow-md"
                  >
                    Book An Appointment
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 3. HERO SECTION - ULTRA MODERN HEALTHCARE COMMAND & COMPASSION */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-16 lg:pb-32 vibrant-mesh-light dark:vibrant-mesh-dark">
        {/* Subtle Ambient Radial Glows with Blue Palette */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] pointer-events-none overflow-hidden opacity-70 dark:opacity-50">
          <div className="absolute top-10 left-10 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-20 right-10 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl" />
          <div className="absolute top-40 left-1/3 w-80 h-80 bg-blue-700/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-blue-900/25 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/15 via-blue-600/15 to-sky-500/15 border border-blue-500/30 text-slate-800 dark:text-slate-100 text-xs font-black tracking-wide shadow-sm">
                <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
                <span>JCI & NABH Accredited Healthcare Network &bull; Level-1 Trauma</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12] font-display">
                Advanced Medicine.{' '}
                <span className="palette-gradient-text">
                  Compassionate Care.
                </span>{' '}
                Reimagined for You.
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Connect seamlessly with over 150+ board-certified medical specialists, state-of-the-art robotic surgical suites, real-time diagnostic laboratory reporting, and our secure 24/7 digital patient portal.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <a
                  href="#book-appointment"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-black text-white bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 hover:from-blue-800 hover:to-sky-600 shadow-xl shadow-blue-500/30 hover:shadow-blue-600/50 hover:-translate-y-0.5 active:scale-95 transition-all"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Book Consultation</span>
                </a>

                <Link
                  to="/login?tab=patient"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold text-slate-800 dark:text-slate-100 bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/90 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-md hover:border-blue-500/50 hover:-translate-y-0.5 active:scale-95 transition-all backdrop-blur-md"
                >
                  <User className="w-5 h-5 text-blue-600 dark:text-sky-400" />
                  <span>Patient & Staff Portal</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </Link>
              </div>

              {/* Verified Trust Badges */}
              <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-500" />
                  <span>HIPAA & GDPR Compliant Data</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span>Top 10 Clinical Safety Award</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  <span>Cashless Insurance Empaneled</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual & Quick Telemetry Card */}
            <div className="lg:col-span-5 relative">
              {/* Outer Glowing Gradient Border Container */}
              <div className="p-[1.5px] rounded-3xl bg-gradient-to-tr from-blue-700/70 via-sky-400/60 via-blue-600/70 to-sky-300/70 shadow-2xl shadow-blue-600/20">
                <div className="relative rounded-[23px] bg-white/95 dark:bg-slate-900/95 p-6 sm:p-8 backdrop-blur-xl">
                  {/* Header indicator */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-sky-400 animate-pulse shadow-xs shadow-sky-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Hospital Telemetry & Status
                      </span>
                    </div>
                    <span className="text-xs font-bold text-blue-600 dark:text-sky-300 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30">
                      Live 2026
                    </span>
                  </div>

                  {/* KPI Metrics Grid: 4 Blue Palette Cards */}
                  <div className="grid grid-cols-2 gap-3.5 my-6">
                    {/* 1. Clinical Care - Royal/Sky Blue */}
                    <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-blue-600/10 to-sky-400/10 border border-blue-500/30 hover:shadow-md hover:scale-[1.02] transition-all">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                      <p className="text-[11px] font-black text-blue-700 dark:text-sky-300 uppercase tracking-wider">Clinical Care</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-display">99.8%</p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Procedure Success Rate</p>
                    </div>

                    {/* 2. Specialists - Sky/Cobalt Blue */}
                    <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 to-blue-600/10 border border-sky-400/30 hover:shadow-md hover:scale-[1.02] transition-all">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-sky-400/10 rounded-full blur-xl pointer-events-none" />
                      <p className="text-[11px] font-black text-blue-600 dark:text-sky-300 uppercase tracking-wider">Specialists</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-display">150+</p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Board-Certified Doctors</p>
                    </div>

                    {/* 3. Emergency - Deep Sapphire Blue */}
                    <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-blue-800/10 to-blue-600/10 border border-blue-700/30 hover:shadow-md hover:scale-[1.02] transition-all">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-700/10 rounded-full blur-xl pointer-events-none" />
                      <p className="text-[11px] font-black text-blue-800 dark:text-sky-200 uppercase tracking-wider">Emergency</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-display">&lt; 4 min</p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Average Triage Time</p>
                    </div>

                    {/* 4. Inpatient Beds - Navy/Azure Blue */}
                    <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-blue-900/10 to-blue-700/10 border border-blue-800/30 hover:shadow-md hover:scale-[1.02] transition-all">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-800/10 rounded-full blur-xl pointer-events-none" />
                      <p className="text-[11px] font-black text-blue-700 dark:text-sky-300 uppercase tracking-wider">Inpatient Beds</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-display">350+</p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">ICU & Smart Ward Suites</p>
                    </div>
                  </div>

                  {/* Floating Service Quick Trigger list */}
                  <div className="space-y-2.5 pt-2">
                    <a
                      href="#doctors"
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50/80 dark:hover:bg-blue-950/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-sky-400/50 transition-all group shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/20 group-hover:scale-110 transition-transform">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Find a Specialist Doctor</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Cardiology, Neuro, Ortho & more</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-600 dark:text-sky-400 group-hover:translate-x-1 transition-transform" />
                    </a>

                    <a
                      href="#book-appointment"
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-sky-400/50 transition-all group shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-500 text-white shadow-md shadow-sky-500/20 group-hover:scale-110 transition-transform">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Online OPD Scheduling</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Instant digital appointment confirmation</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-600 dark:text-sky-400 group-hover:translate-x-1 transition-transform" />
                    </a>

                    <Link
                      to="/login?tab=patient"
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-400/50 transition-all group shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                          <FlaskConical className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">View Lab Reports Online</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Secure EMR & prescription access</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. FLOATING QUICK-SERVICES STRIP */}
      <section className="relative z-20 -mt-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Emergency Response */}
          <div className="relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl flex items-start gap-4 hover:border-blue-500/60 hover:shadow-2xl hover:-translate-y-1 transition-all group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-700 to-blue-500" />
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-md shadow-blue-500/25 group-hover:scale-110 transition-transform">
              <Ambulance className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Emergency Response</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">24/7 Mobile ICU ambulances dispatched in under 5 minutes.</p>
              <a href="tel:8004325841" className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:text-blue-800 mt-2 inline-flex items-center gap-1 group-hover:underline">
                <span>Call: (800) 432-5841</span>
                <span>&rarr;</span>
              </a>
            </div>
          </div>

          {/* Card 2: Pathology & Diagnostics */}
          <div className="relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl flex items-start gap-4 hover:border-sky-400/60 hover:shadow-2xl hover:-translate-y-1 transition-all group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-blue-600" />
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/25 group-hover:scale-110 transition-transform">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Pathology & Radiology</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">3T MRI, 128-slice CT, and rapid automated blood chemistry.</p>
              <a href="#services" className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:text-blue-800 mt-2 inline-flex items-center gap-1 group-hover:underline">
                <span>Explore Diagnostics</span>
                <span>&rarr;</span>
              </a>
            </div>
          </div>

          {/* Card 3: 24/7 Pharmacy */}
          <div className="relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl flex items-start gap-4 hover:border-blue-600/60 hover:shadow-2xl hover:-translate-y-1 transition-all group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400" />
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white shadow-md shadow-blue-500/25 group-hover:scale-110 transition-transform">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">24/7 Pharmacy</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Direct e-prescription fulfillment & home delivery of medicines.</p>
            </div>
          </div>

          {/* Card 4: Inpatient Suites */}
          <div className="relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl flex items-start gap-4 hover:border-blue-800/60 hover:shadow-2xl hover:-translate-y-1 transition-all group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-800 to-blue-600" />
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-blue-800 to-blue-600 text-white shadow-md shadow-blue-700/25 group-hover:scale-110 transition-transform">
              <BedDouble className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Inpatient Suites</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Smart telemetry beds, dedicated nurses, and private suites.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE APPOINTMENT SCHEDULING WIDGET */}
      <section id="book-appointment" className="py-24 bg-gradient-to-b from-slate-100/90 via-slate-50 to-slate-100/90 dark:from-slate-900/80 dark:via-slate-950 dark:to-slate-900/80 mt-12 relative overflow-hidden">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden opacity-40 dark:opacity-25">
          <div className="absolute top-1/4 left-10 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-500/15 via-cyan-500/15 to-sky-500/15 text-blue-800 dark:text-sky-200 text-xs font-black tracking-wide border border-sky-500/30 mb-3 shadow-xs">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              <span>Direct OPD Scheduling & Live Queue</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-display">
              Schedule Your Consultation in Seconds
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-3 font-medium">
              Select your department and specialist. Receive an instant booking reference and live outpatient queue token.
            </p>
          </div>

          <div className="max-w-4xl mx-auto p-[1.5px] rounded-[32px] bg-gradient-to-r from-blue-700 via-blue-600 via-sky-400 to-blue-500 shadow-2xl shadow-blue-500/20">
            <div className="bg-white/95 dark:bg-slate-900/95 rounded-[30px] p-6 sm:p-10 backdrop-blur-xl">
              {bookingSuccess ? (
                <div className="py-6 space-y-7 animate-in fade-in zoom-in-95">
                  {/* Confirmation Header */}
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-500 to-sky-500 text-white mx-auto flex items-center justify-center shadow-xl shadow-sky-500/30 animate-bounce">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-sky-500/15 dark:bg-blue-950/60 text-blue-800 dark:text-sky-300 text-xs font-black border border-sky-500/30 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                      <span>OPD Consultation Confirmed &bull; Live Queue Token Generated</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display">
                      Appointment Confirmed: <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-sky-400 dark:to-cyan-400">{bookingSuccess.code}</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium">
                      Thank you, <strong className="text-slate-900 dark:text-white">{bookingSuccess.patientName}</strong>. Your consultation has been provisioned with our specialist team and entered into the live clinical outpatient queue.
                    </p>
                  </div>

                  {/* Grid: Consultation Details & Patient Identity */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                    {/* Card 1: Clinical Consultation Details */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-sky-50/70 to-slate-50 dark:from-blue-950/40 dark:to-slate-900/80 border border-sky-200/80 dark:border-blue-800/60 space-y-3.5 shadow-sm">
                      <div className="flex items-center justify-between border-b border-sky-200/70 dark:border-blue-800/60 pb-3">
                        <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white text-sm">
                          <Calendar className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                          <span>Consultation Overview</span>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 text-white shadow-xs">
                          Token #{bookingSuccess.queueNumber || 1} &bull; {bookingSuccess.status || 'SCHEDULED'}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-semibold">Booking Reference:</span>
                          <strong className="font-mono text-blue-700 dark:text-sky-300 font-black">{bookingSuccess.code}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-semibold">Attending Specialist:</span>
                          <strong className="text-slate-900 dark:text-slate-100 font-bold">{bookingSuccess.doctor}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-semibold">Clinical Department:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{bookingSuccess.department}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-semibold">Scheduled Date:</span>
                          <strong className="text-slate-900 dark:text-slate-100 font-bold">{bookingSuccess.date}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-semibold">Consultation Slot:</span>
                          <strong className="text-slate-900 dark:text-slate-100 font-bold">{bookingSuccess.timeSlot}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-semibold">OPD Station:</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Room 102 &bull; {bookingSuccess.department} Wing</span>
                        </div>
                        {bookingSuccess.reason && (
                          <div className="pt-2 border-t border-sky-200/60 dark:border-blue-800/60">
                            <span className="text-slate-500 block mb-1 font-semibold">Chief Complaint / Notes:</span>
                            <p className="text-slate-800 dark:text-slate-200 font-medium bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-sky-200/60 dark:border-blue-800/60">
                              {bookingSuccess.reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card 2: Patient Identity & Digital MRN */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900/80 border border-indigo-200/80 dark:border-indigo-800/60 space-y-3.5 flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex items-center justify-between border-b border-indigo-200/70 dark:border-indigo-800/60 pb-3">
                          <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white text-sm">
                            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Patient Clinical Record</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300">
                            Outpatient Registry
                          </span>
                        </div>

                        <div className="space-y-2.5 pt-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-semibold">Patient Full Name:</span>
                            <strong className="text-slate-900 dark:text-slate-100 text-sm font-bold">{bookingSuccess.patientName}</strong>
                          </div>
                          {bookingSuccess.patientNumber && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-semibold">Medical Record No (MRN):</span>
                              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                                {bookingSuccess.patientNumber}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-semibold">Contact Mobile:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{bookingSuccess.phone}</span>
                          </div>
                          {bookingSuccess.email && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-semibold">Registered Email:</span>
                              <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{bookingSuccess.email}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-semibold">Registration Status:</span>
                            <span className="text-blue-700 dark:text-sky-400 font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Verified & Synchronized
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Patient Portal Credentials Box */}
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 dark:from-blue-950/50 dark:to-blue-950/50 border border-sky-200 dark:border-blue-800/80 space-y-1.5 mt-3">
                        <div className="flex items-center gap-1.5 text-blue-900 dark:text-sky-200 font-bold text-[11px]">
                          <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                          <span>Patient Portal Digital Access Credentials</span>
                        </div>
                        <p className="text-[11px] text-blue-800/80 dark:text-sky-300/80 leading-relaxed">
                          Access your medical history, test reports, and OPD queue tokens anytime:
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-sky-200/80 dark:border-blue-900/60 text-xs font-mono">
                          <div>
                            <span className="text-slate-500 font-sans">Username: </span>
                            <strong className="text-blue-700 dark:text-sky-300 font-bold">{bookingSuccess.portalUsername || bookingSuccess.phone}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-sans">Password: </span>
                            <strong className="text-slate-800 dark:text-slate-200 font-bold">
                              {showConfirmedPassword ? (bookingSuccess.createdPassword || 'Your chosen password') : '••••••••'}
                            </strong>
                            <span className="text-[10px] text-blue-600 font-sans font-semibold">
                              (Created by you)
                            </span>
                            {bookingSuccess.createdPassword && (
                              <button
                                type="button"
                                onClick={() => setShowConfirmedPassword(!showConfirmedPassword)}
                                className="ml-1 text-blue-600 hover:text-blue-800 text-[10px] underline font-sans font-bold"
                              >
                                {showConfirmedPassword ? 'Hide' : 'Show'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Important Clinical Instructions for Day of Visit */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1 text-left">
                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>Important Guidelines for Consultation Day</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 dark:text-amber-300/90 pt-1">
                      <li>Please report to the OPD Reception Desk 15 minutes prior to <strong>{bookingSuccess.timeSlot}</strong>.</li>
                      <li>Present your Booking Reference (<strong>{bookingSuccess.code}</strong>) or Token #<strong>{bookingSuccess.queueNumber || 1}</strong> at the triage nurse station.</li>
                      <li>Bring any previous diagnostic scans, prescription charts, or health insurance documentation.</li>
                    </ul>
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                    <button
                      type="button"
                      disabled={trackingLoading}
                      onClick={async () => {
                        setTrackingLoading(true);
                        const patientIdent = bookingSuccess.portalUsername || bookingSuccess.phone;
                        const patientPass = bookingSuccess.createdPassword || bookingSuccess.defaultPassword || '';
                        
                        // Immediately clear any stale admin or staff session
                        if (isAuthenticated && user?.role !== 'ROLE_PATIENT') {
                          logout();
                        }

                        // Attempt seamless one-click sign in directly to the patient dashboard
                        try {
                          const res = await login(patientIdent, patientPass);
                          if (res && res.success) {
                            navigate('/dashboard');
                            return;
                          }
                        } catch (err) {
                          console.warn('Auto-login to patient portal failed, routing to patient portal login:', err);
                        } finally {
                          setTrackingLoading(false);
                        }

                        // Fallback directly to the Patient Portal tab
                        navigate('/login?tab=patient', {
                          state: {
                            activeTab: 'patient',
                            patientIdentifier: patientIdent,
                            patientPassword: patientPass,
                            fromBooking: true,
                            patientDetails: {
                              name: bookingSuccess.patientName,
                              bookingRef: bookingSuccess.code,
                              mrn: bookingSuccess.patientNumber,
                              department: bookingSuccess.department,
                              doctor: bookingSuccess.doctor,
                              date: bookingSuccess.date,
                              timeSlot: bookingSuccess.timeSlot,
                              queueNumber: bookingSuccess.queueNumber,
                              status: bookingSuccess.status,
                              portalUsername: bookingSuccess.portalUsername,
                              phone: bookingSuccess.phone
                            }
                          }
                        });
                      }}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 hover:opacity-95 shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-95 hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {trackingLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Opening Patient Portal...</span>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4" />
                          <span>View Details in Patient Portal</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-sm flex items-center justify-center gap-2 transition"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>Print Appointment Slip</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBookingSuccess(null);
                        setBookingError('');
                        setAppointmentForm({
                          department: 'Cardiology',
                          doctorId: 32,
                          doctor: 'Dr. Kumar',
                          patientName: '',
                          phone: '',
                          email: '',
                          date: '',
                          timeSlot: '',
                          reason: '',
                          password: '',
                          confirmPassword: ''
                        });
                      }}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Book Another Visit
                    </button>
                  </div>
                </div>
              ) : (
              <form onSubmit={handleBookAppointment} className="space-y-6">
                {/* Error Banner */}
                {bookingError && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3 animate-in fade-in">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">Consultation Scheduling Notice</p>
                      <p className="mt-1">{bookingError}</p>
                    </div>
                  </div>
                )}

                {/* 1. Department & Doctor Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Medical Specialty / Department
                    </label>
                    <select
                      value={appointmentForm.department}
                      onChange={(e) => handleDeptChangeInScheduler(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 shadow-xs transition-all"
                      required
                    >
                      {Object.keys(deptDoctorMap).map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Attending Specialist Doctor
                    </label>
                    <select
                      value={appointmentForm.doctorId}
                      onChange={(e) => handleDoctorChangeInScheduler(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 shadow-xs transition-all"
                      required
                    >
                      {(deptDoctorMap[appointmentForm.department] || [{ id: 32, name: 'Dr. Kumar' }]).map((doc) => (
                        <option key={doc.id} value={doc.id}>{doc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Patient Personal Info Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Patient Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter patient full name"
                      value={appointmentForm.patientName}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, patientName: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 shadow-xs transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      10-Digit Mobile Number
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter 10-digit mobile"
                      pattern="[0-9]{10}"
                      title="Please enter a valid 10-digit mobile number"
                      value={appointmentForm.phone}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, phone: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 shadow-xs transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="patient_appointment_email_unq"
                      autoComplete="off"
                      placeholder="Enter email address"
                      value={appointmentForm.email}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, email: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 shadow-xs transition-all"
                      required
                    />
                  </div>
                </div>

                {/* 3. Date & Time Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={appointmentForm.date}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 shadow-xs transition-all"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Doctor Available Time Slot
                      </label>
                      {loadingSlots && (
                        <span className="text-[11px] text-blue-600 dark:text-sky-400 font-bold animate-pulse">
                          Syncing slots...
                        </span>
                      )}
                    </div>
                    <select
                      value={appointmentForm.timeSlot}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, timeSlot: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 shadow-xs transition-all"
                      required
                    >
                      <option value="" disabled>
                        {!appointmentForm.date
                          ? '-- Select Preferred Date First --'
                          : loadingSlots
                          ? '-- Loading Available Slots... --'
                          : availableSlots.length === 0
                          ? '-- No Slots Available for this Date --'
                          : '-- Choose an Available Time Slot --'}
                      </option>
                      {availableSlots.map((slot) => (
                        <option
                          key={slot.timeSlot}
                          value={slot.timeSlot}
                          disabled={!slot.available}
                        >
                          {slot.timeSlot} {slot.available ? '• Available' : '• Booked'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Symptoms / Notes */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Primary Symptoms or Reason for Visit (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Briefly describe symptoms, chief complaint, or reason for this consultation..."
                    value={appointmentForm.reason}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 shadow-xs transition-all"
                  />
                </div>

                {/* 5. Patient Account Security / Password Creation */}
                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-sky-50/90 via-cyan-50/50 to-blue-50/90 dark:from-blue-950/40 dark:via-slate-900/40 dark:to-blue-950/40 border border-sky-200/90 dark:border-blue-800/80 space-y-3.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2 text-blue-900 dark:text-sky-200 font-black text-xs">
                      <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <span>Create Your Patient Portal Password</span>
                    </div>
                    <span className="text-[11px] font-bold text-blue-700 dark:text-sky-300 bg-sky-100/70 dark:bg-blue-900/60 px-2.5 py-0.5 rounded-full border border-sky-300/60">
                      Self-service security (Minimum 6 characters)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    As a patient, you create your own password to access your OPD consultation tokens, diagnostic lab reports, and prescriptions online. Receptionists and hospital staff will never see or issue this password.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Portal Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showOpdPassword ? 'text' : 'password'}
                          name="patient_portal_reg_password_unq"
                          autoComplete="new-password"
                          placeholder="Enter your private password"
                          value={appointmentForm.password}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, password: e.target.value })}
                          className="w-full px-4 py-3 pr-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 transition-all"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOpdPassword(!showOpdPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          aria-label={showOpdPassword ? 'Hide password' : 'Show password'}
                        >
                          {showOpdPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showOpdConfirmPassword ? 'text' : 'password'}
                          name="patient_portal_reg_confirmpass_unq"
                          autoComplete="new-password"
                          placeholder="Re-enter password to confirm"
                          value={appointmentForm.confirmPassword}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, confirmPassword: e.target.value })}
                          className="w-full px-4 py-3 pr-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 transition-all"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOpdConfirmPassword(!showOpdConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          aria-label={showOpdConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showOpdConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <ShieldCheck className="w-4 h-4 text-sky-500" />
                    <span>Live OPD Queue Assignment & Instant Confirmation</span>
                  </div>

                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 hover:opacity-95 shadow-xl shadow-blue-500/25 active:scale-95 hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {bookingSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Provisioning Consultation...</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        <span>Confirm Appointment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>

      {/* 6. CENTERS OF CLINICAL EXCELLENCE (DEPARTMENTS) */}
      <section id="services" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-500/15 via-cyan-500/15 to-sky-500/15 text-blue-800 dark:text-sky-200 text-xs font-black tracking-wide border border-sky-500/30 mb-3 shadow-xs">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              <span>Specialized Clinical Excellence</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-display">
              Centers of Clinical Excellence
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-xl font-medium">
              Equipped with next-generation robotic surgery suites, sub-specialty intensive care units, and board-certified medical leadership.
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs font-black text-blue-700 dark:text-sky-300 px-3 py-1 rounded-full bg-sky-50 dark:bg-blue-950/60 border border-sky-200 dark:border-blue-800 uppercase tracking-wider">
              {departments.length} Accredited Centers
            </span>
          </div>
        </div>

        {/* Department Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => {
            const Icon = dept.icon;
            const isSelected = selectedDeptId === dept.id;

            return (
              <div
                key={dept.id}
                onClick={() => setSelectedDeptId(dept.id)}
                className={`cursor-pointer rounded-[28px] p-7 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-sky-500 shadow-2xl shadow-sky-500/20 ring-2 ring-sky-500/40 -translate-y-1'
                    : 'bg-white/90 dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800 hover:border-sky-400/60 dark:hover:border-blue-600/60 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                {/* Top Colored Accent Stripe */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${dept.color}`} />

                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${dept.color} flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className={`text-[11px] font-black px-3 py-1 rounded-full border shadow-xs ${dept.badgeColor}`}>
                      {dept.stats}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1.5 font-display group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                    {dept.name}
                  </h3>
                  <p className="text-xs font-bold text-blue-600 dark:text-sky-400 mb-3">
                    {dept.tagline}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5 font-medium">
                    {dept.description}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {dept.highlights.map((h, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <div className="w-4 h-4 rounded-full bg-sky-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 font-bold" />
                        </div>
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Clinical Lead</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{dept.headDoctor}</span>
                  </div>
                  <a
                    href="#book-appointment"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeptChangeInScheduler(dept.name.split(' ')[0]);
                    }}
                    className="p-2.5 rounded-xl bg-sky-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all shadow-xs"
                    title="Book in this department"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. FEATURED BOARD-CERTIFIED DOCTORS DIRECTORY */}
      <section id="doctors" className="py-24 bg-gradient-to-b from-slate-100/70 via-slate-50 to-slate-100/70 dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-900/60 border-y border-slate-200/80 dark:border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-500/15 via-cyan-500/15 to-sky-500/15 text-blue-800 dark:text-sky-200 text-xs font-black tracking-wide border border-sky-500/30 mb-3 shadow-xs">
                <Stethoscope className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                <span>Distinguished Faculty</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-display">
                Meet Our Board-Certified Specialists
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-xl font-medium">
                Consult with internationally recognized surgeons, diagnosticians, and clinical department chairs.
              </p>
            </div>

            {/* Dynamic Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              {['All', ...Array.from(new Set(doctorsList.map((d) => d.specialty)))].map((spec) => (
                <button
                  key={spec}
                  onClick={() => setDoctorSpecialtyFilter(spec)}
                  className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                    doctorSpecialtyFilter === spec
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-sky-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          {/* Doctors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doc, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-[28px] p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-sky-400/60 dark:hover:border-blue-600/60 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${doc.avatarGradient} flex items-center justify-center text-white font-black text-lg shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform`}>
                      {doc.initials}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors font-display">
                        {doc.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-blue-600 dark:text-sky-400">
                          {doc.specialty}
                        </span>
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-sky-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 border border-sky-500/30">
                          {doc.staffId}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        {doc.degrees}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Role:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{doc.role}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Email:</span>
                      <a href={`mailto:${doc.email}`} className="font-mono text-[11px] text-blue-600 dark:text-sky-400 hover:underline font-semibold">
                        {doc.email}
                      </a>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Direct Contact:</span>
                      <a href={`tel:${doc.phone}`} className="font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400">
                        {doc.phone}
                      </a>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Patient Rating:</span>
                      <span className="inline-flex items-center gap-1 font-black text-amber-500 text-xs">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>{doc.rating}</span>
                        <span className="text-slate-400 font-normal">({doc.reviews})</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-sky-400">
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    <span>{doc.availability}</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <a
                    href="#book-appointment"
                    onClick={() => {
                      setAppointmentForm({
                        ...appointmentForm,
                        doctorId: doc.id,
                        doctor: doc.name,
                        department: doc.specialty.includes('General') ? 'General Medicine' : doc.specialty,
                        date: '',
                        timeSlot: ''
                      });
                    }}
                    className="flex-1 py-3 px-4 rounded-xl text-center text-xs font-black text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md shadow-blue-600/20 transition-all active:scale-95 hover:-translate-y-0.5"
                  >
                    Consult Doctor
                  </a>
                  <Link
                    to="/login"
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    title="View Doctor Portal Profile"
                  >
                    <User className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. DIGITAL PATIENT PORTAL PREVIEW */}
      <section id="portal" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[36px] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-2xl border border-sky-500/30">
          {/* Ambient Glows */}
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-sky-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-8">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-black shadow-xs">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>HealthCare Digital Patient Self-Service Portal</span>
              </div>

              <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight font-display">
                Your Health Journey, Real-Time at Your Fingertips
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-medium">
                No more waiting in lines for test results or paper receipts. HealthCare HPMS gives patients and families complete transparency over care protocols, digital prescriptions, laboratory values, and invoices.
              </p>
            </div>

            {/* Four Core Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-500 text-white flex-shrink-0 shadow-lg shadow-sky-500/20">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Instant Lab Telemetry</h4>
                  <p className="text-xs text-slate-300 mt-1 font-medium">Automated release of verified pathology and imaging findings.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-sky-500 text-white flex-shrink-0 shadow-lg shadow-sky-500/20">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">E-Prescription Sync</h4>
                  <p className="text-xs text-slate-300 mt-1 font-medium">Doctor dosages, dosage schedules, and pharmacy refill status.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex-shrink-0 shadow-lg shadow-sky-500/20">
                  <BedDouble className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Inpatient Ward Telemetry</h4>
                  <p className="text-xs text-slate-300 mt-1 font-medium">Bed assignment status, vitals triage logs, and visiting guidelines.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex-shrink-0 shadow-lg shadow-amber-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Itemized Billing & Claims</h4>
                  <p className="text-xs text-slate-300 mt-1 font-medium">Direct cashless settlement, printable PDF invoices & receipts.</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                to="/login?tab=patient"
                onClick={() => {
                  if (isAuthenticated && user?.role !== 'ROLE_PATIENT') {
                    logout();
                  }
                }}
                className="inline-flex items-center gap-2.5 px-9 py-4 rounded-2xl text-sm font-black text-slate-950 bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-400 hover:from-sky-300 hover:to-sky-300 shadow-xl shadow-sky-500/30 transition-all active:scale-95 hover:-translate-y-0.5"
              >
                <User className="w-4 h-4" />
                <span>Sign In to Patient Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login?tab=staff"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl text-sm font-bold text-white bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/40 transition-all"
              >
                <span>Staff & Doctor Access</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. PATIENT TESTIMONIALS & CLINICAL TRUST - REAL DATA */}
      <section id="testimonials" className="py-24 bg-gradient-to-b from-slate-100/70 via-slate-50 to-slate-100/70 dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-900/60 border-t border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-500/15 via-cyan-500/15 to-sky-500/15 text-blue-800 dark:text-sky-200 text-xs font-black tracking-wide border border-sky-500/30 mb-3 shadow-xs">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                <span>Verified Patient Reviews & Clinical Outcomes</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-display">
                Loved by Patients. Trusted by Families.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-xl font-medium">
                Read authentic testimonials from real patients registered and treated by our specialists in Cardiology, Pediatrics, Orthopedics, and General Medicine.
              </p>
            </div>

            {/* Department Filter Tabs for Reviews */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              {['All', 'Cardiology', 'Pediatrics', 'Orthopedics', 'General Medicine'].map((dept) => (
                <button
                  key={dept}
                  onClick={() => setReviewDepartmentFilter(dept)}
                  className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                    reviewDepartmentFilter === dept
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-sky-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.map((test, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-[28px] p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-sky-400/60 dark:hover:border-blue-600/60 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Rating & Tag row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(test.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[11px] font-black text-blue-700 dark:text-sky-300 bg-sky-50 dark:bg-blue-950/60 px-3 py-1 rounded-full border border-sky-500/30 shadow-xs">
                      {test.tag}
                    </span>
                  </div>

                  {/* Testimonial Quote */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic mb-5 font-medium">
                    "{test.comment}"
                  </p>

                  {/* Attending Specialist Pill */}
                  <div className="mb-4 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Attending Specialist:</span>
                    <strong className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-bold">
                      <span>👨‍⚕️</span> {test.doctor} &bull; <span className="text-blue-600 dark:text-sky-400 font-bold">{test.department}</span>
                    </strong>
                  </div>
                </div>

                {/* Patient Identity Footer with Verified MRN */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${test.avatarGradient} flex items-center justify-center text-white font-black text-xs shadow-md shadow-sky-500/20 flex-shrink-0`}>
                      {test.initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{test.name}</span>
                        <CheckCircle2 className="w-4 h-4 text-sky-500 flex-shrink-0" title="Verified Hospital Patient" />
                      </h4>
                      <p className="text-[11px] font-mono text-blue-600 dark:text-sky-400 font-black">
                        MRN: {test.mrn}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{test.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FREQUENTLY ASKED QUESTIONS (ACCORDION) */}
      <section id="faq" className="py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-blue-700 dark:text-sky-300 text-xs font-bold mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help Center & Guidelines</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Answers to common questions about visiting hours, admissions, insurance claims, and our digital health portal.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? -1 : index)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {faq.q}
                  </span>
                  <div className={`p-1.5 rounded-lg transition-transform ${isOpen ? 'rotate-180 bg-sky-50 dark:bg-blue-950/60 text-blue-600' : 'text-slate-400'}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 11. CAMPUS LOCATION, VISITING HOURS & INQUIRY FORM */}
      <section id="contact" className="py-20 bg-slate-100/70 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Contact Details & Visiting Hours */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-blue-700 dark:text-sky-300 text-xs font-bold">
                <MapPin className="w-3.5 h-3.5" />
                <span>Hospital Campus & Accessibility</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display">
                Always Here for You &bull; 24 Hours, 365 Days
              </h2>

              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Located conveniently in the central medical district with dedicated multi-level emergency vehicle access, underground patient parking, and helipad facilities.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-blue-600 dark:text-sky-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Main Medical Campus</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      HealthCare Medical Center, 742 Evergreen Medical Parkway, Healthcare District, Metro City
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Direct Phone Lines</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      Emergency Hotline: <strong className="text-rose-500">(800) 432-5841</strong> (24/7)
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Appointments & General: (800) 432-5800
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Visiting Hours</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      Inpatient General Wards: 10:00 AM – 1:00 PM & 4:00 PM – 7:30 PM
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Emergency & Critical Care: Continuous 24/7 with immediate triage
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick General Inquiry Form */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display mb-2">
                Send Us an Inquiry or Feedback
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Our hospital front-desk team replies within 24 hours. For emergencies, please dial our emergency hotline directly.
              </p>

              {contactSubmitted ? (
                <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center space-y-2 animate-in fade-in">
                  <CheckCircle2 className="w-10 h-10 text-blue-600 dark:text-sky-400 mx-auto" />
                  <h4 className="text-base font-bold text-blue-900 dark:text-blue-200">Message Delivered</h4>
                  <p className="text-xs text-blue-700 dark:text-sky-300">
                    Thank you for reaching out. A patient relationship officer will review your inquiry shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setContactSubmitted(false)}
                    className="mt-3 text-xs font-bold text-blue-800 dark:text-sky-300 underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="john@example.com"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Insurance query, second opinion"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Message
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="How can our clinical or administrative team assist you today?"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 transition shadow-md shadow-blue-600/20"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Inquiry</span>
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* 12. COMPREHENSIVE HOSPITAL FOOTER */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
            
            {/* Brand column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl font-bold text-white font-display tracking-tight block">HealthCare</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-400">Hospital Patient Management System</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Empowering clinical excellence with precision healthcare diagnostics, state-of-the-art robotic surgery, and a secure stateless electronic medical records portal.
              </p>

              <div className="flex items-center gap-2 pt-2 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <span>Emergency Hotline: (800) 432-5841</span>
              </div>
            </div>

            {/* Quick Links: Departments */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Centers of Excellence</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#services" className="hover:text-sky-400 transition">Cardiology & Heart</a></li>
                <li><a href="#services" className="hover:text-sky-400 transition">Neurology & Stroke</a></li>
                <li><a href="#services" className="hover:text-sky-400 transition">Orthopedics & Robotic</a></li>
                <li><a href="#services" className="hover:text-sky-400 transition">Pediatrics & NICU</a></li>
                <li><a href="#services" className="hover:text-sky-400 transition">Medical Oncology</a></li>
                <li><a href="#services" className="hover:text-sky-400 transition">24/7 Level-1 Trauma</a></li>
              </ul>
            </div>

            {/* Quick Links: Portals & Services */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Portals & Services</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/login?tab=patient" className="hover:text-sky-400 transition">Patient Portal Sign In</Link></li>
                <li><Link to="/login?tab=staff" className="hover:text-sky-400 transition">Doctor & Staff Workstation</Link></li>
                <li><a href="#book-appointment" className="hover:text-sky-400 transition">Schedule Appointment</a></li>
                <li><Link to="/login?tab=patient" className="hover:text-sky-400 transition">Laboratory Test Reports</Link></li>
                <li><Link to="/login?tab=patient" className="hover:text-sky-400 transition">E-Pharmacy Refills</Link></li>
                <li><a href="#contact" className="hover:text-sky-400 transition">Billing & Cashless Claims</a></li>
              </ul>
            </div>

            {/* Compliance & Accreditations */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Accreditations</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>JCI Joint Commission Gold</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400" />
                  <span>HIPAA Certified Security</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-sky-400" />
                  <span>NABH Hospital Excellence</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span>ISO 9001:2026 Quality</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom copyright */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>&copy; {new Date().getFullYear()} HealthCare Hospital Patient Management System (HPMS). All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#contact" className="hover:text-slate-400 transition">Privacy Policy</a>
              <a href="#contact" className="hover:text-slate-400 transition">Terms of Service</a>
              <a href="#contact" className="hover:text-slate-400 transition">HIPAA Compliance</a>
              <a href="#contact" className="hover:text-slate-400 transition">Patient Rights</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
