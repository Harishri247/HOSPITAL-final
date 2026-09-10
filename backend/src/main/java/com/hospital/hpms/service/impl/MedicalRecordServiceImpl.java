package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.MedicalRecordDto.*;
import com.hospital.hpms.entity.MedicalRecord;
import com.hospital.hpms.entity.Patient;
import com.hospital.hpms.entity.User;
import com.hospital.hpms.exception.ResourceNotFoundException;
import com.hospital.hpms.repository.MedicalRecordRepository;
import com.hospital.hpms.repository.PatientRepository;
import com.hospital.hpms.repository.UserRepository;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.MedicalRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MedicalRecordServiceImpl implements MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public MedicalRecordResponse createRecord(MedicalRecordRequest request, Long currentUserId) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + request.getPatientId()));
        User doctor = userRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + request.getDoctorId()));

        MedicalRecord record = MedicalRecord.builder()
                .patientId(request.getPatientId())
                .doctorId(request.getDoctorId())
                .visitDate(request.getVisitDate() != null ? request.getVisitDate() : LocalDate.now())
                .chiefComplaint(request.getChiefComplaint())
                .diagnosis(request.getDiagnosis())
                .icdCode(request.getIcdCode())
                .treatment(request.getTreatment())
                .prescriptionId(request.getPrescriptionId())
                .notes(request.getNotes())
                .build();

        MedicalRecord saved = medicalRecordRepository.save(record);
        auditLogService.log(currentUserId, "MEDICAL_RECORD_CREATED", "MedicalRecord", saved.getId(), null, saved.getDiagnosis());

        return toResponse(saved, patient, doctor);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getRecordsByPatient(Long patientId, Long currentUserId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        auditLogService.log(currentUserId, "MEDICAL_RECORD_VIEW", "Patient", patientId, null, "Viewed medical history");

        return medicalRecordRepository.findByPatientIdOrderByVisitDateDesc(patientId).stream()
                .map(r -> {
                    User doctor = userRepository.findById(r.getDoctorId()).orElse(null);
                    return toResponse(r, patient, doctor);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public MedicalRecordResponse getRecordById(Long id, Long currentUserId) {
        MedicalRecord record = medicalRecordRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found: " + id));

        Patient patient = patientRepository.findById(record.getPatientId()).orElse(null);
        User doctor = userRepository.findById(record.getDoctorId()).orElse(null);

        auditLogService.log(currentUserId, "MEDICAL_RECORD_VIEW", "MedicalRecord", id, null, "Viewed record detail");
        return toResponse(record, patient, doctor);
    }

    @Override
    @Transactional
    public MedicalRecordResponse updateRecord(Long id, MedicalRecordRequest request, Long currentUserId) {
        MedicalRecord record = medicalRecordRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found: " + id));

        String oldDiagnosis = record.getDiagnosis();
        record.setChiefComplaint(request.getChiefComplaint());
        record.setDiagnosis(request.getDiagnosis());
        record.setIcdCode(request.getIcdCode());
        record.setTreatment(request.getTreatment());
        if (request.getPrescriptionId() != null) record.setPrescriptionId(request.getPrescriptionId());
        record.setNotes(request.getNotes());

        MedicalRecord updated = medicalRecordRepository.save(record);
        auditLogService.log(currentUserId, "MEDICAL_RECORD_MODIFIED", "MedicalRecord", id, oldDiagnosis, updated.getDiagnosis());

        Patient patient = patientRepository.findById(updated.getPatientId()).orElse(null);
        User doctor = userRepository.findById(updated.getDoctorId()).orElse(null);
        return toResponse(updated, patient, doctor);
    }

    private MedicalRecordResponse toResponse(MedicalRecord r, Patient patient, User doctor) {
        return MedicalRecordResponse.builder()
                .id(r.getId())
                .patientId(r.getPatientId())
                .patientName(patient != null ? patient.getName() : "Unknown")
                .patientNumber(patient != null ? patient.getPatientNumber() : "N/A")
                .doctorId(r.getDoctorId())
                .doctorName(doctor != null ? doctor.getFullName() : "Unknown")
                .visitDate(r.getVisitDate())
                .chiefComplaint(r.getChiefComplaint())
                .diagnosis(r.getDiagnosis())
                .icdCode(r.getIcdCode())
                .treatment(r.getTreatment())
                .prescriptionId(r.getPrescriptionId())
                .notes(r.getNotes())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
