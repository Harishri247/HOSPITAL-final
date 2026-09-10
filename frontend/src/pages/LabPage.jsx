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
  RefreshCw
} from 'lucide-react';

export const LabPage = () => {
  const { user, hasRole } = useAuth();
  const isDoctor = hasRole(['ROLE_DOCTOR']);
  const isTechnician = hasRole(['ROLE_LAB_TECHNICIAN']);
  const isAdmin = hasRole(['ROLE_ADMIN']);

  const [orders, setOrders] = useState([]);
  const [criticalValues, setCriticalValues] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, COMPLETED
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // New Order Modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    patientId: '',
    doctorId: user?.id || '',
    testName: 'Complete Blood Count (CBC)',
    testCode: 'LAB-CBC',
    specimenType: 'BLOOD',
  });

  // Enter Result Modal
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [resultForm, setResultForm] = useState({
    resultValue: '',
    referenceRange: '',
    unit: '',
    flag: 'NORMAL',
    verifiedBy: user?.fullName || 'Lab Technician',
  });
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
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
    } catch (e) {
      console.error('Failed to load lab data:', e);
    } finally {
      setLoading(false);
    }
  };

  const openOrderModal = () => {
    setOrderForm({
      patientId: patients[0]?.id || '',
      doctorId: isDoctor ? user?.id : (doctors[0]?.id || user?.id || ''),
      testName: 'Complete Blood Count (CBC)',
      testCode: 'LAB-CBC',
      specimenType: 'BLOOD',
    });
    setModalError('');
    setOrderModalOpen(true);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      await labApi.createOrder({
        ...orderForm,
        doctorId: isDoctor ? user?.id : orderForm.doctorId
      });
      setOrderModalOpen(false);
      loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to place laboratory order');
    }
  };

  const openResultModal = (order) => {
    setSelectedOrderId(order.id);
    setResultForm({
      resultValue: '',
      referenceRange: '3.5 - 5.0',
      unit: 'mEq/L',
      flag: 'NORMAL',
      verifiedBy: user?.fullName || 'Lab Technician',
    });
    setModalError('');
    setResultModalOpen(true);
  };

  const handleRecordResult = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      await labApi.recordResult(selectedOrderId, resultForm);
      setResultModalOpen(false);
      loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to submit test results');
    }
  };

  const openDetailModal = (order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  // Visible orders (Strict Doctor Scoping)
  const visibleOrders = isDoctor
    ? orders.filter((o) => o.doctorId === user?.id)
    : orders;

  // Filtered orders
  const filteredOrders = visibleOrders.filter((o) => {
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && o.status === 'ORDERED') ||
      (statusFilter === 'COMPLETED' && o.status === 'COMPLETED');

    const matchSearch =
      !searchTerm ||
      o.testName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.testCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patientNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id?.toString().includes(searchTerm);

    return matchStatus && matchSearch;
  });

  const pendingCount = visibleOrders.filter((o) => o.status === 'ORDERED').length;
  const completedCount = visibleOrders.filter((o) => o.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 font-display flex items-center gap-2">
            <FlaskConical className="text-teal-600 dark:text-teal-400" /> Laboratory Diagnostics Workbench
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            {isDoctor
              ? `Diagnostic orders, test results, and critical alerts for assigned patients of ${user?.fullName}`
              : 'Specimen intake, analysis, reference range calibration, and critical physician alerts'}
          </p>
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-600/20 transition"
            >
              <PlusCircle className="w-4 h-4" /> Order Laboratory Test
            </button>
          )}
        </div>
      </div>

      {/* Doctor Scoping Notice */}
      {isDoctor && (
        <div className="px-4 py-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              <strong>Doctor Patient Roster:</strong> Only lab orders and results for your assigned patients are displayed.
            </span>
          </div>
          <span className="font-semibold text-teal-700 dark:text-teal-300">
            {visibleOrders.length} Total Records
          </span>
        </div>
      )}

      {/* Critical alerts banner */}
      {criticalValues.length > 0 && (
        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-sm mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
            <span>Active Critical Laboratory Findings ({criticalValues.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {criticalValues.map((cv) => (
              <div key={cv.id} className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60">
                <span className="font-mono text-rose-600 font-extrabold text-sm block">
                  {cv.resultValue} {cv.unit} (Ref: {cv.referenceRange})
                </span>
                <span className="text-slate-500 block text-[11px] mt-1">
                  Verified by: {cv.verifiedBy} &bull; Order #{cv.labOrderId}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by test name, code, patient, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 w-full sm:w-auto">
          {[
            { id: 'ALL', label: `All Orders (${visibleOrders.length})` },
            { id: 'PENDING', label: `Pending Queue (${pendingCount})` },
            { id: 'COMPLETED', label: `Completed (${completedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === tab.id
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Laboratory Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
            {isDoctor ? "My Assigned Patients' Lab Diagnostic Orders" : 'Laboratory Diagnostic Queue & History'}
          </h3>
          <span className="text-xs text-slate-400">
            Showing {filteredOrders.length} of {visibleOrders.length} records
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading laboratory orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            {isDoctor
              ? 'No laboratory orders found for your assigned patients in this filter.'
              : 'No laboratory orders match your filter criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold bg-slate-50/50 dark:bg-slate-900/50">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Test Name & Code</th>
                  <th className="py-3 px-4">Specimen</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Ordering Doctor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Diagnostic Result</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.map((o) => {
                  const isCompleted = o.status === 'COMPLETED';
                  const res = o.result;

                  const flagStyles = {
                    CRITICAL: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-extrabold animate-pulse',
                    HIGH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-bold',
                    LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold',
                    NORMAL: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-semibold',
                  };

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-mono font-bold text-teal-600">#{o.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                        {o.testName}
                        <span className="text-[10px] text-slate-400 block font-mono">{o.testCode}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[10px]">
                          {o.specimenType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                        {o.patientName}
                        <span className="text-[10px] text-slate-400 block">{o.patientNumber}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{o.doctorName}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {isCompleted ? 'Completed' : 'Pending Analysis'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isCompleted && res ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                              {res.resultValue} {res.unit}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] ${flagStyles[res.flag] || 'bg-slate-100 text-slate-700'}`}>
                              {res.flag}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Awaiting specimen testing</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openDetailModal(o)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-medium transition"
                          title="View Specimen Report"
                        >
                          <FileText size={12} /> View
                        </button>
                        {hasRole(['ROLE_LAB_TECHNICIAN', 'ROLE_ADMIN']) && o.status === 'ORDERED' && (
                          <button
                            onClick={() => openResultModal(o)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-semibold shadow-sm transition"
                          >
                            <Microscope size={12} /> Enter Result
                          </button>
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

      {/* Lab Diagnostic Report Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Laboratory Specimen Report #${selectedOrder?.id}`}
        maxWidth="max-w-lg"
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="border-b dark:border-slate-700 pb-3 flex justify-between items-start">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">{selectedOrder.testName}</h4>
                <p className="text-slate-400 font-mono text-[11px]">Test Code: {selectedOrder.testCode}</p>
                <p className="text-slate-400 text-[11px]">Specimen Type: {selectedOrder.specimenType}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  selectedOrder.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }`}
              >
                {selectedOrder.status === 'COMPLETED' ? 'Completed' : 'Pending Testing'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Patient:</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{selectedOrder.patientName}</p>
                <p className="text-slate-400 text-[11px]">ID: {selectedOrder.patientNumber}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Ordering Physician:</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{selectedOrder.doctorName}</p>
                <p className="text-slate-400 text-[11px]">
                  Ordered: {selectedOrder.orderedDate ? new Date(selectedOrder.orderedDate).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Diagnostic Result */}
            {selectedOrder.result ? (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
                  Calibrated Clinical Findings
                </h5>
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Observed Value:</span>
                    <span className="font-mono text-lg font-extrabold text-slate-900 dark:text-white">
                      {selectedOrder.result.resultValue} {selectedOrder.result.unit}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Reference Range:</span>
                    <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {selectedOrder.result.referenceRange}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Clinical Flag:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                        selectedOrder.result.flag === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                          : selectedOrder.result.flag === 'HIGH' || selectedOrder.result.flag === 'LOW'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {selectedOrder.result.flag}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Verified by: <strong>{selectedOrder.result.verifiedBy}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                Diagnostic specimen test is currently in progress. Result will be displayed once verified by lab staff.
              </div>
            )}

            <div className="pt-3 border-t dark:border-slate-700 flex justify-end gap-2">
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

      {/* Order Test Modal */}
      <Modal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title="Order Laboratory Test"
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
              Test Name *
            </label>
            <input
              type="text"
              required
              value={orderForm.testName}
              onChange={(e) => setOrderForm({ ...orderForm, testName: e.target.value })}
              placeholder="e.g. Complete Blood Count (CBC)"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Test Code *
              </label>
              <input
                type="text"
                required
                value={orderForm.testCode}
                onChange={(e) => setOrderForm({ ...orderForm, testCode: e.target.value })}
                placeholder="e.g. LAB-CBC"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>

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
              </select>
            </div>
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
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
            >
              Submit Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Enter Result Modal */}
      <Modal
        isOpen={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title={`Enter Diagnostic Result for Order #${selectedOrderId}`}
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
                placeholder="e.g. 6.8"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">CRITICAL (Alerts Doctor)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Verified By *
            </label>
            <input
              type="text"
              required
              value={resultForm.verifiedBy}
              onChange={(e) => setResultForm({ ...resultForm, verifiedBy: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
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
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
            >
              Save & Verify Result
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LabPage;
