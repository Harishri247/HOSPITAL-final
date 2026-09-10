package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.PrescriptionDto.*;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.ResourceNotFoundException;
import com.hospital.hpms.repository.PatientRepository;
import com.hospital.hpms.repository.PrescriptionRepository;
import com.hospital.hpms.repository.UserRepository;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.NotificationService;
import com.hospital.hpms.service.PrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PrescriptionServiceImpl implements PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public PrescriptionResponse createPrescription(PrescriptionRequest request, Long currentUserId) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + request.getPatientId()));
        User doctor = userRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + request.getDoctorId()));

        Prescription prescription = Prescription.builder()
                .patientId(request.getPatientId())
                .doctorId(request.getDoctorId())
                .medicalRecordId(request.getMedicalRecordId())
                .medicationName(request.getMedicationName())
                .dosage(request.getDosage())
                .frequency(request.getFrequency())
                .duration(request.getDuration())
                .route(request.getRoute())
                .dispensingStatus(DispensingStatus.PENDING)
                .prescriptionDate(LocalDate.now())
                .build();

        Prescription saved = prescriptionRepository.save(prescription);
        auditLogService.log(currentUserId, "PRESCRIPTION_CREATED", "Prescription", saved.getId(), null, saved.getMedicationName());

        // Notify patient if patient has a user account
        if (patient.getUserId() != null) {
            notificationService.sendNotification(patient.getUserId(),
                    "New prescription issued: " + saved.getMedicationName() + " (" + saved.getDosage() + ")",
                    NotificationType.PRESCRIPTION, Priority.MEDIUM);
        }

        return toResponse(saved, patient, doctor, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPrescriptionsByPatient(Long patientId, Long currentUserId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        return prescriptionRepository.findByPatientIdOrderByPrescriptionDateDesc(patientId).stream()
                .map(p -> {
                    User doc = userRepository.findById(p.getDoctorId()).orElse(null);
                    User pharm = p.getDispensedBy() != null ? userRepository.findById(p.getDispensedBy()).orElse(null) : null;
                    return toResponse(p, patient, doc, pharm);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPendingPrescriptions() {
        return prescriptionRepository.findByDispensingStatus(DispensingStatus.PENDING).stream()
                .map(p -> {
                    Patient patient = patientRepository.findById(p.getPatientId()).orElse(null);
                    User doc = userRepository.findById(p.getDoctorId()).orElse(null);
                    return toResponse(p, patient, doc, null);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PrescriptionResponse dispensePrescription(Long prescriptionId, DispenseRequest request, Long pharmacistUserId) {
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found: " + prescriptionId));

        prescription.setDispensingStatus(request.getStatus());
        prescription.setDispensedBy(pharmacistUserId);
        prescription.setDispensedDate(LocalDateTime.now());

        Prescription updated = prescriptionRepository.save(prescription);
        auditLogService.log(pharmacistUserId, "PRESCRIPTION_DISPENSED", "Prescription", prescriptionId,
                DispensingStatus.PENDING.name(), request.getStatus().name());

        Patient patient = patientRepository.findById(updated.getPatientId()).orElse(null);
        User doctor = userRepository.findById(updated.getDoctorId()).orElse(null);
        User pharmacist = userRepository.findById(pharmacistUserId).orElse(null);

        // Notify patient
        if (patient != null && patient.getUserId() != null) {
            notificationService.sendNotification(patient.getUserId(),
                    "Prescription for " + updated.getMedicationName() + " has been " + request.getStatus().name().toLowerCase() + " by the pharmacy.",
                    NotificationType.PRESCRIPTION, Priority.HIGH);
        }

        return toResponse(updated, patient, doctor, pharmacist);
    }

    @Override
    @Transactional(readOnly = true)
    public long getPendingPrescriptionsCount() {
        return prescriptionRepository.countByDispensingStatus(DispensingStatus.PENDING);
    }

    private PrescriptionResponse toResponse(Prescription p, Patient patient, User doc, User pharm) {
        return PrescriptionResponse.builder()
                .id(p.getId())
                .patientId(p.getPatientId())
                .patientName(patient != null ? patient.getName() : "Unknown")
                .patientNumber(patient != null ? patient.getPatientNumber() : "N/A")
                .doctorId(p.getDoctorId())
                .doctorName(doc != null ? doc.getFullName() : "Unknown")
                .medicalRecordId(p.getMedicalRecordId())
                .medicationName(p.getMedicationName())
                .dosage(p.getDosage())
                .frequency(p.getFrequency())
                .duration(p.getDuration())
                .route(p.getRoute())
                .dispensingStatus(p.getDispensingStatus())
                .prescriptionDate(p.getPrescriptionDate())
                .dispensedBy(p.getDispensedBy())
                .dispensedByName(pharm != null ? pharm.getFullName() : null)
                .dispensedDate(p.getDispensedDate())
                .build();
    }
}
