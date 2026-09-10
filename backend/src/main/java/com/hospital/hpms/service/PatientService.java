package com.hospital.hpms.service;

import com.hospital.hpms.dto.PatientDto.*;
import com.hospital.hpms.security.UserPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface PatientService {
    PatientResponse registerPatient(PatientRequest request, Long currentUserId);
    List<PatientResponse> getAllPatients();
    List<PatientResponse> getAllPatients(UserPrincipal principal);
    Page<PatientResponse> getPatientsPaged(Pageable pageable);
    Page<PatientResponse> getPatientsPaged(Pageable pageable, UserPrincipal principal);
    PatientResponse getPatientById(Long id);
    PatientResponse getPatientById(Long id, UserPrincipal principal);
    PatientResponse updatePatient(Long id, PatientRequest request, Long currentUserId);
    void deletePatient(Long id, Long currentUserId);
    List<PatientResponse> searchPatients(String query);
    List<PatientResponse> searchPatients(String query, UserPrincipal principal);
    Map<String, Object> getPatientHistory(Long id);
    Map<String, Object> getPatientHistory(Long id, UserPrincipal principal);
    long getTotalPatientCount();
}
