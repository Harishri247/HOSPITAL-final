package com.hospital.hpms.service;

import com.hospital.hpms.dto.DischargeDto.*;

import java.util.List;

public interface DischargeService {
    DischargeSummaryResponse saveOrUpdateDraft(DischargeSummaryRequest request, Long currentUserId);
    DischargeSummaryResponse signDischargeSummary(Long summaryId, DischargeSignRequest request, Long currentUserId);
    DischargeSummaryResponse clearBilling(Long summaryId, BillingClearanceRequest request, Long currentUserId);
    DischargeSummaryResponse completeDischarge(Long summaryId, Long currentUserId);
    DischargeSummaryResponse getById(Long summaryId);
    DischargeSummaryResponse getByAdmissionOrderId(Long admissionOrderId);
    List<DischargeSummaryResponse> getByPatientId(Long patientId);
    List<DischargeSummaryResponse> getAllDischarges();
}
