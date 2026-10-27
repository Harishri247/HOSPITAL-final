package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.AdmissionOrderDto.*;
import com.hospital.hpms.dto.WardBedDto.*;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.AdmissionRequiredException;
import com.hospital.hpms.exception.BedUnavailableException;
import com.hospital.hpms.exception.ResourceNotFoundException;
import com.hospital.hpms.exception.UnauthorizedAccessException;
import com.hospital.hpms.repository.AdmissionOrderRepository;
import com.hospital.hpms.repository.BedRepository;
import com.hospital.hpms.repository.DischargeSummaryRepository;
import com.hospital.hpms.repository.PatientRepository;
import com.hospital.hpms.repository.UserRepository;
import com.hospital.hpms.repository.WardRepository;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.NotificationService;
import com.hospital.hpms.service.WardBedService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WardBedServiceImpl implements WardBedService {

    private final WardRepository wardRepository;
    private final BedRepository bedRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final AdmissionOrderRepository admissionOrderRepository;
    private final DischargeSummaryRepository dischargeSummaryRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public WardResponse createWard(WardRequest request, Long currentUserId) {
        if (request.getTotalBeds() == null || request.getTotalBeds() < 1) {
            throw new IllegalArgumentException("Ward total beds must be at least 1");
        }

        Ward ward = Ward.builder()
                .wardName(request.getWardName().trim())
                .wardType(request.getWardType())
                .totalBeds(request.getTotalBeds())
                .occupiedBeds(0)
                .departmentId(request.getDepartmentId())
                .floorNumber(request.getFloorNumber())
                .nurseInCharge(request.getNurseInCharge() != null ? request.getNurseInCharge().trim() : null)
                .build();

        Ward savedWard = wardRepository.save(ward);

        // Derive standard prefix and bed type from ward
        String prefix = switch (savedWard.getWardType()) {
            case ICU -> "ICU";
            case EMERGENCY -> "EMG";
            case PRIVATE -> "PVT";
            case SEMI_PRIVATE -> "SPV";
            case POST_OPERATIVE -> "POP";
            case GENERAL -> "GEN";
            default -> "BED";
        };

        BedType defaultBedType = switch (savedWard.getWardType()) {
            case ICU -> BedType.ICU;
            case EMERGENCY -> BedType.OXYGEN_SUPPORTED;
            default -> BedType.STANDARD;
        };

        int floor = savedWard.getFloorNumber() != null ? savedWard.getFloorNumber() : 1;

        // Authoritatively create and persist the actual physical Bed records
        java.util.List<Bed> newBeds = new java.util.ArrayList<>();
        for (int i = 1; i <= savedWard.getTotalBeds(); i++) {
            String bedNumber = String.format("%s-%d%02d", prefix, floor, i);
            if (bedRepository.findByWardIdAndBedNumber(savedWard.getId(), bedNumber).isPresent()) {
                bedNumber = String.format("%s-%d%02d-%d", prefix, floor, i, System.currentTimeMillis() % 1000);
            }

            Bed bed = Bed.builder()
                    .wardId(savedWard.getId())
                    .bedNumber(bedNumber)
                    .bedType(defaultBedType)
                    .status(BedStatus.AVAILABLE)
                    .build();
            newBeds.add(bed);
        }

        bedRepository.saveAll(newBeds);

        auditLogService.log(currentUserId, "WARD_CREATED", "Ward", savedWard.getId(), null,
                savedWard.getWardName() + " created with " + newBeds.size() + " physical beds");

        return toWardResponse(savedWard);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WardResponse> getAllWards() {
        return wardRepository.findAll().stream()
                .map(this::toWardResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<WardResponse> getAllWards(UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            return wardRepository.findAll().stream()
                    .map(w -> {
                        int doctorOccupied = bedRepository.findBedsOccupiedByDoctorPatientsInWard(w.getId(), principal.getId()).size();
                        long actualAvailable = bedRepository.countByWardIdAndStatus(w.getId(), BedStatus.AVAILABLE);
                        return WardResponse.builder()
                                .id(w.getId())
                                .wardName(w.getWardName())
                                .wardType(w.getWardType())
                                .totalBeds(w.getTotalBeds())
                                .occupiedBeds(doctorOccupied)
                                .availableBeds((int) actualAvailable)
                                .departmentId(w.getDepartmentId())
                                .floorNumber(w.getFloorNumber())
                                .nurseInCharge(w.getNurseInCharge())
                                .createdAt(w.getCreatedAt())
                                .build();
                    })
                    .collect(Collectors.toList());
        }
        return getAllWards();
    }

    @Override
    @Transactional(readOnly = true)
    public WardResponse getWardById(Long id) {
        Ward ward = wardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ward not found: " + id));
        return toWardResponse(ward);
    }

    @Override
    @Transactional
    public BedResponse createBed(BedRequest request, Long currentUserId) {
        Ward ward = wardRepository.findById(request.getWardId())
                .orElseThrow(() -> new ResourceNotFoundException("Ward not found: " + request.getWardId()));

        Bed bed = Bed.builder()
                .wardId(request.getWardId())
                .bedNumber(request.getBedNumber())
                .bedType(request.getBedType())
                .status(BedStatus.AVAILABLE)
                .build();

        Bed saved = bedRepository.save(bed);
        auditLogService.log(currentUserId, "BED_CREATED", "Bed", saved.getId(), null, saved.getBedNumber());
        return toBedResponse(saved, ward.getWardName(), null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BedResponse> getBedsByWard(Long wardId) {
        Ward ward = wardRepository.findById(wardId)
                .orElseThrow(() -> new ResourceNotFoundException("Ward not found: " + wardId));

        return bedRepository.findByWardId(wardId).stream()
                .map(b -> {
                    Patient p = b.getPatientId() != null ? patientRepository.findById(b.getPatientId()).orElse(null) : null;
                    return toBedResponse(b, ward.getWardName(), p);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BedResponse> getBedsByWard(Long wardId, UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            Ward ward = wardRepository.findById(wardId)
                    .orElseThrow(() -> new ResourceNotFoundException("Ward not found: " + wardId));
            return bedRepository.findBedsOccupiedByDoctorPatientsInWard(wardId, principal.getId()).stream()
                    .map(b -> {
                        Patient p = b.getPatientId() != null ? patientRepository.findById(b.getPatientId()).orElse(null) : null;
                        return toBedResponse(b, ward.getWardName(), p);
                    })
                    .collect(Collectors.toList());
        }
        return getBedsByWard(wardId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BedResponse> getDoctorPatientBeds(Long doctorId) {
        return bedRepository.findBedsOccupiedByDoctorPatients(doctorId).stream()
                .map(b -> {
                    Ward w = wardRepository.findById(b.getWardId()).orElse(null);
                    Patient p = b.getPatientId() != null ? patientRepository.findById(b.getPatientId()).orElse(null) : null;
                    return toBedResponse(b, w != null ? w.getWardName() : "Ward #" + b.getWardId(), p);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BedResponse> getAvailableBeds() {
        return bedRepository.findByStatus(BedStatus.AVAILABLE).stream()
                .map(b -> {
                    Ward ward = wardRepository.findById(b.getWardId()).orElse(null);
                    return toBedResponse(b, ward != null ? ward.getWardName() : "Unknown", null);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BedResponse assignBed(BedAssignRequest request, Long currentUserId) {
        if (request.getBedId() == null) {
            throw new IllegalArgumentException("Bed ID is required");
        }
        if (request.getPatientId() == null) {
            throw new IllegalArgumentException("Patient ID is required");
        }

        // 1. Authoritative Bed check from beds table:
        Bed bed = bedRepository.findById(request.getBedId())
                .orElseThrow(() -> new ResourceNotFoundException("Bed not found with ID: " + request.getBedId()));

        // 2. Never allow a patient to be assigned to an occupied, maintenance, or nonexistent bed:
        if (bed.getStatus() == BedStatus.OCCUPIED || bed.getPatientId() != null) {
            throw new BedUnavailableException("Cannot assign patient: Bed " + bed.getBedNumber() + " is currently OCCUPIED.");
        }
        if (bed.getStatus() == BedStatus.MAINTENANCE) {
            throw new BedUnavailableException("Cannot assign patient: Bed " + bed.getBedNumber() + " is currently under MAINTENANCE.");
        }
        if (bed.getStatus() != BedStatus.AVAILABLE) {
            throw new BedUnavailableException("Cannot assign patient: Bed " + bed.getBedNumber() + " is currently " + bed.getStatus() + " (only AVAILABLE beds can be assigned).");
        }

        // 3. Patient check
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with ID: " + request.getPatientId()));

        // 4. Prevent double-admission of the same patient
        java.util.Optional<Bed> currentPatientBed = bedRepository.findByPatientId(patient.getId());
        if (currentPatientBed.isPresent()) {
            throw new BedUnavailableException("Patient " + patient.getName() + " (" + patient.getPatientNumber() +
                    ") is already admitted to Bed " + currentPatientBed.get().getBedNumber() + ". Please transfer the bed instead.");
        }

        // 4b. ENFORCE DOCTOR ADMISSION ORDER WORKFLOW:
        AdmissionOrder admissionOrder = admissionOrderRepository
                .findFirstByPatientIdAndStatusOrderByOrderDateDesc(patient.getId(), AdmissionOrderStatus.ORDERED)
                .orElseThrow(() -> new AdmissionRequiredException(
                        "Cannot assign bed: An attending physician must create an admission order before bed assignment can proceed for patient " +
                        patient.getName() + " (" + patient.getPatientNumber() + ")."));

        // 5. Ward capacity check against configured totalBeds
        Ward ward = wardRepository.findById(bed.getWardId())
                .orElseThrow(() -> new ResourceNotFoundException("Ward not found with ID: " + bed.getWardId()));

        long currentlyOccupied = bedRepository.countByWardIdAndStatus(ward.getId(), BedStatus.OCCUPIED);
        if (currentlyOccupied >= ward.getTotalBeds()) {
            throw new BedUnavailableException("Ward " + ward.getWardName() + " has reached maximum configured capacity (" + ward.getTotalBeds() + " beds).");
        }

        // Determine nurse to assign
        Long assignedNurseId = request.getNurseId();
        String assignedNurseName = null;
        if (assignedNurseId != null) {
            assignedNurseName = userRepository.findById(assignedNurseId).map(User::getFullName).orElse(null);
        } else if (patient.getAssignedNurseId() != null) {
            assignedNurseId = patient.getAssignedNurseId();
            assignedNurseName = patient.getAssignedNurseName();
        } else if (ward.getNurseInCharge() != null && !ward.getNurseInCharge().isBlank()) {
            assignedNurseName = ward.getNurseInCharge().trim();
            Optional<User> matched = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == RoleType.ROLE_NURSE && u.getFullName().equalsIgnoreCase(ward.getNurseInCharge().trim()))
                    .findFirst();
            if (matched.isPresent()) {
                assignedNurseId = matched.get().getId();
            } else {
                Optional<User> anyNurse = userRepository.findAll().stream()
                        .filter(u -> u.getRole() == RoleType.ROLE_NURSE)
                        .findFirst();
                if (anyNurse.isPresent()) {
                    assignedNurseId = anyNurse.get().getId();
                    assignedNurseName = anyNurse.get().getFullName();
                }
            }
        }

        // 6. Assign physical bed
        bed.setStatus(BedStatus.OCCUPIED);
        bed.setPatientId(patient.getId());
        bed.setAssignmentDate(LocalDateTime.now());
        bed.setAssignedNurseId(assignedNurseId);
        bed.setAssignedNurseName(assignedNurseName);
        Bed saved = bedRepository.save(bed);

        // 7. Synchronize ward.occupiedBeds directly from authoritative beds table
        long updatedOccupied = bedRepository.countByWardIdAndStatus(ward.getId(), BedStatus.OCCUPIED);
        ward.setOccupiedBeds((int) updatedOccupied);
        wardRepository.save(ward);

        patient.setStatus("INPATIENT");
        if (assignedNurseId != null) {
            patient.setAssignedNurseId(assignedNurseId);
            patient.setAssignedNurseName(assignedNurseName);
        }
        patientRepository.save(patient);

        // 8. Fulfill Admission Order
        admissionOrder.setStatus(AdmissionOrderStatus.BED_ASSIGNED);
        admissionOrder.setAssignedBedId(bed.getId());
        admissionOrder.setAssignedWardId(ward.getId());
        admissionOrder.setAssignedBy(currentUserId);
        admissionOrder.setAdmittedDate(LocalDateTime.now());
        admissionOrder.setAssignedNurseId(assignedNurseId);
        admissionOrder.setAssignedNurseName(assignedNurseName);
        admissionOrderRepository.save(admissionOrder);

        auditLogService.log(currentUserId, "BED_ASSIGNED", "Bed", bed.getId(), "AVAILABLE",
                "Patient " + patient.getPatientNumber() + " assigned to Bed " + bed.getBedNumber() + " (Order #" + admissionOrder.getId() + ")");

        // Notify ordering doctor
        if (admissionOrder.getDoctorId() != null) {
            notificationService.sendNotification(
                    admissionOrder.getDoctorId(),
                    "Inpatient Bed Assigned: Patient " + patient.getName() + " (" + patient.getPatientNumber() +
                    ") has been assigned to Bed " + bed.getBedNumber() + " in " + ward.getWardName() + ".",
                    NotificationType.SYSTEM,
                    Priority.HIGH
            );
        }

        // Notify assigned nurse
        if (assignedNurseId != null) {
            notificationService.sendNotification(
                    assignedNurseId,
                    "Inpatient Bed Assigned: Patient " + patient.getName() + " (" + patient.getPatientNumber() +
                    ") has been admitted to Bed " + bed.getBedNumber() + " (" + ward.getWardName() + ") under your care.",
                    NotificationType.SYSTEM,
                    Priority.HIGH
            );
        }

        // Notify patient
        if (patient.getUserId() != null) {
            notificationService.sendNotification(
                    patient.getUserId(),
                    "Admission Update: You have been assigned Bed " + bed.getBedNumber() + " in " + ward.getWardName() +
                    (assignedNurseName != null ? " with Nurse " + assignedNurseName : "") + ".",
                    NotificationType.SYSTEM,
                    Priority.MEDIUM
            );
        }

        return toBedResponse(saved, ward.getWardName(), patient);
    }

    @Override
    @Transactional
    public BedResponse transferBed(BedTransferRequest request, Long currentUserId) {
        if (request.getCurrentBedId() == null || request.getTargetBedId() == null) {
            throw new IllegalArgumentException("Both current and target bed IDs are required");
        }
        if (request.getCurrentBedId().equals(request.getTargetBedId())) {
            throw new IllegalArgumentException("Current bed and target bed cannot be the same");
        }

        Bed currentBed = bedRepository.findById(request.getCurrentBedId())
                .orElseThrow(() -> new ResourceNotFoundException("Current bed not found with ID: " + request.getCurrentBedId()));
        Bed targetBed = bedRepository.findById(request.getTargetBedId())
                .orElseThrow(() -> new ResourceNotFoundException("Target bed not found with ID: " + request.getTargetBedId()));

        if (currentBed.getStatus() != BedStatus.OCCUPIED || currentBed.getPatientId() == null) {
            throw new BedUnavailableException("Current bed " + currentBed.getBedNumber() + " is not occupied");
        }

        if (targetBed.getStatus() == BedStatus.OCCUPIED || targetBed.getPatientId() != null) {
            throw new BedUnavailableException("Target bed " + targetBed.getBedNumber() + " is currently OCCUPIED");
        }
        if (targetBed.getStatus() == BedStatus.MAINTENANCE) {
            throw new BedUnavailableException("Target bed " + targetBed.getBedNumber() + " is currently under MAINTENANCE");
        }
        if (targetBed.getStatus() != BedStatus.AVAILABLE) {
            throw new BedUnavailableException("Target bed " + targetBed.getBedNumber() + " is currently " + targetBed.getStatus() + " (only AVAILABLE beds can be targeted)");
        }

        Long patientId = currentBed.getPatientId();
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with ID: " + patientId));

        // Release current bed
        currentBed.setStatus(BedStatus.AVAILABLE);
        currentBed.setPatientId(null);
        currentBed.setAssignmentDate(null);
        bedRepository.save(currentBed);

        Ward currentWard = wardRepository.findById(currentBed.getWardId()).orElse(null);
        if (currentWard != null) {
            long occ = bedRepository.countByWardIdAndStatus(currentWard.getId(), BedStatus.OCCUPIED);
            currentWard.setOccupiedBeds((int) occ);
            wardRepository.save(currentWard);
        }

        // Occupy target bed
        targetBed.setStatus(BedStatus.OCCUPIED);
        targetBed.setPatientId(patientId);
        targetBed.setAssignmentDate(LocalDateTime.now());
        Bed savedTarget = bedRepository.save(targetBed);

        Ward targetWard = wardRepository.findById(targetBed.getWardId()).orElse(null);
        if (targetWard != null) {
            long occ = bedRepository.countByWardIdAndStatus(targetWard.getId(), BedStatus.OCCUPIED);
            targetWard.setOccupiedBeds((int) occ);
            wardRepository.save(targetWard);
        }

        auditLogService.log(currentUserId, "BED_TRANSFERRED", "Bed", targetBed.getId(),
                "Bed " + currentBed.getBedNumber(), "Bed " + targetBed.getBedNumber());

        return toBedResponse(savedTarget, targetWard != null ? targetWard.getWardName() : "Unknown", patient);
    }

    @Override
    @Transactional
    public BedResponse releaseBed(Long bedId, Long currentUserId) {
        if (bedId == null) {
            throw new IllegalArgumentException("Bed ID is required");
        }

        Bed bed = bedRepository.findById(bedId)
                .orElseThrow(() -> new ResourceNotFoundException("Bed not found with ID: " + bedId));

        Long patientId = bed.getPatientId();
        Patient patient = patientId != null ? patientRepository.findById(patientId).orElse(null) : null;

        // Inpatient clinical discharge governance:
        if (patientId != null) {
            java.util.Optional<AdmissionOrder> activeAdmissionOpt = admissionOrderRepository
                    .findFirstByPatientIdAndStatusOrderByOrderDateDesc(patientId, AdmissionOrderStatus.BED_ASSIGNED);
            if (activeAdmissionOpt.isEmpty()) {
                activeAdmissionOpt = admissionOrderRepository
                        .findFirstByPatientIdAndStatusOrderByOrderDateDesc(patientId, AdmissionOrderStatus.DISCHARGE_ORDERED);
            }

            if (activeAdmissionOpt.isPresent()) {
                AdmissionOrder activeOrder = activeAdmissionOpt.get();
                java.util.Optional<DischargeSummary> summaryOpt = dischargeSummaryRepository.findByAdmissionOrderId(activeOrder.getId());
                if (summaryOpt.isEmpty() || !Boolean.TRUE.equals(summaryOpt.get().getIsSigned())) {
                    throw new IllegalStateException("Cannot release bed: Inpatient discharge requires an attending doctor's signed Discharge Summary.");
                }
                if (!Boolean.TRUE.equals(summaryOpt.get().getBillingCleared())) {
                    throw new IllegalStateException("Cannot release bed: Inpatient discharge requires hospital billing clearance.");
                }

                // If signed and billing cleared, complete discharge
                DischargeSummary summary = summaryOpt.get();
                summary.setStatus(DischargeStatus.DISCHARGED);
                if (summary.getDischargeDate() == null) {
                    summary.setDischargeDate(LocalDateTime.now());
                }
                dischargeSummaryRepository.save(summary);

                activeOrder.setStatus(AdmissionOrderStatus.DISCHARGED);
                admissionOrderRepository.save(activeOrder);
            }
        }

        bed.setStatus(BedStatus.AVAILABLE);
        bed.setPatientId(null);
        bed.setAssignmentDate(null);
        bed.setAssignedNurseId(null);
        bed.setAssignedNurseName(null);
        Bed saved = bedRepository.save(bed);

        Ward ward = wardRepository.findById(bed.getWardId()).orElse(null);
        if (ward != null) {
            long occ = bedRepository.countByWardIdAndStatus(ward.getId(), BedStatus.OCCUPIED);
            ward.setOccupiedBeds((int) occ);
            wardRepository.save(ward);
        }

        if (patient != null) {
            patient.setStatus("OUTPATIENT");
            patient.setAssignedNurseId(null);
            patient.setAssignedNurseName(null);
            patientRepository.save(patient);
        }

        auditLogService.log(currentUserId, "BED_RELEASED", "Bed", bedId, "OCCUPIED", "AVAILABLE");
        return toBedResponse(saved, ward != null ? ward.getWardName() : "Unknown", null);
    }

    @Override
    @Transactional
    public BedResponse updateBedStatus(Long bedId, BedStatus status, Long currentUserId) {
        if (bedId == null) {
            throw new IllegalArgumentException("Bed ID is required");
        }
        if (status == null) {
            throw new IllegalArgumentException("Bed status is required");
        }

        Bed bed = bedRepository.findById(bedId)
                .orElseThrow(() -> new ResourceNotFoundException("Bed not found with ID: " + bedId));

        if (bed.getStatus() == status) {
            Ward ward = wardRepository.findById(bed.getWardId()).orElse(null);
            return toBedResponse(bed, ward != null ? ward.getWardName() : "Unknown", null);
        }

        if (bed.getStatus() == BedStatus.OCCUPIED && status == BedStatus.MAINTENANCE) {
            throw new BedUnavailableException("Cannot place Bed " + bed.getBedNumber() + " under MAINTENANCE while occupied by a patient. Please transfer or release the patient first.");
        }

        BedStatus oldStatus = bed.getStatus();
        bed.setStatus(status);
        if (status == BedStatus.AVAILABLE || status == BedStatus.MAINTENANCE) {
            bed.setPatientId(null);
            bed.setAssignmentDate(null);
        }
        Bed saved = bedRepository.save(bed);

        Ward ward = wardRepository.findById(bed.getWardId()).orElse(null);
        if (ward != null) {
            long occ = bedRepository.countByWardIdAndStatus(ward.getId(), BedStatus.OCCUPIED);
            ward.setOccupiedBeds((int) occ);
            wardRepository.save(ward);
        }

        auditLogService.log(currentUserId, "BED_STATUS_CHANGED", "Bed", bed.getId(), oldStatus.name(), status.name());
        return toBedResponse(saved, ward != null ? ward.getWardName() : "Unknown", null);
    }

    @Override
    @Transactional(readOnly = true)
    public long getTotalBeds() {
        return bedRepository.count();
    }

    @Override
    @Transactional(readOnly = true)
    public long getOccupiedBeds() {
        return bedRepository.countByStatus(BedStatus.OCCUPIED);
    }

    @Override
    @Transactional(readOnly = true)
    public double getBedOccupancyRate() {
        long total = getTotalBeds();
        if (total == 0) return 0.0;
        return ((double) getOccupiedBeds() / total) * 100.0;
    }

    // ==========================================
    // Inpatient Admission Orders Workflow Implementation
    // ==========================================

    @Override
    @Transactional
    public AdmissionOrderResponse createAdmissionOrder(AdmissionOrderRequest request, UserPrincipal principal) {
        if (request.getPatientId() == null) {
            throw new IllegalArgumentException("Patient ID is required");
        }
        if (request.getDiagnosis() == null || request.getDiagnosis().trim().isEmpty()) {
            throw new IllegalArgumentException("Clinical diagnosis or reason for admission is required");
        }

        Long doctorId = (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR)
                ? principal.getId()
                : (request.getDoctorId() != null ? request.getDoctorId() : (principal != null ? principal.getId() : null));

        if (doctorId == null) {
            throw new IllegalArgumentException("Ordering doctor ID is required");
        }

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with ID: " + request.getPatientId()));

        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with ID: " + doctorId));

        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            boolean isAssigned = patientRepository.isPatientAssignedToDoctor(request.getPatientId(), principal.getId());
            if (!isAssigned) {
                // If patient is not yet linked, admitting patient initiates care relationship under this doctor
            }
        }

        // Check if patient is already an inpatient
        if ("INPATIENT".equalsIgnoreCase(patient.getStatus()) || bedRepository.findByPatientId(patient.getId()).isPresent()) {
            throw new BedUnavailableException("Patient " + patient.getName() + " is already admitted as an inpatient.");
        }

        // Check if patient already has a pending admission order
        admissionOrderRepository.findFirstByPatientIdAndStatusOrderByOrderDateDesc(patient.getId(), AdmissionOrderStatus.ORDERED)
                .ifPresent(existing -> {
                    throw new BedUnavailableException("Patient " + patient.getName() + " already has an active pending admission order (Order #" + existing.getId() + ").");
                });

        AdmissionOrder order = AdmissionOrder.builder()
                .patientId(patient.getId())
                .doctorId(doctorId)
                .diagnosis(request.getDiagnosis().trim())
                .recommendedWardType(request.getRecommendedWardType())
                .priority(request.getPriority() != null ? request.getPriority() : Priority.MEDIUM)
                .status(AdmissionOrderStatus.ORDERED)
                .notes(request.getNotes() != null ? request.getNotes().trim() : null)
                .orderDate(LocalDateTime.now())
                .build();

        AdmissionOrder saved = admissionOrderRepository.save(order);
        auditLogService.log(doctorId, "ADMISSION_ORDER_CREATED", "AdmissionOrder", saved.getId(), null,
                "Admission ordered for " + patient.getName() + " (" + patient.getPatientNumber() + ") - Diagnosis: " + saved.getDiagnosis());

        return toAdmissionOrderResponse(saved, patient, doctor, null, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdmissionOrderResponse> getPendingAdmissionOrders(UserPrincipal principal) {
        List<AdmissionOrder> orders;
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            orders = admissionOrderRepository.findByStatusAndDoctorOrDoctorPatients(AdmissionOrderStatus.ORDERED, principal.getId());
        } else {
            orders = admissionOrderRepository.findByStatusOrderByOrderDateDesc(AdmissionOrderStatus.ORDERED);
        }
        return orders.stream().map(this::mapToAdmissionOrderResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdmissionOrderResponse> getAllAdmissionOrders(String status, Long doctorId, UserPrincipal principal) {
        Long targetDoctorId = doctorId;
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            targetDoctorId = principal.getId();
        }

        AdmissionOrderStatus orderStatus = null;
        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            try {
                orderStatus = AdmissionOrderStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        List<AdmissionOrder> orders;
        if (targetDoctorId != null) {
            if (orderStatus != null) {
                orders = admissionOrderRepository.findByStatusAndDoctorOrDoctorPatients(orderStatus, targetDoctorId);
            } else {
                orders = admissionOrderRepository.findByDoctorOrDoctorPatients(targetDoctorId);
            }
        } else {
            if (orderStatus != null) {
                orders = admissionOrderRepository.findByStatusOrderByOrderDateDesc(orderStatus);
            } else {
                orders = admissionOrderRepository.findAllByOrderByOrderDateDesc();
            }
        }
        return orders.stream().map(this::mapToAdmissionOrderResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdmissionOrderResponse> getAdmissionOrdersByPatient(Long patientId, UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            boolean isAssigned = patientRepository.isPatientAssignedToDoctor(patientId, principal.getId());
            if (!isAssigned) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to view admission orders for your assigned patients.");
            }
        }
        return admissionOrderRepository.findByPatientIdOrderByOrderDateDesc(patientId).stream()
                .map(this::mapToAdmissionOrderResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AdmissionOrderResponse cancelAdmissionOrder(Long orderId, UserPrincipal principal) {
        AdmissionOrder order = admissionOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Admission order not found with ID: " + orderId));

        if (order.getStatus() != AdmissionOrderStatus.ORDERED) {
            throw new IllegalStateException("Cannot cancel admission order with status: " + order.getStatus());
        }

        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            if (!order.getDoctorId().equals(principal.getId())) {
                throw new UnauthorizedAccessException("You can only cancel admission orders created by yourself.");
            }
        }

        order.setStatus(AdmissionOrderStatus.CANCELLED);
        AdmissionOrder saved = admissionOrderRepository.save(order);
        auditLogService.log(principal != null ? principal.getId() : null, "ADMISSION_ORDER_CANCELLED",
                "AdmissionOrder", orderId, "ORDERED", "CANCELLED");

        return mapToAdmissionOrderResponse(saved);
    }

    private AdmissionOrderResponse mapToAdmissionOrderResponse(AdmissionOrder o) {
        Patient p = patientRepository.findById(o.getPatientId()).orElse(null);
        User doc = userRepository.findById(o.getDoctorId()).orElse(null);
        Bed b = o.getAssignedBedId() != null ? bedRepository.findById(o.getAssignedBedId()).orElse(null) : null;
        Ward w = o.getAssignedWardId() != null ? wardRepository.findById(o.getAssignedWardId()).orElse(null) : null;
        User assigned = o.getAssignedBy() != null ? userRepository.findById(o.getAssignedBy()).orElse(null) : null;
        return toAdmissionOrderResponse(o, p, doc, b, w, assigned);
    }

    private AdmissionOrderResponse toAdmissionOrderResponse(AdmissionOrder order, Patient patient, User doctor, Bed bed, Ward ward, User assignedBy) {
        return AdmissionOrderResponse.builder()
                .id(order.getId())
                .patientId(order.getPatientId())
                .patientName(patient != null ? patient.getName() : "Unknown")
                .patientNumber(patient != null ? patient.getPatientNumber() : "N/A")
                .doctorId(order.getDoctorId())
                .doctorName(doctor != null ? doctor.getFullName() : "Unknown")
                .doctorStaffId(doctor != null ? doctor.getStaffId() : null)
                .diagnosis(order.getDiagnosis())
                .recommendedWardType(order.getRecommendedWardType())
                .priority(order.getPriority())
                .status(order.getStatus())
                .notes(order.getNotes())
                .assignedBedId(order.getAssignedBedId())
                .assignedBedNumber(bed != null ? bed.getBedNumber() : null)
                .assignedWardId(order.getAssignedWardId())
                .assignedWardName(ward != null ? ward.getWardName() : null)
                .assignedBy(order.getAssignedBy())
                .assignedByName(assignedBy != null ? assignedBy.getFullName() : null)
                .orderDate(order.getOrderDate())
                .admittedDate(order.getAdmittedDate())
                .build();
    }

    private WardResponse toWardResponse(Ward w) {
        long actualOccupied = bedRepository.countByWardIdAndStatus(w.getId(), BedStatus.OCCUPIED);
        long actualAvailable = bedRepository.countByWardIdAndStatus(w.getId(), BedStatus.AVAILABLE);
        return WardResponse.builder()
                .id(w.getId())
                .wardName(w.getWardName())
                .wardType(w.getWardType())
                .totalBeds(w.getTotalBeds())
                .occupiedBeds((int) actualOccupied)
                .availableBeds((int) actualAvailable)
                .departmentId(w.getDepartmentId())
                .floorNumber(w.getFloorNumber())
                .nurseInCharge(w.getNurseInCharge())
                .createdAt(w.getCreatedAt())
                .build();
    }

    private BedResponse toBedResponse(Bed b, String wardName, Patient p) {
        return BedResponse.builder()
                .id(b.getId())
                .wardId(b.getWardId())
                .wardName(wardName)
                .bedNumber(b.getBedNumber())
                .bedType(b.getBedType())
                .status(b.getStatus())
                .patientId(b.getPatientId())
                .patientName(p != null ? p.getName() : null)
                .patientNumber(p != null ? p.getPatientNumber() : null)
                .assignmentDate(b.getAssignmentDate())
                .assignedNurseId(b.getAssignedNurseId())
                .assignedNurseName(b.getAssignedNurseName())
                .build();
    }
}
