import React, { useState, useEffect } from 'react';
import { 
  CreditCard, CheckCircle2, Calculator, Receipt, 
  Pill, Stethoscope, AlertCircle, Printer, RefreshCw, X, ShieldCheck
} from 'lucide-react';
import Modal from './Modal';
import { billingApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';

export const CalculateBillModal = ({ isOpen, onClose, appointment, onBillGenerated }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Editable bill state
  const [consultationFee, setConsultationFee] = useState(500);
  const [items, setItems] = useState([]);
  const [insuranceClaimId, setInsuranceClaimId] = useState('');
  const [generatedBill, setGeneratedBill] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // In-person payment at reception desk
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && appointment?.id) {
      loadPreview(appointment.id);
    } else {
      resetState();
    }
  }, [isOpen, appointment?.id]);

  const resetState = () => {
    setLoading(true);
    setPreview(null);
    setError('');
    setSuccessMessage('');
    setItems([]);
    setConsultationFee(500);
    setInsuranceClaimId('');
    setGeneratedBill(null);
    setShowPaymentSection(false);
    setPaymentSuccess(false);
  };

  const loadPreview = async (appointmentId) => {
    setLoading(true);
    setError('');
    try {
      const res = await billingApi.getConsultationPreview(appointmentId);
      const data = res.data;
      setPreview(data);
      setConsultationFee(data.consultationFee ?? 500);
      setItems(data.items || []);

      if (data.isBilled && data.existingBillId) {
        // Load the existing bill details
        const billRes = await billingApi.getById(data.existingBillId);
        setGeneratedBill(billRes.data);
      }
    } catch (err) {
      console.error('Failed to load consultation billing preview:', err);
      setError(err.response?.data?.message || 'Failed to retrieve consultation details for billing.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate prescription subtotal
  const prescriptionSubtotal = items
    .filter(it => it.category === 'PRESCRIPTION')
    .reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);

  // Calculate grand total
  const grandTotal = (parseFloat(consultationFee) || 0) + prescriptionSubtotal;

  const handleItemPriceChange = (index, newPrice) => {
    const updated = [...items];
    const unitPrice = parseFloat(newPrice) || 0;
    updated[index].unitPrice = unitPrice;
    updated[index].amount = unitPrice * (updated[index].quantity || 1);
    setItems(updated);
  };

  const handleItemQuantityChange = (index, newQty) => {
    const updated = [...items];
    const qty = parseInt(newQty, 10) || 1;
    updated[index].quantity = qty;
    updated[index].amount = (updated[index].unitPrice || 0) * qty;
    setItems(updated);
  };

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const formattedBreakdown = JSON.stringify({
        consultationFee: parseFloat(consultationFee),
        prescriptionFee: prescriptionSubtotal,
        items: items
      });

      const payload = {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        consultationFee: parseFloat(consultationFee),
        prescriptionFee: prescriptionSubtotal,
        totalAmount: grandTotal,
        itemsBreakdown: formattedBreakdown,
        insuranceClaimId: insuranceClaimId.trim() || null
      };

      const res = await billingApi.generateConsultationBill(payload);
      setGeneratedBill(res.data);
      setSuccessMessage(`Invoice #${res.data.id} of ₹${res.data.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })} successfully generated and issued to patient!`);
      if (onBillGenerated) {
        onBillGenerated(res.data);
      }
    } catch (err) {
      console.error('Error generating bill:', err);
      setError(err.response?.data?.message || 'Failed to generate consultation invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCollectInPersonPayment = async (e) => {
    e.preventDefault();
    if (!generatedBill?.id) return;
    setProcessingPayment(true);
    setError('');
    try {
      await billingApi.recordPayment(generatedBill.id, {
        amount: generatedBill.balanceAmount || grandTotal,
        paymentMethod: paymentMethod,
        transactionReference: paymentRef.trim() || `COUNTER-${Date.now().toString().slice(-6)}`,
        receivedBy: user?.fullName || user?.username || 'Reception Desk'
      });
      setPaymentSuccess(true);
      setSuccessMessage(`Payment of ₹${generatedBill.balanceAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })} recorded successfully! Receipt marked as PAID.`);
      // Reload bill
      const updated = await billingApi.getById(generatedBill.id);
      setGeneratedBill(updated.data);
      if (onBillGenerated) {
        onBillGenerated(updated.data);
      }
    } catch (err) {
      console.error('Failed to record counter payment:', err);
      setError(err.response?.data?.message || 'Failed to process payment.');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Calculate Consultation & Pharmacy Bill"
      maxWidth="max-w-2xl"
    >
      {loading ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-sm font-semibold">Retrieving consultation record & pharmacy prescriptions...</p>
        </div>
      ) : error && !preview ? (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-5 text-xs">
          {/* Patient & Doctor Visit Header Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Outpatient Consultation
              </span>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{preview?.patientName || appointment?.patientName}</span>
                <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">
                  ({preview?.patientNumber || appointment?.patientNumber})
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Doctor: <strong>{(preview?.doctorName || appointment?.doctorName)?.toLowerCase().startsWith('dr') ? (preview?.doctorName || appointment?.doctorName) : `Dr. ${preview?.doctorName || appointment?.doctorName}`}</strong> &bull; Visit Date: {preview?.appointmentDate || appointment?.appointmentDate} ({preview?.timeSlot || appointment?.timeSlot})
              </p>
              {preview?.diagnosis && (
                <p className="text-blue-600 dark:text-sky-400 font-medium text-[11px] mt-0.5">
                  Diagnosis: {preview.diagnosis}
                </p>
              )}
            </div>

            {generatedBill && (
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  generatedBill.status === 'PAID'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-sky-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }`}>
                  Invoice #{generatedBill.id} &bull; {generatedBill.status}
                </span>
              </div>
            )}
          </div>

          {/* Success Notification Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 flex items-start gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600 dark:text-sky-400" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Bill Calculation Itemized Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <span className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" /> Itemized Bill Breakdown
              </span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                Auto-calculated from consultation & pharmacy
              </span>
            </div>

            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Service / Medicine Item</th>
                  <th className="px-3 py-2.5 text-center">Qty / Units</th>
                  <th className="px-3 py-2.5 text-right">Unit Price (₹)</th>
                  <th className="px-4 py-2.5 text-right">Subtotal (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {/* 1. Doctor Consultation Fee Row */}
                <tr className="bg-sky-50/40 dark:bg-blue-950/20">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                      Doctor Consultation Fee
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Standard OPD examination & medical assessment by {(preview?.doctorName || appointment?.doctorName)?.toLowerCase().startsWith('dr') ? (preview?.doctorName || appointment?.doctorName) : `Dr. ${preview?.doctorName || appointment?.doctorName}`}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-300 font-medium">
                    1 visit
                  </td>
                  <td className="px-3 py-3 text-right">
                    {!generatedBill ? (
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    ) : (
                      <span className="font-semibold">₹{consultationFee?.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100">
                    ₹{(parseFloat(consultationFee) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>

                {/* 2. Prescribed Medications Rows */}
                {items
                  .filter(it => it.category === 'PRESCRIPTION')
                  .map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-sky-600" />
                          {item.description}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Prescription from clinical consultation
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {!generatedBill ? (
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemQuantityChange(idx + 1, e.target.value)}
                            className="w-14 px-1.5 py-1 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        ) : (
                          <span className="font-medium text-slate-700 dark:text-slate-300">{item.quantity} units</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {!generatedBill ? (
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.unitPrice}
                            onChange={(e) => handleItemPriceChange(idx + 1, e.target.value)}
                            className="w-20 px-2 py-1 text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300">₹{item.unitPrice?.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                        ₹{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}

                {items.filter(it => it.category === 'PRESCRIPTION').length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-center text-slate-400 italic text-[11px]">
                      No medications prescribed during this consultation.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Total Calculation Footer */}
              <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-400">
                    Doctor Consultation:
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">
                    ₹{(parseFloat(consultationFee) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-400">
                    Pharmacy Prescriptions Subtotal:
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">
                    ₹{prescriptionSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr className="border-t border-slate-200 dark:border-slate-700 bg-sky-500/10 text-sm">
                  <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                    Grand Total Calculated (₹):
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700 dark:text-sky-300 text-base">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Optional Insurance Claim Number */}
          {!generatedBill && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Insurance Pre-Authorization / Claim ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., INS-MED-99231 (leave blank for self-pay direct patient billing)"
                value={insuranceClaimId}
                onChange={(e) => setInsuranceClaimId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          )}

          {/* If invoice not yet generated: Show Generate / Issue Button */}
          {!generatedBill ? (
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium text-xs transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleGenerateBill}
                disabled={submitting || grandTotal <= 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 text-xs transition transform active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating Invoice...
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4" /> Issue Bill to Patient (₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Invoice is generated: Show In-person payment collection & Print Receipt */
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {generatedBill.status !== 'PAID' && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      Collect In-Person Payment at Reception Counter
                    </div>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                      Due: ₹{generatedBill.balanceAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <form onSubmit={handleCollectInPersonPayment} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Payment Method
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none"
                        >
                          <option value="CASH">💵 Cash at Desk</option>
                          <option value="UPI">📱 UPI / QR Scan</option>
                          <option value="DEBIT_CARD">💳 Debit Card POS</option>
                          <option value="CREDIT_CARD">💳 Credit Card POS</option>
                          <option value="BANK_TRANSFER">🏦 Net Banking Transfer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Reference / Receipt # (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. CASH-REC-01 or UPI-Ref-9923"
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={processingPayment}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition disabled:opacity-50"
                      >
                        {processingPayment ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing Payment...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Record Counter Payment & Mark Paid
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-semibold text-xs transition"
                >
                  <Printer className="w-4 h-4" /> Print Invoice Receipt
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default CalculateBillModal;
