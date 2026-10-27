package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.PrescriptionDto.*;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.InvalidOperationException;
import com.hospital.hpms.exception.ResourceNotFoundException;
import com.hospital.hpms.exception.UnauthorizedAccessException;
import com.hospital.hpms.repository.BedRepository;
import com.hospital.hpms.repository.ControlledSubstanceLogRepository;
import com.hospital.hpms.repository.MedicineRepository;
import com.hospital.hpms.repository.PatientRepository;
import com.hospital.hpms.repository.PrescriptionRepository;
import com.hospital.hpms.repository.UserRepository;
import com.hospital.hpms.repository.WardRepository;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.NotificationService;
import com.hospital.hpms.service.PrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PrescriptionServiceImpl implements PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final MedicineRepository medicineRepository;
    private final ControlledSubstanceLogRepository controlledSubstanceLogRepository;
    private final BedRepository bedRepository;
    private final WardRepository wardRepository;

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
    @Transactional
    public PrescriptionResponse createPrescription(PrescriptionRequest request, UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            request.setDoctorId(principal.getId());
        }
        return createPrescription(request, principal != null ? principal.getId() : null);
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
    public List<PrescriptionResponse> getPrescriptionsByPatient(Long patientId, UserPrincipal principal) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatient(principal);
            if (myPatient == null || !myPatient.getId().equals(patientId)) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to access your own prescriptions.");
            }
        }

        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            boolean isAssigned = patientRepository.isPatientAssignedToDoctor(patientId, principal.getId());
            if (!isAssigned) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to access prescriptions for your assigned patients.");
            }
        }

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
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPendingPrescriptions(Long doctorId, UserPrincipal principal) {
        Long targetDoctorId = doctorId;
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            targetDoctorId = principal.getId();
        }

        List<Prescription> list;
        if (targetDoctorId != null) {
            list = prescriptionRepository.findByDispensingStatusAndDoctorOrDoctorPatients(DispensingStatus.PENDING, targetDoctorId);
        } else {
            list = prescriptionRepository.findByDispensingStatusOrderByPrescriptionDateDesc(DispensingStatus.PENDING);
        }

        return list.stream()
                .map(p -> {
                    Patient patient = patientRepository.findById(p.getPatientId()).orElse(null);
                    User doc = userRepository.findById(p.getDoctorId()).orElse(null);
                    return toResponse(p, patient, doc, null);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPrescriptions(Long doctorId, String status, UserPrincipal principal) {
        Long targetDoctorId = doctorId;
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            targetDoctorId = principal.getId();
        } else if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient patient = resolvePatient(principal);
            if (patient != null) {
                return getPrescriptionsByPatient(patient.getId(), principal);
            }
            return java.util.Collections.emptyList();
        }

        DispensingStatus dispensingStatus = null;
        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            try {
                dispensingStatus = DispensingStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        List<Prescription> list;
        if (targetDoctorId != null) {
            if (dispensingStatus != null) {
                list = prescriptionRepository.findByDispensingStatusAndDoctorOrDoctorPatients(dispensingStatus, targetDoctorId);
            } else {
                list = prescriptionRepository.findByDoctorOrDoctorPatients(targetDoctorId);
            }
        } else {
            if (dispensingStatus != null) {
                list = prescriptionRepository.findByDispensingStatusOrderByPrescriptionDateDesc(dispensingStatus);
            } else {
                list = prescriptionRepository.findAllByOrderByPrescriptionDateDesc();
            }
        }

        return list.stream()
                .map(p -> {
                    Patient patient = patientRepository.findById(p.getPatientId()).orElse(null);
                    User doc = userRepository.findById(p.getDoctorId()).orElse(null);
                    User pharm = p.getDispensedBy() != null ? userRepository.findById(p.getDispensedBy()).orElse(null) : null;
                    return toResponse(p, patient, doc, pharm);
                })
                .collect(Collectors.toList());
    }

    private Medicine findMatchingMedicine(Long medicineId, String medicationName) {
        if (medicineId != null) {
            Optional<Medicine> m = medicineRepository.findById(medicineId);
            if (m.isPresent()) return m.get();
        }
        if (medicationName != null && !medicationName.trim().isEmpty()) {
            String trimmed = medicationName.trim();
            // 1. exact match
            Optional<Medicine> exact = medicineRepository.findByName(trimmed);
            if (exact.isPresent()) return exact.get();

            // 2. search query match
            List<Medicine> results = medicineRepository.searchMedicines(trimmed);
            if (!results.isEmpty()) return results.get(0);

            // 3. first token (e.g. "Amoxicillin" from "Amoxicillin 500mg")
            String firstWord = trimmed.split(" ")[0];
            if (firstWord.length() > 2) {
                List<Medicine> tokenMatches = medicineRepository.searchMedicines(firstWord);
                if (!tokenMatches.isEmpty()) return tokenMatches.get(0);
            }
        }
        return null;
    }

    private int calculateSuggestedQuantity(String duration, String frequency) {
        int days = 5;
        if (duration != null) {
            String d = duration.toLowerCase();
            if (d.contains("3 day")) days = 3;
            else if (d.contains("5 day")) days = 5;
            else if (d.contains("7 day") || d.contains("1 week")) days = 7;
            else if (d.contains("10 day")) days = 10;
            else if (d.contains("14 day") || d.contains("2 week")) days = 14;
            else if (d.contains("30 day") || d.contains("1 month")) days = 30;
            else if (d.contains("60 day") || d.contains("2 month")) days = 60;
            else {
                try {
                    String num = d.replaceAll("[^0-9]", "");
                    if (!num.isEmpty()) days = Integer.parseInt(num);
                } catch (Exception ignored) {}
            }
        }

        int perDay = 1;
        if (frequency != null) {
            String f = frequency.toUpperCase();
            if (f.contains("BD") || f.contains("TWICE") || f.contains("BID")) perDay = 2;
            else if (f.contains("TDS") || f.contains("THRICE") || f.contains("TID") || f.contains("3 TIMES")) perDay = 3;
            else if (f.contains("QDS") || f.contains("QID") || f.contains("4 TIMES")) perDay = 4;
            else if (f.contains("PRN") || f.contains("AS NEEDED")) perDay = 1;
        }

        return Math.max(1, days * perDay);
    }

    @Override
    @Transactional(readOnly = true)
    public PrescriptionSafetyCheckResponse checkPrescriptionSafety(Long prescriptionId, UserPrincipal principal) {
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found: " + prescriptionId));

        Patient patient = patientRepository.findById(prescription.getPatientId()).orElse(null);
        User doctor = userRepository.findById(prescription.getDoctorId()).orElse(null);

        Medicine matched = findMatchingMedicine(prescription.getMedicineId(), prescription.getMedicationName());
        int suggestedQty = calculateSuggestedQuantity(prescription.getDuration(), prescription.getFrequency());
        InpatientContext inCtx = resolveInpatientContext(patient);

        List<String> alerts = new ArrayList<>();
        String stockStatus = "NOT_IN_CATALOG";
        Integer stock = null;
        Integer minThresh = null;
        String batch = null;
        LocalDate expiry = null;
        boolean isControlled = false;

        if (matched != null) {
            stock = matched.getStockQuantity();
            minThresh = matched.getMinThreshold();
            batch = matched.getBatchNumber();
            expiry = matched.getExpiryDate();
            isControlled = matched.isControlled();

            if (stock <= 0) {
                stockStatus = "OUT_OF_STOCK";
                alerts.add("CRITICAL INVENTORY ALERT: '" + matched.getName() + "' is OUT OF STOCK (0 units available). Restocking required before dispensing.");
            } else if (stock <= minThresh) {
                stockStatus = "LOW_STOCK";
                alerts.add("LOW STOCK WARNING: Current pharmacy stock has only " + stock + " units (threshold: " + minThresh + ").");
            } else {
                stockStatus = "IN_STOCK";
            }

            if (stock != null && stock > 0 && stock < suggestedQty) {
                alerts.add("QUANTITY SHORTAGE: Available stock (" + stock + ") is less than the calculated full regimen course (" + suggestedQty + " units). Partial dispensing or stock replenishment required.");
            }

            if (isControlled) {
                alerts.add("SCHEDULED CONTROLLED SUBSTANCE: Under hospital pharmacy regulation FR8, dispensing this medicine strictly requires supervisor authorization / sign-off PIN.");
            }

            if (expiry != null) {
                if (expiry.isBefore(LocalDate.now())) {
                    alerts.add("EXPIRED MEDICATION: Lot batch " + batch + " expired on " + expiry + ". DO NOT DISPENSE.");
                } else if (expiry.isBefore(LocalDate.now().plusDays(30))) {
                    alerts.add("EXPIRATION NOTICE: Lot batch " + batch + " expires within 30 days (" + expiry + "). Ensure patient completes regimen before expiry.");
                }
            }
        } else {
            alerts.add("CATALOG NOTICE: Prescribed medication '" + prescription.getMedicationName() + "' was not found by exact name in current pharmacy inventory. Please verify formulation.");
        }

        return PrescriptionSafetyCheckResponse.builder()
                .prescriptionId(prescription.getId())
                .medicationName(prescription.getMedicationName())
                .dosage(prescription.getDosage())
                .frequency(prescription.getFrequency())
                .duration(prescription.getDuration())
                .route(prescription.getRoute())
                .patientId(patient != null ? patient.getId() : prescription.getPatientId())
                .patientName(patient != null ? patient.getName() : "Unknown")
                .patientNumber(patient != null ? patient.getPatientNumber() : "N/A")
                .doctorName(doctor != null ? doctor.getFullName() : "Unknown")
                .matchedMedicineId(matched != null ? matched.getId() : null)
                .matchedMedicineName(matched != null ? matched.getName() : null)
                .genericName(matched != null ? matched.getGenericName() : null)
                .category(matched != null ? matched.getCategory() : null)
                .stockQuantity(stock)
                .minThreshold(minThresh)
                .stockStatus(stockStatus)
                .batchNumber(batch)
                .expiryDate(expiry)
                .isControlled(isControlled)
                .suggestedQuantity(suggestedQty)
                .safetyAlerts(alerts)
                .patientStatus(inCtx.patientStatus)
                .isAdmitted(inCtx.isAdmitted)
                .bedNumber(inCtx.bedNumber)
                .wardName(inCtx.wardName)
                .assignedNurseId(inCtx.assignedNurseId)
                .assignedNurseName(inCtx.assignedNurseName)
                .build();
    }

    @Override
    @Transactional
    public PrescriptionResponse dispensePrescription(Long prescriptionId, DispenseRequest request, Long pharmacistUserId) {
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found: " + prescriptionId));

        Patient patient = patientRepository.findById(prescription.getPatientId()).orElse(null);
        User doctor = userRepository.findById(prescription.getDoctorId()).orElse(null);
        User pharmacist = pharmacistUserId != null ? userRepository.findById(pharmacistUserId).orElse(null) : null;
        String pharmacistName = pharmacist != null ? pharmacist.getFullName() : "Staff Pharmacist";

        Medicine matched = findMatchingMedicine(request.getMedicineId(), prescription.getMedicationName());
        int qty = (request.getQuantity() != null && request.getQuantity() > 0) 
                ? request.getQuantity() 
                : calculateSuggestedQuantity(prescription.getDuration(), prescription.getFrequency());

        String batch = request.getBatchNumber();
        if (batch == null || batch.trim().isEmpty()) {
            batch = matched != null && matched.getBatchNumber() != null ? matched.getBatchNumber() : "BATCH-GEN";
        }

        if (matched != null) {
            // Check stock availability
            if (matched.getStockQuantity() < qty) {
                throw new InvalidOperationException("Insufficient pharmacy inventory for " + matched.getName() + 
                        ". Available stock: " + matched.getStockQuantity() + " units, requested: " + qty + " units.");
            }

            // Controlled substance compliance verification (FR8)
            if (matched.isControlled()) {
                if (request.getSupervisorSignoff() == null || request.getSupervisorSignoff().trim().isEmpty()) {
                    throw new InvalidOperationException("Controlled Substance Regulation Error: A supervisor authorization / sign-off PIN is strictly mandatory before dispensing " + matched.getName());
                }

                // Record into ControlledSubstanceLog
                ControlledSubstanceLog log = ControlledSubstanceLog.builder()
                        .medicineId(matched.getId())
                        .medicineName(matched.getName())
                        .quantity(qty)
                        .batchNumber(batch)
                        .patientReference(patient != null ? patient.getName() + " (" + patient.getPatientNumber() + ")" : "Patient #" + prescription.getPatientId())
                        .pharmacistUserId(pharmacistUserId)
                        .pharmacistName(pharmacistName)
                        .supervisorSignoff(request.getSupervisorSignoff().trim())
                        .notes(request.getNotes() != null ? request.getNotes() : "Dispensed via Clinical Prescription #" + prescriptionId)
                        .build();

                controlledSubstanceLogRepository.save(log);

                auditLogService.log(pharmacistUserId, "CONTROLLED_PRESCRIPTION_DISPENSED", "Prescription", prescriptionId,
                        "Stock: " + matched.getStockQuantity(),
                        "Dispensed: " + qty + " | Auth PIN: " + request.getSupervisorSignoff().trim());
            }

            // Deduct stock from pharmacy inventory
            int oldStock = matched.getStockQuantity();
            matched.setStockQuantity(oldStock - qty);
            medicineRepository.save(matched);

            auditLogService.log(pharmacistUserId, "MEDICINE_STOCK_DEDUCTED", "Medicine", matched.getId(),
                    "Stock: " + oldStock, "New Stock: " + (oldStock - qty) + " (Prescription #" + prescriptionId + ")");

            prescription.setMedicineId(matched.getId());
        }

        prescription.setQuantityDispensed(qty);
        prescription.setBatchNumber(batch);
        prescription.setPharmacistNotes(request.getNotes());
        prescription.setDispensingStatus(request.getStatus() != null ? request.getStatus() : DispensingStatus.DISPENSED);
        prescription.setDispensedBy(pharmacistUserId);
        prescription.setDispensedDate(LocalDateTime.now());

        Prescription updated = prescriptionRepository.save(prescription);
        auditLogService.log(pharmacistUserId, "PRESCRIPTION_DISPENSED", "Prescription", prescriptionId,
                DispensingStatus.PENDING.name(), updated.getDispensingStatus().name());

        // Notify patient
        if (patient != null && patient.getUserId() != null) {
            notificationService.sendNotification(patient.getUserId(),
                    "Your prescription for " + updated.getMedicationName() + " (" + qty + " units) has been dispensed by the hospital pharmacy.",
                    NotificationType.PRESCRIPTION, Priority.HIGH);
        }

        // If inpatient with receptionist-assigned nurse, immediately notify nurse that medication is dispensed and ready for bedside dose
        InpatientContext inCtx = resolveInpatientContext(patient);
        if (inCtx.assignedNurseId != null) {
            String location = inCtx.bedNumber != null ? "Bed " + inCtx.bedNumber + (inCtx.wardName != null ? " (" + inCtx.wardName + ")" : "") : "Ward";
            String nurseAlert = String.format("💊 Inpatient Medication Dispensed: %s (%d units) for patient %s (%s). Medication ready for bedside administration.",
                    updated.getMedicationName(), qty, patient != null ? patient.getName() : "Inpatient", location);
            notificationService.sendNotification(inCtx.assignedNurseId, nurseAlert, NotificationType.PRESCRIPTION, Priority.HIGH);
        }

        return toResponse(updated, patient, doctor, pharmacist);
    }

    @Override
    @Transactional(readOnly = true)
    public long getPendingPrescriptionsCount() {
        return prescriptionRepository.countByDispensingStatus(DispensingStatus.PENDING);
    }

    @Override
    @Transactional(readOnly = true)
    public long getPendingPrescriptionsCount(UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            return prescriptionRepository.findByDispensingStatusAndDoctorOrDoctorPatients(DispensingStatus.PENDING, principal.getId()).size();
        }
        return getPendingPrescriptionsCount();
    }

    private PrescriptionResponse toResponse(Prescription p, Patient patient, User doc, User pharm) {
        Medicine med = p.getMedicineId() != null ? medicineRepository.findById(p.getMedicineId()).orElse(null) : null;
        if (med == null && p.getMedicationName() != null) {
            med = findMatchingMedicine(null, p.getMedicationName());
        }

        InpatientContext inCtx = resolveInpatientContext(patient);

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
                .medicineId(p.getMedicineId() != null ? p.getMedicineId() : (med != null ? med.getId() : null))
                .quantityDispensed(p.getQuantityDispensed())
                .batchNumber(p.getBatchNumber())
                .pharmacistNotes(p.getPharmacistNotes())
                .isControlled(med != null ? med.isControlled() : false)
                .stockAvailable(med != null ? med.getStockQuantity() : null)
                .patientStatus(inCtx.patientStatus)
                .isAdmitted(inCtx.isAdmitted)
                .bedNumber(inCtx.bedNumber)
                .wardName(inCtx.wardName)
                .assignedNurseId(inCtx.assignedNurseId)
                .assignedNurseName(inCtx.assignedNurseName)
                .build();
    }

    private static class InpatientContext {
        boolean isAdmitted;
        String patientStatus = "OUTPATIENT";
        String bedNumber;
        String wardName;
        Long assignedNurseId;
        String assignedNurseName;
    }

    private InpatientContext resolveInpatientContext(Patient patient) {
        InpatientContext ctx = new InpatientContext();
        if (patient == null) return ctx;

        ctx.patientStatus = patient.getStatus() != null ? patient.getStatus() : "OUTPATIENT";
        Bed bed = bedRepository.findByPatientId(patient.getId()).orElse(null);
        if (bed != null) {
            ctx.isAdmitted = true;
            ctx.patientStatus = "INPATIENT";
            ctx.bedNumber = bed.getBedNumber();
            if (bed.getWardId() != null) {
                ctx.wardName = wardRepository.findById(bed.getWardId()).map(Ward::getWardName).orElse(null);
            }
            ctx.assignedNurseId = bed.getAssignedNurseId() != null ? bed.getAssignedNurseId() : patient.getAssignedNurseId();
            ctx.assignedNurseName = bed.getAssignedNurseName() != null ? bed.getAssignedNurseName() : patient.getAssignedNurseName();
        } else if ("INPATIENT".equalsIgnoreCase(patient.getStatus()) || patient.getAssignedNurseId() != null) {
            ctx.isAdmitted = "INPATIENT".equalsIgnoreCase(patient.getStatus());
            ctx.assignedNurseId = patient.getAssignedNurseId();
            ctx.assignedNurseName = patient.getAssignedNurseName();
        }
        return ctx;
    }

    private Patient resolvePatient(UserPrincipal principal) {
        if (principal == null) return null;
        Patient p = patientRepository.findByUserId(principal.getId()).orElse(null);
        if (p != null) return p;
        User u = userRepository.findById(principal.getId()).orElse(null);
        if (u != null && u.getPhoneNumber() != null && !u.getPhoneNumber().isBlank()) {
            p = patientRepository.findByPhoneNumber(u.getPhoneNumber().trim()).orElse(null);
            if (p != null) {
                if (p.getUserId() == null) {
                    p.setUserId(principal.getId());
                    patientRepository.save(p);
                }
                return p;
            }
        }
        if (principal.getFullName() != null && !principal.getFullName().isBlank()) {
            List<Patient> list = patientRepository.searchPatientsList(principal.getFullName().trim());
            if (list.size() == 1) {
                p = list.get(0);
                if (p.getUserId() == null) {
                    p.setUserId(principal.getId());
                    patientRepository.save(p);
                }
                return p;
            }
        }

        if (principal.getRole() == RoleType.ROLE_PATIENT) {
            User userObj = userRepository.findById(principal.getId()).orElse(null);
            if (userObj != null) {
                String patNum = "PAT-" + String.format("%04d", (int)(Math.random() * 9000) + 1000);
                Patient newPat = Patient.builder()
                        .userId(userObj.getId())
                        .patientNumber(patNum)
                        .name(userObj.getFullName() != null && !userObj.getFullName().isBlank() ? userObj.getFullName() : userObj.getUsername())
                        .phoneNumber(userObj.getPhoneNumber() != null && !userObj.getPhoneNumber().isBlank() ? userObj.getPhoneNumber() : "N/A")
                        .gender("Other")
                        .bloodGroup("O+")
                        .status("ACTIVE")
                        .build();
                return patientRepository.save(newPat);
            }
        }
        return null;
    }
}

