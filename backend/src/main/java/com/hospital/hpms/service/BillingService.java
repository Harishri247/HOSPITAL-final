package com.hospital.hpms.service;

import com.hospital.hpms.dto.BillingDto.*;

import java.math.BigDecimal;
import java.util.List;

public interface BillingService {
    BillResponse generateBill(BillGenerateRequest request, Long currentUserId);
    List<BillResponse> getAllBills();
    List<BillResponse> getBillsByPatient(Long patientId);
    BillResponse getBillById(Long id);
    BillResponse recordPayment(Long billId, PaymentRequest request, Long currentUserId);
    BillResponse submitInsuranceClaim(InsuranceClaimRequest request, Long currentUserId);
    BillingReportResponse getFinancialReport();
    BigDecimal getTotalRevenue();
    BigDecimal getOutstandingBalance();
}
