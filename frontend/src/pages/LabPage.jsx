import React, { useState, useEffect } from 'react';
import { labApi, patientApi, userApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  FlaskConical,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  FileText,
  Printer,
  ShieldCheck,
  Microscope,
  RefreshCw,
  Barcode,
  Stethoscope,
  Check,
  ArrowRight,
  Activity,
  Zap,
  CheckSquare,
  Sparkles,
  ClipboardList
} from 'lucide-react';

const COMMON_TESTS = [
  { name: 'Complete Blood Count (CBC)', code: 'LAB-CBC', specimen: 'BLOOD', ref: '4.5 - 11.0', unit: '10^3/uL' },
  { name: 'Comprehensive Metabolic Panel (CMP)', code: 'LAB-CMP', specimen: 'SERUM', ref: '70 - 99', unit: 'mg/dL' },
  { name: 'Lipid Panel', code: 'LAB-LIPID', specimen: 'SERUM', ref: '< 200', unit: 'mg/dL' },
  { name: 'Liver Function Panel (LFT)', code: 'LAB-LFT', specimen: 'SERUM', ref: '7 - 56', unit: 'U/L' },
  { name: 'Renal Function Panel (BUN & Creatinine)', code: 'LAB-RENAL', specimen: 'SERUM', ref: '0.7 - 1.3', unit: 'mg/dL' },
  { name: 'Hemoglobin A1c (HbA1c)', code: 'LAB-HBA1C', specimen: 'BLOOD', ref: '4.0 - 5.6', unit: '%' },
  { name: 'Serum Electrolytes (Na/K/Cl)', code: 'LAB-LYTES', specimen: 'SERUM', ref: '3.5 - 5.0', unit: 'mEq/L' },
  { name: 'Urinalysis with Microscopic Exam', code: 'LAB-UA', specimen: 'URINE', ref: 'Negative', unit: 'field' },
  { name: 'Thyroid Stimulating Hormone (TSH)', code: 'LAB-TSH', specimen: 'SERUM', ref: '0.4 - 4.0', unit: 'uIU/mL' },
  { name: 'Troponin I (Cardiac Biomarker)', code: 'LAB-TROP', specimen: 'SERUM', ref: '< 0.04', unit: 'ng/mL' },
  { name: 'Blood Culture & Sensitivity', code: 'LAB-BCX', specimen: 'BLOOD', ref: 'No growth', unit: 'status' },
];

const ANALYZER_EQUIPMENT = [
  'Sysmex XN-550 Automated Hematology Analyzer',
  'Roche Cobas c311 Clinical Chemistry Analyzer',
  'Abbott Architect i1000SR Immunoassay System',
  'Siemens Clinitek Status+ Urinalysis Analyzer',
  'Bio-Rad D-10 Hemoglobin Testing System',
  'Manual High-Resolution Light Microscopy',
];

