package com.hospital.hpms.service;

import com.hospital.hpms.dto.PrescriptionDto.*;

import java.util.List;

public interface PrescriptionService {
    PrescriptionResponse createPrescription(PrescriptionRequest request, Long currentUserId);
    List<PrescriptionResponse> getPrescriptionsByPatient(Long patientId, Long currentUserId);
    List<PrescriptionResponse> getPendingPrescriptions();
    PrescriptionResponse dispensePrescription(Long prescriptionId, DispenseRequest request, Long pharmacistUserId);
    long getPendingPrescriptionsCount();
}
