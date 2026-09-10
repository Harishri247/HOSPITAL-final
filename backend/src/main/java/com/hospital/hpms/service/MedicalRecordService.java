package com.hospital.hpms.service;

import com.hospital.hpms.dto.MedicalRecordDto.*;

import java.util.List;

public interface MedicalRecordService {
    MedicalRecordResponse createRecord(MedicalRecordRequest request, Long currentUserId);
    List<MedicalRecordResponse> getRecordsByPatient(Long patientId, Long currentUserId);
    MedicalRecordResponse getRecordById(Long id, Long currentUserId);
    MedicalRecordResponse updateRecord(Long id, MedicalRecordRequest request, Long currentUserId);
}
