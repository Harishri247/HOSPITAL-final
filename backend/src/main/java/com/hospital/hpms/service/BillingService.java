package com.hospital.hpms.service;

import com.hospital.hpms.dto.BillingDto.*;
import com.hospital.hpms.security.UserPrincipal;

import java.math.BigDecimal;
import java.util.List;

public interface BillingService {
    BillResponse generateBill(BillGenerateRequest request, Long currentUserId);
    ConsultationBillPreviewResponse calculateConsultationBill(Long appointmentId);
    BillResponse generateConsultationBill(GenerateConsultationBillRequest request, Long currentUserId);
    List<BillResponse> getAllBills();
    List<BillResponse> getAllBills(UserPrincipal principal);
    List<BillResponse> getBillsByPatient(Long patientId);
    List<BillResponse> getBillsByPatient(Long patientId, UserPrincipal principal);
    BillResponse getBillById(Long id);
    BillResponse getBillById(Long id, UserPrincipal principal);
    BillResponse recordPayment(Long billId, PaymentRequest request, Long currentUserId);
    BillResponse submitInsuranceClaim(InsuranceClaimRequest request, Long currentUserId);
    BillingReportResponse getFinancialReport();
    BigDecimal getTotalRevenue();
    BigDecimal getOutstandingBalance();
}
