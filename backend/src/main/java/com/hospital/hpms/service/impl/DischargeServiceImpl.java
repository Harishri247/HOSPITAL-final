package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.DischargeDto.*;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.ResourceNotFoundException;
import com.hospital.hpms.repository.*;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.DischargeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DischargeServiceImpl implements DischargeService {

    private final DischargeSummaryRepository dischargeSummaryRepository;
    private final AdmissionOrderRepository admissionOrderRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final BedRepository bedRepository;
    private final WardRepository wardRepository;
    private final BillRepository billRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public DischargeSummaryResponse saveOrUpdateDraft(DischargeSummaryRequest request, Long currentUserId) {
        Long admissionOrderId = request.getAdmissionOrderId();
        Long patientId = request.getPatientId();

        AdmissionOrder admissionOrder = null;
        if (admissionOrderId != null && admissionOrderId > 0) {
            admissionOrder = admissionOrderRepository.findById(admissionOrderId).orElse(null);
        }

        if (admissionOrder == null && patientId != null) {
            admissionOrder = admissionOrderRepository
                    .findFirstByPatientIdAndStatusOrderByOrderDateDesc(patientId, AdmissionOrderStatus.BED_ASSIGNED)
                    .orElse(null);
            if (admissionOrder == null) {
                admissionOrder = admissionOrderRepository
                        .findFirstByPatientIdAndStatusOrderByOrderDateDesc(patientId, AdmissionOrderStatus.DISCHARGE_ORDERED)
                        .orElse(null);
            }
        }

        // If patient is currently occupying a bed but has no formal admission order record, synthesize one
        if (admissionOrder == null && patientId != null) {
            Bed bed = bedRepository.findByPatientId(patientId).orElse(null);
            if (bed != null) {
                admissionOrder = AdmissionOrder.builder()
                        .patientId(patientId)
                        .doctorId(currentUserId != null ? currentUserId : 2L)
                        .diagnosis(request.getAdmissionDiagnosis() != null && !request.getAdmissionDiagnosis().isBlank()
                                ? request.getAdmissionDiagnosis() : "Inpatient Clinical Care")
                        .priority(Priority.MEDIUM)
                        .status(AdmissionOrderStatus.BED_ASSIGNED)
                        .assignedBedId(bed.getId())
                        .assignedWardId(bed.getWardId())
                        .assignedBy(currentUserId)
                        .orderDate(bed.getAssignmentDate() != null ? bed.getAssignmentDate() : LocalDateTime.now())
                        .admittedDate(bed.getAssignmentDate() != null ? bed.getAssignmentDate() : LocalDateTime.now())
                        .notes("Inpatient bed assignment")
                        .build();
                admissionOrder = admissionOrderRepository.save(admissionOrder);
            }
        }

        if (admissionOrder == null) {
            throw new IllegalArgumentException("No active admission order or occupied bed found for this patient.");
        }

        DischargeSummary summary = dischargeSummaryRepository.findByAdmissionOrderId(admissionOrder.getId())
                .orElse(null);

        if (summary != null && Boolean.TRUE.equals(summary.getIsSigned())) {
            throw new IllegalStateException("Cannot modify discharge summary once digitally signed by attending doctor.");
        }

        if (summary == null) {
            summary = DischargeSummary.builder()
                    .admissionOrderId(admissionOrder.getId())
                    .patientId(admissionOrder.getPatientId())
                    .doctorId(currentUserId != null ? currentUserId : admissionOrder.getDoctorId())
                    .wardId(admissionOrder.getAssignedWardId())
                    .bedId(admissionOrder.getAssignedBedId())
                    .admissionDate(admissionOrder.getAdmittedDate() != null ? admissionOrder.getAdmittedDate() : admissionOrder.getOrderDate())
                    .admissionDiagnosis(admissionOrder.getDiagnosis())
                    .status(DischargeStatus.DRAFT)
                    .isSigned(false)
                    .billingCleared(false)
                    .build();
        }

        if (request.getAdmissionDiagnosis() != null && !request.getAdmissionDiagnosis().isBlank()) {
            summary.setAdmissionDiagnosis(request.getAdmissionDiagnosis());
        }
        summary.setFinalDiagnosis(request.getFinalDiagnosis());
        summary.setIcdCode(request.getIcdCode());
        summary.setHospitalCourse(request.getHospitalCourse());
        summary.setConditionAtDischarge(request.getConditionAtDischarge() != null ? request.getConditionAtDischarge() : "STABLE");
        summary.setDischargeMedications(request.getDischargeMedications());
        summary.setDischargeInstructions(request.getDischargeInstructions());
        summary.setFollowUpDate(request.getFollowUpDate());
        summary.setFollowUpInstructions(request.getFollowUpInstructions());

        if (summary.getDoctorId() == null && currentUserId != null) {
            summary.setDoctorId(currentUserId);
        }

        DischargeSummary saved = dischargeSummaryRepository.save(summary);

        // Transition admission order to DISCHARGE_ORDERED if it was BED_ASSIGNED
        if (admissionOrder.getStatus() == AdmissionOrderStatus.BED_ASSIGNED) {
            admissionOrder.setStatus(AdmissionOrderStatus.DISCHARGE_ORDERED);
            admissionOrderRepository.save(admissionOrder);
        }

        auditLogService.log(currentUserId, "DISCHARGE_SUMMARY_DRAFTED", "DischargeSummary", saved.getId(), null, saved.getStatus().name());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public DischargeSummaryResponse signDischargeSummary(Long summaryId, DischargeSignRequest request, Long currentUserId) {
        DischargeSummary summary = dischargeSummaryRepository.findById(summaryId)
                .orElseThrow(() -> new ResourceNotFoundException("Discharge summary not found with ID: " + summaryId));

        if (Boolean.TRUE.equals(summary.getIsSigned())) {
            throw new IllegalStateException("Discharge summary has already been digitally signed.");
        }

        if (request.getDoctorSignature() == null || request.getDoctorSignature().trim().isEmpty()) {
            throw new IllegalArgumentException("Attending doctor signature is required to sign the clinical document.");
        }

        if (request.getFinalDiagnosis() != null) summary.setFinalDiagnosis(request.getFinalDiagnosis());
        if (request.getIcdCode() != null) summary.setIcdCode(request.getIcdCode());
        if (request.getHospitalCourse() != null) summary.setHospitalCourse(request.getHospitalCourse());
        if (request.getConditionAtDischarge() != null) summary.setConditionAtDischarge(request.getConditionAtDischarge());
        if (request.getDischargeMedications() != null) summary.setDischargeMedications(request.getDischargeMedications());
        if (request.getDischargeInstructions() != null) summary.setDischargeInstructions(request.getDischargeInstructions());
        if (request.getFollowUpDate() != null) summary.setFollowUpDate(request.getFollowUpDate());
        if (request.getFollowUpInstructions() != null) summary.setFollowUpInstructions(request.getFollowUpInstructions());

        LocalDateTime now = LocalDateTime.now();
        summary.setDoctorSignature(request.getDoctorSignature().trim());
        summary.setSignedAt(now);
        summary.setIsSigned(true);
        summary.setStatus(DischargeStatus.SIGNED);

        // Generate SHA-256 digital verification stamp hash
        String stampData = String.format("DOC-DS-%d-PAT-%d-%s-%s", 
                summary.getId(), summary.getPatientId(), request.getDoctorSignature(), now.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        summary.setSignatureHash(generateHash(stampData));

        DischargeSummary saved = dischargeSummaryRepository.save(summary);

        auditLogService.log(currentUserId, "DOCTOR_DISCHARGE_SIGNED", "DischargeSummary", saved.getId(), "DRAFT", "SIGNED");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public DischargeSummaryResponse clearBilling(Long summaryId, BillingClearanceRequest request, Long currentUserId) {
        DischargeSummary summary = dischargeSummaryRepository.findById(summaryId)
                .orElseThrow(() -> new ResourceNotFoundException("Discharge summary not found with ID: " + summaryId));

        if (!Boolean.TRUE.equals(summary.getIsSigned())) {
            throw new IllegalStateException("Discharge summary must be digitally signed by attending doctor before billing clearance.");
        }

        if (request != null && request.getBillId() != null) {
            Bill bill = billRepository.findById(request.getBillId()).orElse(null);
            if (bill != null) {
                summary.setBillId(bill.getId());
            }
        }

        summary.setBillingCleared(true);
        summary.setBillingClearedAt(LocalDateTime.now());
        summary.setBillingClearedBy(currentUserId);
        summary.setStatus(DischargeStatus.BILLING_CLEARED);

        DischargeSummary saved = dischargeSummaryRepository.save(summary);
        auditLogService.log(currentUserId, "DISCHARGE_BILLING_CLEARED", "DischargeSummary", saved.getId(), "SIGNED", "BILLING_CLEARED");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public DischargeSummaryResponse completeDischarge(Long summaryId, Long currentUserId) {
        DischargeSummary summary = dischargeSummaryRepository.findById(summaryId)
                .orElseThrow(() -> new ResourceNotFoundException("Discharge summary not found with ID: " + summaryId));

        if (!Boolean.TRUE.equals(summary.getIsSigned())) {
            throw new IllegalStateException("Cannot discharge patient: Discharge summary is not signed by attending doctor.");
        }

        if (!Boolean.TRUE.equals(summary.getBillingCleared())) {
            throw new IllegalStateException("Cannot discharge patient: Hospital billing clearance has not been completed.");
        }

        LocalDateTime now = LocalDateTime.now();
        summary.setStatus(DischargeStatus.DISCHARGED);
        summary.setDischargeDate(now);
        DischargeSummary saved = dischargeSummaryRepository.save(summary);

        // Update AdmissionOrder(s) to DISCHARGED
        AdmissionOrder admissionOrder = admissionOrderRepository.findById(summary.getAdmissionOrderId()).orElse(null);
        if (admissionOrder != null) {
            admissionOrder.setStatus(AdmissionOrderStatus.DISCHARGED);
            admissionOrderRepository.save(admissionOrder);
        }
        if (summary.getPatientId() != null) {
            List<AdmissionOrder> allOrders = admissionOrderRepository.findByPatientIdOrderByOrderDateDesc(summary.getPatientId());
            if (allOrders != null) {
                for (AdmissionOrder o : allOrders) {
                    if (o.getStatus() != AdmissionOrderStatus.DISCHARGED && o.getStatus() != AdmissionOrderStatus.CANCELLED) {
                        o.setStatus(AdmissionOrderStatus.DISCHARGED);
                        admissionOrderRepository.save(o);
                    }
                }
            }
        }

        // Release bed if assigned in summary or admission order
        Long bedId = summary.getBedId() != null ? summary.getBedId() : (admissionOrder != null ? admissionOrder.getAssignedBedId() : null);
        if (bedId != null) {
            Bed bed = bedRepository.findById(bedId).orElse(null);
            if (bed != null) {
                bed.setStatus(BedStatus.AVAILABLE);
                bed.setPatientId(null);
                bed.setAssignmentDate(null);
                bed.setAssignedNurseId(null);
                bed.setAssignedNurseName(null);
                bedRepository.save(bed);

                if (bed.getWardId() != null) {
                    wardRepository.findById(bed.getWardId()).ifPresent(ward -> {
                        long occ = bedRepository.countByWardIdAndStatus(ward.getId(), BedStatus.OCCUPIED);
                        ward.setOccupiedBeds((int) occ);
                        wardRepository.save(ward);
                    });
                }
            }
        }

        // Also sweep and release any other beds currently occupied by this patient
        if (summary.getPatientId() != null) {
            List<Bed> occupiedPatientBeds = bedRepository.findByStatus(BedStatus.OCCUPIED).stream()
                    .filter(b -> b.getPatientId() != null && b.getPatientId().equals(summary.getPatientId()))
                    .collect(Collectors.toList());
            for (Bed b : occupiedPatientBeds) {
                b.setStatus(BedStatus.AVAILABLE);
                b.setPatientId(null);
                b.setAssignmentDate(null);
                b.setAssignedNurseId(null);
                b.setAssignedNurseName(null);
                bedRepository.save(b);
                if (b.getWardId() != null) {
                    wardRepository.findById(b.getWardId()).ifPresent(ward -> {
                        long occ = bedRepository.countByWardIdAndStatus(ward.getId(), BedStatus.OCCUPIED);
                        ward.setOccupiedBeds((int) occ);
                        wardRepository.save(ward);
                    });
                }
            }
        }

        // Reset Patient to OUTPATIENT and clear assigned nurse
        Patient patient = summary.getPatientId() != null ? patientRepository.findById(summary.getPatientId()).orElse(null) : null;
        if (patient != null) {
            patient.setStatus("OUTPATIENT");
            patient.setAssignedNurseId(null);
            patient.setAssignedNurseName(null);
            patientRepository.save(patient);
        }

        auditLogService.log(currentUserId, "PATIENT_DISCHARGED", "DischargeSummary", saved.getId(), "BILLING_CLEARED", "DISCHARGED");
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public DischargeSummaryResponse getById(Long summaryId) {
        DischargeSummary summary = dischargeSummaryRepository.findById(summaryId)
                .orElseThrow(() -> new ResourceNotFoundException("Discharge summary not found with ID: " + summaryId));
        return toResponse(summary);
    }

    @Override
    @Transactional(readOnly = true)
    public DischargeSummaryResponse getByAdmissionOrderId(Long admissionOrderId) {
        DischargeSummary summary = dischargeSummaryRepository.findByAdmissionOrderId(admissionOrderId)
                .orElse(null);
        return summary != null ? toResponse(summary) : null;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DischargeSummaryResponse> getByPatientId(Long patientId) {
        return dischargeSummaryRepository.findByPatientIdOrderByCreatedAtDesc(patientId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DischargeSummaryResponse> getAllDischarges() {
        return dischargeSummaryRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private DischargeSummaryResponse toResponse(DischargeSummary summary) {
        Patient patient = patientRepository.findById(summary.getPatientId()).orElse(null);
        User doctor = summary.getDoctorId() != null ? userRepository.findById(summary.getDoctorId()).orElse(null) : null;
        Ward ward = summary.getWardId() != null ? wardRepository.findById(summary.getWardId()).orElse(null) : null;
        Bed bed = summary.getBedId() != null ? bedRepository.findById(summary.getBedId()).orElse(null) : null;

        return DischargeSummaryResponse.builder()
                .id(summary.getId())
                .admissionOrderId(summary.getAdmissionOrderId())
                .patientId(summary.getPatientId())
                .patientName(patient != null ? patient.getName() : "Unknown Patient")
                .patientMrn(patient != null ? patient.getPatientNumber() : null)
                .doctorId(summary.getDoctorId())
                .doctorName(doctor != null ? doctor.getFullName() : (summary.getDoctorSignature() != null ? summary.getDoctorSignature() : "Attending Physician"))
                .wardId(summary.getWardId())
                .wardName(ward != null ? ward.getWardName() : null)
                .bedId(summary.getBedId())
                .bedNumber(bed != null ? bed.getBedNumber() : null)
                .admissionDate(summary.getAdmissionDate())
                .dischargeDate(summary.getDischargeDate())
                .admissionDiagnosis(summary.getAdmissionDiagnosis())
                .finalDiagnosis(summary.getFinalDiagnosis())
                .icdCode(summary.getIcdCode())
                .hospitalCourse(summary.getHospitalCourse())
                .conditionAtDischarge(summary.getConditionAtDischarge())
                .dischargeMedications(summary.getDischargeMedications())
                .dischargeInstructions(summary.getDischargeInstructions())
                .followUpDate(summary.getFollowUpDate())
                .followUpInstructions(summary.getFollowUpInstructions())
                .doctorSignature(summary.getDoctorSignature())
                .signatureHash(summary.getSignatureHash())
                .signedAt(summary.getSignedAt())
                .isSigned(summary.getIsSigned())
                .billingCleared(summary.getBillingCleared())
                .billingClearedAt(summary.getBillingClearedAt())
                .billingClearedBy(summary.getBillingClearedBy())
                .billId(summary.getBillId())
                .status(summary.getStatus())
                .createdAt(summary.getCreatedAt())
                .updatedAt(summary.getUpdatedAt())
                .build();
    }

    private String generateHash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return "DIGI-CERT-" + HexFormat.of().formatHex(hash).substring(0, 16).toUpperCase();
        } catch (Exception e) {
            return "DIGI-CERT-" + Long.toHexString(System.currentTimeMillis()).toUpperCase();
        }
    }
}