export const LabPage = () => {
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole(['ROLE_DOCTOR']);
  const isTechnician = hasRole(['ROLE_LAB_TECHNICIAN']);
  const isAdmin = hasRole(['ROLE_ADMIN']);
  const isPatient = hasRole(['ROLE_PATIENT']) || user?.role === 'ROLE_PATIENT' || user?.role === 'PATIENT';

  const [orders, setOrders] = useState([]);
  const [criticalValues, setCriticalValues] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ORDERED, IN_LAB, COMPLETED, REVIEWED
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [specimenModalOpen, setSpecimenModalOpen] = useState(false);
  const [testingModalOpen, setTestingModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const [isCustomTest, setIsCustomTest] = useState(false);

  // 1. Order Test Form
  const [orderForm, setOrderForm] = useState({
    patientId: '',
    doctorId: user?.id || '',
    testName: COMMON_TESTS[0].name,
    testCode: COMMON_TESTS[0].code,
    specimenType: COMMON_TESTS[0].specimen,
    priority: 'ROUTINE',
    clinicalNotes: '',
  });

  // 2. Receive Form
  const [receiveForm, setReceiveForm] = useState({
    receivedBy: user?.fullName || user?.username || 'Lab Technician',
  });

  // 3. Specimen Collection Form
  const [specimenForm, setSpecimenForm] = useState({
    specimenBarcode: '',
    specimenNotes: '',
  });

  // 4. Start Testing Form
  const [testingForm, setTestingForm] = useState({
    testingEquipment: ANALYZER_EQUIPMENT[0],
  });

  // 5. Enter Result Form
  const [resultForm, setResultForm] = useState({
    resultValue: '',
    referenceRange: '',
    unit: '',
    flag: 'NORMAL',
    verifiedBy: user?.fullName || user?.username || 'Lab Technician',
    remarks: '',
  });

  // 7. Doctor Review Form
  const [reviewForm, setReviewForm] = useState({
    doctorReviewNotes: '',
    confirmed: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isPatient) {
        const [allOrdersRes, critRes] = await Promise.all([
          labApi.getAll(),
          labApi.getCritical(),
        ]);
        setOrders(allOrdersRes.data || []);
        setCriticalValues(critRes.data || []);
        try {
          const meRes = await patientApi.getMe();
          setPatients(meRes.data ? [meRes.data] : []);
        } catch (e2) {}
      } else {
        const [allOrdersRes, critRes, patRes, docRes] = await Promise.all([
          labApi.getAll(),
          labApi.getCritical(),
          patientApi.getAll(),
          userApi.getDoctors(),
        ]);
        setOrders(allOrdersRes.data || []);
        setCriticalValues(critRes.data || []);
        setPatients(patRes.data || []);
        setDoctors(docRes.data || []);
      }
    } catch (e) {
      console.error('Failed to load lab data:', e);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Workflow Actions
  // -------------------------------------------------------------

  // STEP 1: DOCTOR ORDERS LAB TEST
  const openOrderModal = () => {
    setIsCustomTest(false);
    setOrderForm({
      patientId: patients[0]?.id || '',
      doctorId: isDoctor ? user?.id : (doctors[0]?.id || user?.id || ''),
      testName: COMMON_TESTS[0].name,
      testCode: COMMON_TESTS[0].code,
      specimenType: COMMON_TESTS[0].specimen,
      priority: 'ROUTINE',
      clinicalNotes: '',
    });
    setModalError('');
    setOrderModalOpen(true);
  };

  const handleTestSelection = (testName) => {
    if (testName === 'CUSTOM') {
      setIsCustomTest(true);
      setOrderForm((prev) => ({
        ...prev,
        testName: '',
        testCode: '',
      }));
      return;
    }
    setIsCustomTest(false);
    const matched = COMMON_TESTS.find((t) => t.name === testName);
    if (matched) {
      setOrderForm((prev) => ({
        ...prev,
        testName: matched.name,
        testCode: matched.code,
        specimenType: matched.specimen,
      }));
    } else {
      setOrderForm((prev) => ({ ...prev, testName }));
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setModalError('');
    setActionLoading(true);
    try {
      await labApi.createOrder({
        ...orderForm,
        doctorId: isDoctor ? user?.id : orderForm.doctorId,
      });
      setOrderModalOpen(false);
      await loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to place laboratory order');
    } finally {
      setActionLoading(false);
    }
  };

  // STEP 2: LAB TECHNICIAN RECEIVES ORDER
  const openReceiveModal = (order) => {
    setSelectedOrder(order);
    setReceiveForm({
      receivedBy: user?.fullName || user?.username || 'Lab Technician',
    });
    setModalError('');
    setReceiveModalOpen(true);
  };

  const handleReceiveOrder = async (e) => {
    e.preventDefault();
    setModalError('');
    setActionLoading(true);
    try {
      await labApi.receiveOrder(selectedOrder.id, receiveForm);
      setReceiveModalOpen(false);
      await loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to receive lab order');
    } finally {
      setActionLoading(false);
    }
  };

  // STEP 3: LAB TECHNICIAN COLLECTS/PROCESSES SPECIMEN
  const openSpecimenModal = (order) => {
    setSelectedOrder(order);
    const autoBarcode = `BC-${order.id}-${Math.floor(1000 + Math.random() * 9000)}`;
    setSpecimenForm({
      specimenBarcode: autoBarcode,
      specimenNotes: '',
    });
    setModalError('');
    setSpecimenModalOpen(true);
  };

  const handleCollectSpecimen = async (e) => {
    e.preventDefault();
    setModalError('');
    setActionLoading(true);
    try {
      await labApi.collectSpecimen(selectedOrder.id, specimenForm);
      setSpecimenModalOpen(false);
      await loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to log specimen collection');
    } finally {
      setActionLoading(false);
    }
  };

  // STEP 4: LAB TECHNICIAN PERFORMS TEST
  const openTestingModal = (order) => {
    setSelectedOrder(order);
    setTestingForm({
      testingEquipment: ANALYZER_EQUIPMENT[0],
    });
    setModalError('');
    setTestingModalOpen(true);
  };

  const handleStartTesting = async (e) => {
    e.preventDefault();
    setModalError('');
    setActionLoading(true);
    try {
      await labApi.startTesting(selectedOrder.id, testingForm);
      setTestingModalOpen(false);
      await loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to initiate laboratory test');
    } finally {
      setActionLoading(false);
    }
  };

  // STEP 5: LAB TECHNICIAN ENTERS/VERIFIES RESULT
  const openResultModal = (order) => {
    setSelectedOrder(order);
    const matched = COMMON_TESTS.find((t) => t.code === order.testCode || t.name === order.testName);
    setResultForm({
      resultValue: '',
      referenceRange: matched?.ref || '',
      unit: matched?.unit || '',
      flag: 'NORMAL',
      verifiedBy: user?.fullName || user?.username || 'Lab Technician',
      remarks: '',
    });
    setModalError('');
    setResultModalOpen(true);
  };

  const handleRecordResult = async (e) => {
    e.preventDefault();
    setModalError('');
    setActionLoading(true);
    try {
      await labApi.recordResult(selectedOrder.id, resultForm);
      setResultModalOpen(false);
      await loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to submit test results');
    } finally {
      setActionLoading(false);
    }
  };

  // STEP 6: VIEW OFFICIAL LAB REPORT
  const openDetailModal = (order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  // STEP 7: DOCTOR REVIEWS RESULT
  const openReviewModal = (order) => {
    setSelectedOrder(order);
    setReviewForm({
      doctorReviewNotes: '',
      confirmed: true,
    });
    setModalError('');
    setReviewModalOpen(true);
  };

  const handleDoctorReview = async (e) => {
    e.preventDefault();
    setModalError('');
    setActionLoading(true);
    try {
      await labApi.doctorReview(selectedOrder.id, {
        doctorReviewNotes: reviewForm.doctorReviewNotes,
      });
      setReviewModalOpen(false);
      await loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to submit doctor review');
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Scoping & Filtering
  // -------------------------------------------------------------
  const visibleOrders = isDoctor
    ? orders.filter((o) => o.doctorId === user?.id)
    : orders;

  const filteredOrders = visibleOrders.filter((o) => {
    let matchStatus = true;
    if (statusFilter === 'ORDERED') matchStatus = o.status === 'ORDERED';
    else if (statusFilter === 'IN_LAB') {
      matchStatus = ['RECEIVED', 'SPECIMEN_COLLECTED', 'IN_PROGRESS'].includes(o.status);
    } else if (statusFilter === 'COMPLETED') {
      matchStatus = o.status === 'COMPLETED';
    } else if (statusFilter === 'REVIEWED') {
      matchStatus = o.status === 'REVIEWED';
    }

    const matchPriority = priorityFilter === 'ALL' || o.priority === priorityFilter;

    const matchSearch =
      !searchTerm ||
      o.testName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.testCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patientNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.specimenBarcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id?.toString().includes(searchTerm);

    return matchStatus && matchPriority && matchSearch;
  });

  // KPI Metrics
  const orderedCount = visibleOrders.filter((o) => o.status === 'ORDERED').length;
  const inLabCount = visibleOrders.filter((o) => ['RECEIVED', 'SPECIMEN_COLLECTED', 'IN_PROGRESS'].includes(o.status)).length;
  const completedCount = visibleOrders.filter((o) => o.status === 'COMPLETED').length;
  const reviewedCount = visibleOrders.filter((o) => o.status === 'REVIEWED').length;

  // Helper for Stepper Stage Index
  const getStageIndex = (status) => {
    switch (status) {
      case 'ORDERED': return 1;
      case 'RECEIVED': return 2;
      case 'SPECIMEN_COLLECTED': return 3;
      case 'IN_PROGRESS': return 4;
      case 'COMPLETED': return 5;
      case 'REVIEWED': return 6;
      default: return 0;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ORDERED':
        return { text: '1. Order Placed', style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' };
      case 'RECEIVED':
        return { text: '2. Order Received', style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' };
      case 'SPECIMEN_COLLECTED':
        return { text: '3. Specimen Collected', style: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' };
      case 'IN_PROGRESS':
        return { text: '4. Testing in Progress', style: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 animate-pulse' };
      case 'COMPLETED':
        return { text: '5. Results Verified', style: 'bg-sky-500/10 text-blue-600 dark:text-sky-400 border border-sky-500/20' };
      case 'REVIEWED':
        return { text: '6. Doctor Reviewed', style: 'bg-sky-500/10 text-blue-600 dark:text-sky-400 border border-sky-500/20' };
      default:
        return { text: status, style: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20' };
    }
  };

  const flagStyles = {
    CRITICAL: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-extrabold animate-pulse',
    HIGH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-bold',
    LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold',
    NORMAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-sky-300 font-semibold',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display">
                Laboratory Diagnostics Workbench
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Manage diagnostic orders, specimen processing, and laboratory reports
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {hasRole(['ROLE_DOCTOR', 'ROLE_ADMIN']) && (
            <button
              onClick={openOrderModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition"
            >
              <PlusCircle className="w-4 h-4" /> Order Laboratory Test
            </button>
          )}
        </div>
      </div>




      {/* Critical alerts banner */}
      {criticalValues.length > 0 && (
        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
              <span>Active Critical Laboratory Findings ({criticalValues.length})</span>
            </div>
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
              Immediate Physician Notification Active
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
            {criticalValues.map((cv) => (
              <div key={cv.id} className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 flex justify-between items-center shadow-xs">
                <div>
                  <span className="font-mono text-rose-600 dark:text-rose-400 font-extrabold text-sm block">
                    {cv.resultValue} {cv.unit}
                  </span>
                  <span className="text-slate-500 block text-[10px] mt-0.5">
                    Ref: {cv.referenceRange} &bull; Verified: {cv.verifiedBy}
                  </span>
                  <span className="text-slate-400 text-[10px] block">Order #{cv.labOrderId}</span>
                </div>
                <button
                  onClick={() => {
                    const matched = orders.find((o) => o.id === cv.labOrderId);
                    if (matched) openDetailModal(matched);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/50 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-[11px] font-bold"
                >
                  View Report
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI / Pipeline Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('ORDERED')}
          className={`cursor-pointer p-4 rounded-3xl border transition-all ${
            statusFilter === 'ORDERED'
              ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Awaiting Intake</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">{orderedCount}</p>
          <span className="text-[10px] text-slate-400">Doctor orders placed</span>
        </div>

        <div
          onClick={() => setStatusFilter('IN_LAB')}
          className={`cursor-pointer p-4 rounded-3xl border transition-all ${
            statusFilter === 'IN_LAB'
              ? 'bg-blue-500/10 border-blue-500/40 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Active Lab Queue</span>
            <Microscope className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">{inLabCount}</p>
          <span className="text-[10px] text-slate-400">Specimen / Testing bench</span>
        </div>

        <div
          onClick={() => setStatusFilter('COMPLETED')}
          className={`cursor-pointer p-4 rounded-3xl border transition-all ${
            statusFilter === 'COMPLETED'
              ? 'bg-sky-500/10 border-sky-500/40 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Ready for Review</span>
            <CheckCircle2 className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">{completedCount}</p>
          <span className="text-[10px] text-slate-400">Verified by Lab Tech</span>
        </div>

        <div
          onClick={() => setStatusFilter('REVIEWED')}
          className={`cursor-pointer p-4 rounded-3xl border transition-all ${
            statusFilter === 'REVIEWED'
              ? 'bg-sky-500/10 border-sky-500/40 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Doctor Signed Off</span>
            <Stethoscope className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">{reviewedCount}</p>
          <span className="text-[10px] text-slate-400">Closed-loop completed</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search test name, code, barcode, patient name, MRN, doctor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="ROUTINE">Routine</option>
            <option value="URGENT">Urgent</option>
            <option value="EMERGENCY">STAT / Emergency</option>
          </select>

          {/* Status Tab buttons */}
          <div className="flex gap-1 overflow-x-auto w-full md:w-auto">
            {[
              { id: 'ALL', label: `All (${visibleOrders.length})` },
              { id: 'ORDERED', label: `Intake (${orderedCount})` },
              { id: 'IN_LAB', label: `In Lab (${inLabCount})` },
              { id: 'COMPLETED', label: `Verified (${completedCount})` },
              { id: 'REVIEWED', label: `Signed (${reviewedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            {isDoctor ? "My Assigned Patients' Lab Diagnostic Orders" : 'Laboratory Diagnostics Roster & Queue'}
          </h3>
          <span className="text-xs text-slate-400">
            Showing {filteredOrders.length} of {visibleOrders.length} records
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading laboratory diagnostic records...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 mx-auto flex items-center justify-center mb-3">
              <FlaskConical className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              No Diagnostic Lab Orders Registered
            </h4>
            <p className="text-slate-400 text-xs mt-1.5 max-w-md mx-auto leading-relaxed">
              {isDoctor
                ? 'No laboratory orders found for your assigned patients. Real orders placed during patient consultations or ordered directly using "Order Laboratory Test" will appear here.'
                : 'Real diagnostic orders placed by hospital physicians during clinical consultations or direct requisitions will be logged here for accessioning and analysis.'}
            </p>
            {hasRole(['ROLE_DOCTOR', 'ROLE_ADMIN']) && (
              <button
                onClick={openOrderModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Place First Lab Order
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold bg-slate-50/50 dark:bg-slate-900/50">
                <tr>
                  <th className="py-3 px-4">Order & Accession</th>
                  <th className="py-3 px-4">Test Details</th>
                  <th className="py-3 px-4">Patient & Doctor</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Lifecycle Progress</th>
                  <th className="py-3 px-4">Verified Finding</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.map((o) => {
                  const statusInfo = getStatusBadge(o.status);
                  const isCompleted = o.status === 'COMPLETED' || o.status === 'REVIEWED';
                  const res = o.result;
                  const stageNum = getStageIndex(o.status);

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-600 dark:text-sky-400 block">#{o.id}</span>
                        {o.specimenBarcode ? (
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Barcode className="w-3 h-3 text-slate-400" /> {o.specimenBarcode}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Barcode pending</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 dark:text-slate-100 block">{o.testName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">{o.testCode}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">
                            {o.specimenType}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 block">{o.patientName}</span>
                        <span className="text-[10px] text-slate-400 block">
                          MRN: {o.patientNumber} &bull; Dr: {o.doctorName}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            o.priority === 'EMERGENCY'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                              : o.priority === 'URGENT'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {o.priority === 'EMERGENCY' && <Zap className="w-2.5 h-2.5" />}
                          {o.priority || 'ROUTINE'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${statusInfo.style}`}>
                            {statusInfo.text}
                          </span>
                          {/* Mini Progress Bar */}
                          <div className="w-28 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                stageNum === 6
                                  ? 'bg-sky-500'
                                  : stageNum === 5
                                  ? 'bg-sky-500'
                                  : stageNum >= 3
                                  ? 'bg-indigo-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${(stageNum / 6) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isCompleted && res ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                                {res.resultValue} {res.unit}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] ${flagStyles[res.flag] || 'bg-slate-100 text-slate-700'}`}>
                                {res.flag}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Ref: {res.referenceRange}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">In analysis</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Always available: View Diagnostic Report */}
                        <button
                          onClick={() => openDetailModal(o)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-medium transition"
                          title="View Official Lab Report"
                        >
                          <FileText size={12} /> Report
                        </button>

                        {/* STEP 2: LAB TECH RECEIVES ORDER */}
                        {hasRole(['ROLE_LAB_TECHNICIAN', 'ROLE_ADMIN']) && o.status === 'ORDERED' && (
                          <button
                            onClick={() => openReceiveModal(o)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold shadow-sm transition"
                          >
                            <Check size={12} /> Receive
                          </button>
                        )}

                        {/* STEP 3: LAB TECH COLLECTS SPECIMEN */}
                        {hasRole(['ROLE_LAB_TECHNICIAN', 'ROLE_ADMIN']) && o.status === 'RECEIVED' && (
                          <button
                            onClick={() => openSpecimenModal(o)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold shadow-sm transition"
                          >
                            <Barcode size={12} /> Collect Specimen
                          </button>
                        )}

                        {/* STEP 4: LAB TECH PERFORMS TEST */}
                        {hasRole(['ROLE_LAB_TECHNICIAN', 'ROLE_ADMIN']) && o.status === 'SPECIMEN_COLLECTED' && (
                          <button
                            onClick={() => openTestingModal(o)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-semibold shadow-sm transition"
                          >
                            <Microscope size={12} /> Start Test
                          </button>
                        )}

                        {/* STEP 5: LAB TECH ENTERS / VERIFIES RESULT */}
                        {hasRole(['ROLE_LAB_TECHNICIAN', 'ROLE_ADMIN']) && o.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => openResultModal(o)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold shadow-sm transition"
                          >
                            <CheckSquare size={12} /> Enter Result
                          </button>
                        )}

                        {/* STEP 7: DOCTOR REVIEWS & SIGNS OFF */}
                        {hasRole(['ROLE_DOCTOR', 'ROLE_ADMIN']) && o.status === 'COMPLETED' && (
                          <button
                            onClick={() => openReviewModal(o)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold shadow-sm transition animate-bounce"
                          >
                            <Stethoscope size={12} /> Review & Sign
                          </button>
                        )}

                        {/* Sign-off badge */}
                        {o.status === 'REVIEWED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-sky-400 font-semibold px-2 py-1 bg-sky-50 dark:bg-blue-950/40 rounded-lg">
                            <ShieldCheck size={12} /> Signed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: ORDER LABORATORY TEST MODAL (DOCTOR) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title="Step 1: Order Laboratory Diagnostic Test"
        maxWidth="max-w-md"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {modalError}
          </div>
        )}

        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Patient *
            </label>
            <select
              required
              value={orderForm.patientId}
              onChange={(e) => setOrderForm({ ...orderForm, patientId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            >
              {patients.length === 0 ? (
                <option value="">No patients available</option>
              ) : (
                patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.patientNumber})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ordering Physician *
            </label>
            {isDoctor ? (
              <input
                type="text"
                disabled
                value={user?.fullName || 'Assigned Doctor'}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl opacity-80 cursor-not-allowed font-semibold"
              />
            ) : (
              <select
                value={orderForm.doctorId}
                onChange={(e) => setOrderForm({ ...orderForm, doctorId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.staffId || 'DOC'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Diagnostic Test Catalog *
            </label>
            <select
              value={isCustomTest ? 'CUSTOM' : orderForm.testName}
              onChange={(e) => handleTestSelection(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-medium"
            >
              <optgroup label="Standard Diagnostic Panels">
                {COMMON_TESTS.map((t) => (
                  <option key={t.code} value={t.name}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Custom Diagnostic Test">
                <option value="CUSTOM">+ Custom / Specialized Diagnostic Test</option>
              </optgroup>
            </select>
          </div>

          {isCustomTest && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Test Name *
                </label>
                <input
                  type="text"
                  required
                  value={orderForm.testName}
                  onChange={(e) => setOrderForm({ ...orderForm, testName: e.target.value })}
                  placeholder="e.g. Serum Ferritin"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Test Code *
                </label>
                <input
                  type="text"
                  required
                  value={orderForm.testCode}
                  onChange={(e) => setOrderForm({ ...orderForm, testCode: e.target.value })}
                  placeholder="e.g. LAB-FERRITIN"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Specimen Type *
              </label>
              <select
                value={orderForm.specimenType}
                onChange={(e) => setOrderForm({ ...orderForm, specimenType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                <option value="BLOOD">Blood</option>
                <option value="SERUM">Serum</option>
                <option value="URINE">Urine</option>
                <option value="SWAB">Swab</option>
                <option value="TISSUE">Tissue</option>
                <option value="SPUTUM">Sputum</option>
                <option value="CSF">Cerebrospinal Fluid (CSF)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority / Urgency *
              </label>
              <select
                value={orderForm.priority}
                onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-semibold text-blue-600"
              >
                <option value="ROUTINE">Routine (Standard Queue)</option>
                <option value="URGENT">Urgent (Within 2 Hours)</option>
                <option value="EMERGENCY">STAT / Emergency (Immediate)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Clinical Indication / Reason for Test
            </label>
            <textarea
              rows={2}
              value={orderForm.clinicalNotes}
              onChange={(e) => setOrderForm({ ...orderForm, clinicalNotes: e.target.value })}
              placeholder="e.g. Patient presents with persistent fever and leukocytosis; evaluate infection markers."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOrderModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-1.5"
            >
              {actionLoading ? 'Placing Order...' : 'Submit Lab Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* STEP 2: RECEIVE LAB ORDER MODAL (LAB TECHNICIAN) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        title={`Step 2: Lab Technician Intake for Order #${selectedOrder?.id}`}
        maxWidth="max-w-md"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {modalError}
          </div>
        )}

        <form onSubmit={handleReceiveOrder} className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60">
            <p className="font-bold text-blue-900 dark:text-blue-200">Acknowledge Laboratory Intake</p>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">
              Confirming this requisition transitions order #{selectedOrder?.id} ({selectedOrder?.testName}) into the active laboratory queue.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Order Details:</span>
            <p className="text-slate-700 dark:text-slate-200 font-semibold">
              Patient: {selectedOrder?.patientName} ({selectedOrder?.patientNumber})
            </p>
            <p className="text-slate-500 text-[11px]">
              Specimen Required: <strong>{selectedOrder?.specimenType}</strong> &bull; Priority: <strong>{selectedOrder?.priority}</strong>
            </p>
            {selectedOrder?.clinicalNotes && (
              <p className="text-slate-500 text-[11px] italic bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                Doctor Note: {selectedOrder.clinicalNotes}
              </p>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Receiving Technician Name *
            </label>
            <input
              type="text"
              required
              value={receiveForm.receivedBy}
              onChange={(e) => setReceiveForm({ ...receiveForm, receivedBy: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-medium"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReceiveModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-1.5"
            >
              {actionLoading ? 'Receiving...' : 'Confirm Lab Intake'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* STEP 3: COLLECT / PROCESS SPECIMEN MODAL (LAB TECHNICIAN) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={specimenModalOpen}
        onClose={() => setSpecimenModalOpen(false)}
        title={`Step 3: Collect & Accession Specimen for Order #${selectedOrder?.id}`}
        maxWidth="max-w-md"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {modalError}
          </div>
        )}

        <form onSubmit={handleCollectSpecimen} className="space-y-4 text-xs">
          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/60">
            <p className="font-bold text-indigo-900 dark:text-indigo-200">Specimen Accessioning & Labeling</p>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">
              Assign a unique accession barcode and confirm sample viability for testing.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Generated Accession Barcode *
            </label>
            <div className="relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                required
                value={specimenForm.specimenBarcode}
                onChange={(e) => setSpecimenForm({ ...specimenForm, specimenBarcode: e.target.value })}
                className="w-full pl-9 pr-4 py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Specimen Physical Condition & Processing Notes
            </label>
            <textarea
              rows={3}
              value={specimenForm.specimenNotes}
              onChange={(e) => setSpecimenForm({ ...specimenForm, specimenNotes: e.target.value })}
              placeholder="Enter specimen physical condition, collection site, tube type, volume, or processing notes..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSpecimenModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center gap-1.5"
            >
              {actionLoading ? 'Logging...' : 'Accession Specimen'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* STEP 4: START TESTING MODAL (LAB TECHNICIAN) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={testingModalOpen}
        onClose={() => setTestingModalOpen(false)}
        title={`Step 4: Initiate Laboratory Testing for Order #${selectedOrder?.id}`}
        maxWidth="max-w-md"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {modalError}
          </div>
        )}

        <form onSubmit={handleStartTesting} className="space-y-4 text-xs">
          <div className="p-3 bg-purple-50/60 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-900/60">
            <p className="font-bold text-purple-900 dark:text-purple-200">Analyzer Calibration & Assay Run</p>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">
              Select calibrated diagnostic instrument and start analytical run for {selectedOrder?.testName}.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Diagnostic Analyzer / Equipment *
            </label>
            <select
              value={testingForm.testingEquipment}
              onChange={(e) => setTestingForm({ ...testingForm, testingEquipment: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-medium"
            >
              {ANALYZER_EQUIPMENT.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTestingModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl flex items-center gap-1.5"
            >
              {actionLoading ? 'Starting...' : 'Start Analytical Run'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* STEP 5: ENTER / VERIFY RESULT MODAL (LAB TECHNICIAN) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title={`Step 5: Enter & Verify Diagnostic Result for Order #${selectedOrder?.id}`}
        maxWidth="max-w-md"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {modalError}
          </div>
        )}

        <form onSubmit={handleRecordResult} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Observed Result Value *
              </label>
              <input
                type="text"
                required
                value={resultForm.resultValue}
                onChange={(e) => setResultForm({ ...resultForm, resultValue: e.target.value })}
                placeholder="e.g. 6.8 or 14.2"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit *
              </label>
              <input
                type="text"
                required
                value={resultForm.unit}
                onChange={(e) => setResultForm({ ...resultForm, unit: e.target.value })}
                placeholder="e.g. mg/dL or mEq/L"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Standard Reference Range *
              </label>
              <input
                type="text"
                required
                value={resultForm.referenceRange}
                onChange={(e) => setResultForm({ ...resultForm, referenceRange: e.target.value })}
                placeholder="e.g. 3.5 - 5.0"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Clinical Flag *
              </label>
              <select
                value={resultForm.flag}
                onChange={(e) => setResultForm({ ...resultForm, flag: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold"
              >
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">CRITICAL (Alerts Ordering Doctor)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Technician Remarks / Interpretation
            </label>
            <input
              type="text"
              value={resultForm.remarks}
              onChange={(e) => setResultForm({ ...resultForm, remarks: e.target.value })}
              placeholder="Enter technician clinical observations, QC checks, or analytical flags..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Verified By (Technician Signature) *
            </label>
            <input
              type="text"
              required
              value={resultForm.verifiedBy}
              onChange={(e) => setResultForm({ ...resultForm, verifiedBy: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-semibold text-blue-600 dark:text-sky-400"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setResultModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-1.5"
            >
              {actionLoading ? 'Saving...' : 'Save & Verify Result'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* STEP 6: OFFICIAL LAB REPORT MODAL (PRINT-READY) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Official Laboratory Specimen Report #${selectedOrder?.id}`}
        maxWidth="max-w-2xl"
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            {/* Hospital Lab Header */}
            <div className="border-b dark:border-slate-800 pb-3 flex justify-between items-start">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="text-blue-600 w-4 h-4" /> Department of Pathology & Laboratory Medicine
                </h4>
                <p className="text-slate-400 text-[11px]">Accredited Clinical Diagnostic Center</p>
                <p className="text-slate-500 font-mono text-[10px] mt-0.5">
                  Order Ref: #{selectedOrder.id} &bull; Barcode: {selectedOrder.specimenBarcode || 'N/A'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(selectedOrder.status).style}`}>
                {getStatusBadge(selectedOrder.status).text}
              </span>
            </div>

            {/* Patient & Doctor Demographics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Patient:</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{selectedOrder.patientName}</p>
                <p className="text-slate-400 text-[11px]">MRN: {selectedOrder.patientNumber}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Ordering Physician:</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{selectedOrder.doctorName}</p>
                <p className="text-slate-400 text-[11px]">Priority: {selectedOrder.priority || 'ROUTINE'}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Specimen & Equipment:</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{selectedOrder.specimenType}</p>
                <p className="text-slate-400 text-[10px] truncate">{selectedOrder.testingEquipment || 'Standard Bench'}</p>
              </div>
            </div>

            {/* Step-by-Step Audit Timeline */}
            <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-[11px] space-y-1.5">
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Specimen Lifecycle Audit Trail:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div>
                  <span className="text-slate-400 block">1. Ordered:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {selectedOrder.orderedDate ? new Date(selectedOrder.orderedDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">2. Received:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {selectedOrder.receivedBy || (selectedOrder.receivedDate ? 'Recorded' : 'Pending')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">3. Accessioned:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedOrder.specimenBarcode || 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">5. Verified By:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {selectedOrder.result?.verifiedBy || 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnostic Result Finding Table */}
            {selectedOrder.result ? (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
                    Validated Analytical Findings
                  </h5>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                      selectedOrder.result.flag === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                        : selectedOrder.result.flag === 'HIGH' || selectedOrder.result.flag === 'LOW'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    Clinical Flag: {selectedOrder.result.flag}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Observed Value:</span>
                    <span className="font-mono text-xl font-extrabold text-slate-900 dark:text-white">
                      {selectedOrder.result.resultValue} {selectedOrder.result.unit}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Reference Range:</span>
                    <span className="font-mono text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {selectedOrder.result.referenceRange}
                    </span>
                  </div>
                </div>

                {selectedOrder.result.remarks && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800">
                    Tech Remarks: {selectedOrder.result.remarks}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-5 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                Diagnostic specimen test is currently in progress. Analytical results will be generated once verified by laboratory staff.
              </div>
            )}

            {/* Doctor Review Sign-Off Section */}
            {selectedOrder.reviewedDate && (
              <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-blue-950/40 border border-sky-200 dark:border-blue-800/60">
                <div className="flex items-center gap-2 text-blue-800 dark:text-sky-300 font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Physician Clinical Review & Sign-Off</span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 italic">
                  "{selectedOrder.doctorReviewNotes}"
                </p>
                <div className="mt-2 text-[10px] text-blue-700 dark:text-sky-400 flex items-center justify-between">
                  <span>Reviewed by: <strong>{selectedOrder.reviewedByDoctorName || selectedOrder.doctorName}</strong></span>
                  <span>Date: {new Date(selectedOrder.reviewedDate).toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="pt-3 border-t dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-800 transition"
              >
                <Printer size={13} /> Print Report
              </button>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* STEP 7: DOCTOR REVIEWS & SIGNS OFF MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`Step 7: Physician Clinical Review for Order #${selectedOrder?.id}`}
        maxWidth="max-w-md"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {modalError}
          </div>
        )}

        <form onSubmit={handleDoctorReview} className="space-y-4 text-xs">
          <div className="p-3 bg-sky-50/60 dark:bg-blue-950/40 rounded-xl border border-sky-200 dark:border-blue-900/60">
            <p className="font-bold text-blue-900 dark:text-sky-200">Physician Result Sign-Off</p>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">
              Test: <strong>{selectedOrder?.testName}</strong> &bull; Patient: <strong>{selectedOrder?.patientName}</strong>
            </p>
            {selectedOrder?.result && (
              <div className="mt-2 p-2 bg-white dark:bg-slate-900 rounded-lg flex justify-between items-center text-[11px]">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedOrder.result.resultValue} {selectedOrder.result.unit}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${flagStyles[selectedOrder.result.flag] || ''}`}>
                  {selectedOrder.result.flag}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Physician Assessment & Action Plan *
            </label>
            <textarea
              required
              rows={3}
              value={reviewForm.doctorReviewNotes}
              onChange={(e) => setReviewForm({ ...reviewForm, doctorReviewNotes: e.target.value })}
              placeholder="Enter clinical assessment, correlation with patient diagnosis, and treatment directives..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <input
              type="checkbox"
              id="confirmReview"
              checked={reviewForm.confirmed}
              onChange={(e) => setReviewForm({ ...reviewForm, confirmed: e.target.checked })}
              className="rounded text-blue-600 focus:ring-sky-500"
            />
            <label htmlFor="confirmReview" className="text-[11px] text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              I have verified this laboratory report and digitally seal this assessment.
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReviewModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !reviewForm.confirmed}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center gap-1.5"
            >
              {actionLoading ? 'Signing Off...' : 'Review & Sign Off'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LabPage;
