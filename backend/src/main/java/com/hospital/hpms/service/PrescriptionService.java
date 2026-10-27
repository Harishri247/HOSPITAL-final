package com.hospital.hpms.service;

import com.hospital.hpms.dto.PrescriptionDto.*;
import com.hospital.hpms.security.UserPrincipal;

import java.util.List;

public interface PrescriptionService {
    PrescriptionResponse createPrescription(PrescriptionRequest request, Long currentUserId);
    PrescriptionResponse createPrescription(PrescriptionRequest request, UserPrincipal principal);
    List<PrescriptionResponse> getPrescriptionsByPatient(Long patientId, Long currentUserId);
    List<PrescriptionResponse> getPrescriptionsByPatient(Long patientId, UserPrincipal principal);
    List<PrescriptionResponse> getPendingPrescriptions();
    List<PrescriptionResponse> getPendingPrescriptions(Long doctorId, UserPrincipal principal);
    List<PrescriptionResponse> getPrescriptions(Long doctorId, String status, UserPrincipal principal);
    PrescriptionResponse dispensePrescription(Long prescriptionId, DispenseRequest request, Long pharmacistUserId);
    PrescriptionSafetyCheckResponse checkPrescriptionSafety(Long prescriptionId, UserPrincipal principal);
    long getPendingPrescriptionsCount();
    long getPendingPrescriptionsCount(UserPrincipal principal);
}

