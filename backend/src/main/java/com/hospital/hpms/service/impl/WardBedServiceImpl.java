package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.WardBedDto.*;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.BedUnavailableException;
import com.hospital.hpms.exception.ResourceNotFoundException;
import com.hospital.hpms.exception.UnauthorizedAccessException;
import com.hospital.hpms.repository.BedRepository;
import com.hospital.hpms.repository.PatientRepository;
import com.hospital.hpms.repository.UserRepository;
import com.hospital.hpms.repository.WardRepository;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.WardBedService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WardBedServiceImpl implements WardBedService {

    private final WardRepository wardRepository;
    private final BedRepository bedRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

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

        // Authoritative role check: Receptionists have view-only access
        if (currentUserId != null) {
            userRepository.findById(currentUserId).ifPresent(u -> {
                if (u.getRole() == RoleType.ROLE_RECEPTIONIST) {
                    throw new UnauthorizedAccessException("Receptionists have view-only access to beds and are not permitted to assign patients to beds.");
                }
            });
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

        // 5. Ward capacity check against configured totalBeds
        Ward ward = wardRepository.findById(bed.getWardId())
                .orElseThrow(() -> new ResourceNotFoundException("Ward not found with ID: " + bed.getWardId()));

        long currentlyOccupied = bedRepository.countByWardIdAndStatus(ward.getId(), BedStatus.OCCUPIED);
        if (currentlyOccupied >= ward.getTotalBeds()) {
            throw new BedUnavailableException("Ward " + ward.getWardName() + " has reached maximum configured capacity (" + ward.getTotalBeds() + " beds).");
        }

        // 6. Assign physical bed
        bed.setStatus(BedStatus.OCCUPIED);
        bed.setPatientId(patient.getId());
        bed.setAssignmentDate(LocalDateTime.now());
        Bed saved = bedRepository.save(bed);

        // 7. Synchronize ward.occupiedBeds directly from authoritative beds table
        long updatedOccupied = bedRepository.countByWardIdAndStatus(ward.getId(), BedStatus.OCCUPIED);
        ward.setOccupiedBeds((int) updatedOccupied);
        wardRepository.save(ward);

        patient.setStatus("INPATIENT");
        patientRepository.save(patient);

        auditLogService.log(currentUserId, "BED_ASSIGNED", "Bed", bed.getId(), "AVAILABLE",
                "Patient " + patient.getPatientNumber() + " assigned to Bed " + bed.getBedNumber());

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

        bed.setStatus(BedStatus.AVAILABLE);
        bed.setPatientId(null);
        bed.setAssignmentDate(null);
        Bed saved = bedRepository.save(bed);

        Ward ward = wardRepository.findById(bed.getWardId()).orElse(null);
        if (ward != null) {
            long occ = bedRepository.countByWardIdAndStatus(ward.getId(), BedStatus.OCCUPIED);
            ward.setOccupiedBeds((int) occ);
            wardRepository.save(ward);
        }

        if (patient != null) {
            patient.setStatus("DISCHARGED");
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
                .build();
    }
}
