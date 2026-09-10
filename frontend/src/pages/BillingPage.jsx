import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, DollarSign, CheckCircle2, Clock, 
  AlertCircle, ShieldCheck, FileText, Search, RefreshCw, Printer
} from 'lucide-react';
import { billingApi, patientApi } from '../api/apiService';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function BillingPage() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [reports, setReports] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState(null);

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  // Forms
  const [billForm, setBillForm] = useState({
    patientId: '',
    totalAmount: '',
    admissionId: '',
    insuranceClaimId: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'CASH',
    transactionReference: ''
  });

  const [claimForm, setClaimForm] = useState({
    insuranceProvider: '',
    policyNumber: '',
    claimAmount: '',
    remarks: ''
  });

  const canManage = ['ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(user?.role);
  const canPay = ['ADMIN', 'RECEPTIONIST', 'PATIENT'].includes(user?.role);

  useEffect(() => {
    fetchData();
    if (canManage) {
      patientApi.getAll().then(res => setPatients(res.data || [])).catch(() => {});
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (['ADMIN', 'RECEPTIONIST'].includes(user?.role)) {
        const [billsRes, reportRes] = await Promise.all([
          billingApi.getAll(),
          billingApi.getReports()
        ]);
        setBills(billsRes.data || []);
        setReports(reportRes.data || null);
      } else if (user?.role === 'PATIENT' && user?.id) {
        // If patient, find patient ID from profile or fetch bills
        const pRes = await patientApi.getAll();
        const myPatient = (pRes.data || []).find(p => p.userId === user.id);
        if (myPatient) {
          const res = await billingApi.getByPatient(myPatient.id);
          setBills(res.data || []);
        }
      } else {
        const billsRes = await billingApi.getAll();
        setBills(billsRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    try {
      await billingApi.generate({
        patientId: parseInt(billForm.patientId, 10),
        totalAmount: parseFloat(billForm.totalAmount),
        admissionId: billForm.admissionId ? parseInt(billForm.admissionId, 10) : null,
        insuranceClaimId: billForm.insuranceClaimId || null
      });
      setMessage({ type: 'success', text: 'Invoice generated successfully!' });
      setShowGenerateModal(false);
      setBillForm({ patientId: '', totalAmount: '', admissionId: '', insuranceClaimId: '' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to generate bill' });
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedBill) return;
    try {
      await billingApi.recordPayment(selectedBill.id, {
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        transactionReference: paymentForm.transactionReference,
        receivedBy: user?.username || 'Staff'
      });
      setMessage({ type: 'success', text: `Payment of $${paymentForm.amount} recorded successfully!` });
      setShowPaymentModal(false);
      setSelectedBill(null);
      setPaymentForm({ amount: '', paymentMethod: 'CASH', transactionReference: '' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Payment processing failed' });
    }
  };

  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!selectedBill) return;
    try {
      await billingApi.submitInsurance({
        billId: selectedBill.id,
        insuranceProvider: claimForm.insuranceProvider,
        policyNumber: claimForm.policyNumber,
        claimAmount: parseFloat(claimForm.claimAmount),
        remarks: claimForm.remarks
      });
      setMessage({ type: 'success', text: 'Insurance claim filed successfully!' });
      setShowClaimModal(false);
      setSelectedBill(null);
      setClaimForm({ insuranceProvider: '', policyNumber: '', claimAmount: '', remarks: '' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit claim' });
    }
  };

  const STATUS_OPTIONS = [
    { id: 'ALL', label: 'All' },
    { id: 'UNPAID', label: 'Unpaid' },
    { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
    { id: 'PAID', label: 'Paid' }
  ];

  const formatStatus = (status) => {
    if (!status) return '';
    if (status === 'PARTIALLY_PAID' || status === 'PARTIAL') return 'Partially Paid';
    if (status === 'PAID') return 'Paid';
    if (status === 'UNPAID') return 'Unpaid';
    if (status === 'REFUNDED') return 'Refunded';
    return status.replace(/_/g, ' ');
  };

  const statusColors = {
    PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    PARTIALLY_PAID: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    PARTIAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    UNPAID: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  };

  const filteredBills = bills.filter(b => {
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter ||
      (statusFilter === 'PARTIALLY_PAID' && (b.status === 'PARTIALLY_PAID' || b.status === 'PARTIAL'));
    const matchSearch = !searchTerm || 
      b.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.patientNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id?.toString().includes(searchTerm);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-teal-600 dark:text-teal-400" /> Billing & Revenue Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate hospital invoices, track payments, manage insurance claims, and review financial balances
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus size={16} /> Create Invoice
            </button>
          )}
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Message banner */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center justify-between text-sm ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
            : 'bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
      )}

      {/* Financial Metrics Cards */}
      {reports && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Billed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${reports.totalBilled?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{reports.totalBills} Invoices issued</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Collected</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ${reports.totalCollected?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{reports.paidBillsCount} Fully paid</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outstanding Balance</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                ${reports.totalOutstanding?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{reports.pendingBillsCount} Pending / Partially Paid</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by invoice #, patient name, patient number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setStatusFilter(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === opt.id
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-5 py-3">Invoice #</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Paid</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3">Generated</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <RefreshCw className="animate-spin inline mr-2 text-teal-600" size={18} />
                    Loading billing invoices...
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No billing records found.
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  return (
                    <tr key={bill.id} className="hover:bg-gray-50/75 dark:hover:bg-gray-750/50 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-gray-900 dark:text-white">
                        #{bill.id}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{bill.patientName}</div>
                        <div className="text-xs text-gray-400">{bill.patientNumber}</div>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-gray-900 dark:text-white">
                        ${bill.totalAmount?.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                        ${bill.paidAmount?.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-amber-600 dark:text-amber-400">
                        ${bill.balanceAmount?.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          statusColors[bill.status] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {formatStatus(bill.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {bill.generatedDate ? new Date(bill.generatedDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedBill(bill);
                            setShowInvoiceModal(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors font-medium"
                          title="View Receipt"
                        >
                          <FileText size={13} /> View
                        </button>
                        {canPay && bill.balanceAmount > 0 && (
                          <button
                            onClick={() => {
                              setSelectedBill(bill);
                              setPaymentForm({
                                amount: bill.balanceAmount.toString(),
                                paymentMethod: 'CASH',
                                transactionReference: ''
                              });
                              setShowPaymentModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors font-medium"
                          >
                            <DollarSign size={13} /> Pay
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => {
                              setSelectedBill(bill);
                              setClaimForm({
                                insuranceProvider: '',
                                policyNumber: '',
                                claimAmount: bill.balanceAmount.toString(),
                                remarks: ''
                              });
                              setShowClaimModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors font-medium"
                            title="File Insurance Claim"
                          >
                            <ShieldCheck size={13} /> Insurance
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Bill Modal */}
      <Modal isOpen={showGenerateModal} onClose={() => setShowGenerateModal(false)} title="Generate New Patient Invoice">
        <form onSubmit={handleGenerateBill} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Select Patient *</label>
            <select
              required
              value={billForm.patientId}
              onChange={(e) => setBillForm({ ...billForm, patientId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            >
              <option value="">-- Choose Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.patientNumber})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Total Amount ($) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={billForm.totalAmount}
              onChange={(e) => setBillForm({ ...billForm, totalAmount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-semibold"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Admission / Bed Reference ID (Optional)
            </label>
            <input
              type="number"
              value={billForm.admissionId}
              onChange={(e) => setBillForm({ ...billForm, admissionId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              placeholder="e.g. 101"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Insurance Policy / Pre-Auth Claim ID (Optional)
            </label>
            <input
              type="text"
              value={billForm.insuranceClaimId}
              onChange={(e) => setBillForm({ ...billForm, insuranceClaimId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              placeholder="e.g. INS-99201"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowGenerateModal(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Issue Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title={`Record Payment for Invoice #${selectedBill?.id}`}>
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg flex justify-between items-center text-sm">
            <span className="text-teal-900 dark:text-teal-200">Patient: <strong>{selectedBill?.patientName}</strong></span>
            <span className="text-teal-900 dark:text-teal-200 font-bold">Balance: ${selectedBill?.balanceAmount?.toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Amount to Pay ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={selectedBill?.balanceAmount}
              required
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Payment Method *</label>
            <select
              value={paymentForm.paymentMethod}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            >
              <option value="CASH">Cash</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="UPI">UPI / Digital QR</option>
              <option value="INSURANCE">Insurance Settlement</option>
              <option value="BANK_TRANSFER">Bank Wire Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Transaction / Check / Receipt Reference
            </label>
            <input
              type="text"
              value={paymentForm.transactionReference}
              onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono"
              placeholder="e.g. TXN-88390-UPI"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Process Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* Insurance Claim Modal */}
      <Modal isOpen={showClaimModal} onClose={() => setShowClaimModal(false)} title={`File Insurance Claim: Invoice #${selectedBill?.id}`}>
        <form onSubmit={handleSubmitClaim} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Insurance Company *</label>
            <input
              type="text"
              required
              value={claimForm.insuranceProvider}
              onChange={(e) => setClaimForm({ ...claimForm, insuranceProvider: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              placeholder="e.g. BlueCross, UnitedHealth, Medicare"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Policy / Card ID Number *</label>
            <input
              type="text"
              required
              value={claimForm.policyNumber}
              onChange={(e) => setClaimForm({ ...claimForm, policyNumber: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono"
              placeholder="e.g. POL-9948210"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Claimed Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={claimForm.claimAmount}
              onChange={(e) => setClaimForm({ ...claimForm, claimAmount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Remarks & Diagnoses Codes</label>
            <textarea
              rows={3}
              value={claimForm.remarks}
              onChange={(e) => setClaimForm({ ...claimForm, remarks: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              placeholder="Pre-authorization code, coverage category..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowClaimModal(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Submit Claim
            </button>
          </div>
        </form>
      </Modal>

      {/* View / Print Invoice Modal */}
      <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title={`Invoice Details #${selectedBill?.id}`}>
        {selectedBill && (
          <div className="space-y-6">
            <div className="border-b pb-4 dark:border-gray-700 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Hospital Patient Invoice</h3>
                <p className="text-xs text-gray-500">Invoice Reference: HPMS-INV-{selectedBill.id}</p>
                <p className="text-xs text-gray-500">Date: {new Date(selectedBill.generatedDate).toLocaleString()}</p>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                statusColors[selectedBill.status] || 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300'
              }`}>
                {formatStatus(selectedBill.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-400 block">Billed To:</span>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedBill.patientName}</p>
                <p className="text-xs text-gray-500">Patient ID: {selectedBill.patientNumber}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Insurance Ref:</span>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedBill.insuranceClaimId || 'Direct Patient Billing'}</p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Subtotal & Services</span>
                <span className="font-semibold text-gray-900 dark:text-white">${selectedBill.totalAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Total Amount Paid</span>
                <span>-${selectedBill.paidAmount?.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-base text-gray-900 dark:text-white">
                <span>Remaining Balance Due</span>
                <span className="text-amber-600 dark:text-amber-400">${selectedBill.balanceAmount?.toFixed(2)}</span>
              </div>
            </div>

            {/* Payments List */}
            {selectedBill.payments && selectedBill.payments.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Payment History</h4>
                <div className="border rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Method</th>
                        <th className="p-2">Reference</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {selectedBill.payments.map((p, i) => (
                        <tr key={i}>
                          <td className="p-2">{new Date(p.paymentDate).toLocaleDateString()}</td>
                          <td className="p-2">{p.paymentMethod}</td>
                          <td className="p-2 font-mono text-gray-400">{p.transactionReference || 'N/A'}</td>
                          <td className="p-2 text-right font-semibold">${p.amount?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
