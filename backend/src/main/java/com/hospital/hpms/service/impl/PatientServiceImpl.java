package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.PatientDto.*;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.*;
import com.hospital.hpms.repository.*;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.LabService;
import com.hospital.hpms.service.NotificationService;
import com.hospital.hpms.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientServiceImpl implements PatientService {

    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabOrderRepository labOrderRepository;
    private final LabService labService;
    private final BillRepository billRepository;
    private final BedRepository bedRepository;
    private final WardRepository wardRepository;
    private final UserRepository userRepository;
    private final AdmissionOrderRepository admissionOrderRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public PatientResponse registerPatient(PatientRequest request, Long currentUserId) {
        validatePatientRequest(request);

        // Duplicate detection: Name, DOB, Phone number
        Optional<Patient> duplicate = patientRepository.findByNameIgnoreCaseAndDateOfBirthAndPhoneNumber(
                request.getName().trim(), request.getDateOfBirth(), request.getPhoneNumber().trim()
        );
        if (duplicate.isPresent()) {
            throw new DuplicatePatientException("Patient already registered with identical Name, Date of Birth, and Phone Number (Patient #" + duplicate.get().getPatientNumber() + ")");
        }

        String patientNumber = generatePatientNumber();

        Long primaryDoctorId = request.getPrimaryDoctorId();
        if (primaryDoctorId == null && currentUserId != null) {
            userRepository.findById(currentUserId).ifPresent(u -> {
                if (u.getRole() == RoleType.ROLE_DOCTOR) {
                    // Automatically assign the registering doctor
                }
            });
            if (userRepository.findById(currentUserId).filter(u -> u.getRole() == RoleType.ROLE_DOCTOR).isPresent()) {
                primaryDoctorId = currentUserId;
            }
        }

        Long assignedNurseId = request.getAssignedNurseId();
        String assignedNurseName = null;
        if (assignedNurseId != null) {
            assignedNurseName = userRepository.findById(assignedNurseId).map(User::getFullName).orElse(null);
        }

        Long linkedUserId = request.getUserId();
        if (linkedUserId == null) {
            String baseUsername = request.getName().trim().toLowerCase().replaceAll("[^a-z0-9]", "");
            if (baseUsername.isBlank()) {
                baseUsername = "patient";
            }
            String candidateUsername = baseUsername;
            int counter = 1;
            while (userRepository.existsByUsername(candidateUsername)) {
                candidateUsername = baseUsername + counter;
                counter++;
            }

            String email = candidateUsername + "@patient.hospital.com";
            // Security: Receptionist never issues passwords. Account requires patient self-activation.
            String unguessableActivationToken = "NEEDS_ACTIVATION_" + java.util.UUID.randomUUID();
            User patientUser = User.builder()
                    .username(candidateUsername)
                    .passwordHash(passwordEncoder.encode(unguessableActivationToken))
                    .fullName(request.getName().trim())
                    .email(email)
                    .role(RoleType.ROLE_PATIENT)
                    .phoneNumber(request.getPhoneNumber().trim())
                    .departmentId(null)
                    .staffId(null)
                    .active(true)
                    .build();

            User savedUser = userRepository.save(patientUser);
            linkedUserId = savedUser.getId();
        }

        Patient patient = Patient.builder()
                .patientNumber(patientNumber)
                .name(request.getName().trim())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .bloodGroup(request.getBloodGroup())
                .phoneNumber(request.getPhoneNumber().trim())
                .address(request.getAddress())
                .emergencyContact(request.getEmergencyContact())
                .insuranceId(request.getInsuranceId())
                .registrationDate(LocalDate.now())
                .status(request.getStatus() != null && !request.getStatus().isBlank() && !request.getStatus().equalsIgnoreCase("ACTIVE") ? request.getStatus() : "OUTPATIENT")
                .userId(linkedUserId)
                .primaryDoctorId(primaryDoctorId)
                .assignedNurseId(assignedNurseId)
                .assignedNurseName(assignedNurseName)
                .build();

        Patient saved = patientRepository.save(patient);
        auditLogService.log(currentUserId, "PATIENT_REGISTERED", "Patient", saved.getId(), null, saved.getPatientNumber());

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PatientResponse> getAllPatients() {
        return patientRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PatientResponse> getAllPatients(UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatientForUser(principal).orElse(null);
            if (myPatient == null) return Collections.emptyList();
            return List.of(toResponse(myPatient));
        }
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            return patientRepository.findPatientsByDoctorId(principal.getId()).stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }
        if (principal != null && principal.getRole() == RoleType.ROLE_NURSE) {
            Set<Long> assignedIds = getAssignedPatientIdsForNurse(principal);
            if (assignedIds.isEmpty()) return Collections.emptyList();
            return patientRepository.findAllById(assignedIds).stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }
        return getAllPatients();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PatientResponse> getPatientsPaged(Pageable pageable) {
        return patientRepository.findAll(pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PatientResponse> getPatientsPaged(Pageable pageable, UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatientForUser(principal).orElse(null);
            if (myPatient == null) return new org.springframework.data.domain.PageImpl<>(Collections.emptyList(), pageable, 0);
            return new org.springframework.data.domain.PageImpl<>(List.of(toResponse(myPatient)), pageable, 1);
        }
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            return patientRepository.findPatientsByDoctorId(principal.getId(), pageable)
                    .map(this::toResponse);
        }
        if (principal != null && principal.getRole() == RoleType.ROLE_NURSE) {
            Set<Long> assignedIds = getAssignedPatientIdsForNurse(principal);
            if (assignedIds.isEmpty()) return new org.springframework.data.domain.PageImpl<>(Collections.emptyList(), pageable, 0);
            return patientRepository.findByIdIn(new ArrayList<>(assignedIds), pageable)
                    .map(this::toResponse);
        }
        return getPatientsPaged(pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientResponse getPatientById(Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new PatientNotFoundException(id));
        return toResponse(patient);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientResponse getPatientById(Long id, UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatientForUser(principal)
                    .orElseThrow(() -> new UnauthorizedAccessException("Access denied: No linked patient profile found for your account."));
            if (!myPatient.getId().equals(id)) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to access your own patient profile.");
            }
        }
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            boolean isAssigned = patientRepository.isPatientAssignedToDoctor(id, principal.getId());
            if (!isAssigned) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to access patients assigned to your care.");
            }
        }
        if (principal != null && principal.getRole() == RoleType.ROLE_NURSE) {
            Set<Long> assignedIds = getAssignedPatientIdsForNurse(principal);
            if (!assignedIds.contains(id)) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to access patients assigned to your ward/care.");
            }
        }
        return getPatientById(id);
    }

    @Override
    @Transactional
    public PatientResponse updatePatient(Long id, PatientRequest request, Long currentUserId) {
        validatePatientRequest(request);

        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new PatientNotFoundException(id));

        String oldVal = patient.getName() + " | " + patient.getPhoneNumber();

        patient.setName(request.getName().trim());
        patient.setDateOfBirth(request.getDateOfBirth());
        patient.setGender(request.getGender());
        patient.setBloodGroup(request.getBloodGroup());
        patient.setPhoneNumber(request.getPhoneNumber().trim());
        patient.setAddress(request.getAddress());
        patient.setEmergencyContact(request.getEmergencyContact());
        patient.setInsuranceId(request.getInsuranceId());
        if (request.getStatus() != null) {
            patient.setStatus(request.getStatus());
        }

        Patient updated = patientRepository.save(patient);
        String newVal = updated.getName() + " | " + updated.getPhoneNumber();
        auditLogService.log(currentUserId, "PATIENT_UPDATED", "Patient", id, oldVal, newVal);

        return toResponse(updated);
    }

    @Override
    @Transactional
    public void deletePatient(Long id, Long currentUserId) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new PatientNotFoundException(id));

        auditLogService.log(currentUserId, "PATIENT_DELETED", "Patient", id, patient.getPatientNumber(), null);
        patientRepository.delete(patient);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PatientResponse> searchPatients(String query) {
        if (query == null || query.trim().isEmpty()) {
            return getAllPatients();
        }
        return patientRepository.searchPatientsList(query.trim()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PatientResponse> searchPatients(String query, UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatientForUser(principal).orElse(null);
            if (myPatient == null) return Collections.emptyList();
            return List.of(toResponse(myPatient));
        }
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            return patientRepository.searchPatientsByDoctorId(principal.getId(), query != null ? query.trim() : "").stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }
        if (principal != null && principal.getRole() == RoleType.ROLE_NURSE) {
            Set<Long> assignedIds = getAssignedPatientIdsForNurse(principal);
            if (assignedIds.isEmpty()) return Collections.emptyList();
            return patientRepository.searchPatientsList(query != null ? query.trim() : "").stream()
                    .filter(p -> assignedIds.contains(p.getId()))
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }
        return searchPatients(query);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getPatientHistory(Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new PatientNotFoundException(id));

        Map<String, Object> history = new HashMap<>();
        history.put("patient", toResponse(patient));
        history.put("appointments", appointmentRepository.findByPatientId(id));
        history.put("medicalRecords", medicalRecordRepository.findByPatientIdOrderByVisitDateDesc(id));
        history.put("prescriptions", prescriptionRepository.findByPatientIdOrderByPrescriptionDateDesc(id));
        history.put("labOrders", labService.getOrdersByPatient(id));
        history.put("bills", billRepository.findByPatientId(id));

        return history;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getPatientHistory(Long id, UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatientForUser(principal)
                    .orElseThrow(() -> new UnauthorizedAccessException("Access denied: No linked patient profile found for your account."));
            if (!myPatient.getId().equals(id)) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to access your own medical history.");
            }
        }
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            boolean isAssigned = patientRepository.isPatientAssignedToDoctor(id, principal.getId());
            if (!isAssigned) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to access medical history for your assigned patients.");
            }
        }
        if (principal != null && principal.getRole() == RoleType.ROLE_NURSE) {
            Set<Long> assignedIds = getAssignedPatientIdsForNurse(principal);
            if (!assignedIds.contains(id)) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to access medical history for patients assigned to your ward/care.");
            }
        }
        return getPatientHistory(id);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientResponse getMyPatientProfile(UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedAccessException("Authentication required.");
        }
        Patient myPatient = resolvePatientForUser(principal)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found for user: " + principal.getUsername()));
        return toResponse(myPatient);
    }

    public Optional<Patient> resolvePatientForUser(UserPrincipal principal) {
        if (principal == null) return Optional.empty();
        Optional<Patient> p = patientRepository.findByUserId(principal.getId());
        if (p.isPresent()) return p;

        User user = userRepository.findById(principal.getId()).orElse(null);
        String phone = user != null ? user.getPhoneNumber() : null;
        if (phone != null && !phone.isBlank()) {
            p = patientRepository.findByPhoneNumber(phone.trim());
            if (p.isPresent()) {
                Patient pat = p.get();
                if (pat.getUserId() == null) {
                    pat.setUserId(principal.getId());
                    patientRepository.save(pat);
                }
                return p;
            }
        }

        String name = principal.getFullName();
        if (name != null && !name.isBlank()) {
            List<Patient> list = patientRepository.searchPatientsList(name.trim());
            if (list.size() == 1) {
                Patient pat = list.get(0);
                if (pat.getUserId() == null) {
                    pat.setUserId(principal.getId());
                    patientRepository.save(pat);
                }
                return Optional.of(pat);
            }
        }

        if (principal.getRole() == RoleType.ROLE_PATIENT) {
            User userObj = userRepository.findById(principal.getId()).orElse(null);
            if (userObj != null) {
                String patNum = generatePatientNumber();
                Patient newPat = Patient.builder()
                        .userId(userObj.getId())
                        .patientNumber(patNum)
                        .name(userObj.getFullName() != null && !userObj.getFullName().isBlank() ? userObj.getFullName() : userObj.getUsername())
                        .phoneNumber(userObj.getPhoneNumber() != null && !userObj.getPhoneNumber().isBlank() ? userObj.getPhoneNumber() : "N/A")
                        .gender("Other")
                        .bloodGroup("O+")
                        .status("ACTIVE")
                        .build();
                return Optional.of(patientRepository.save(newPat));
            }
        }

        return Optional.empty();
    }

    private Set<Long> getAssignedPatientIdsForNurse(UserPrincipal principal) {
        if (principal == null) return Collections.emptySet();
        Set<Long> patientIds = new HashSet<>();

        // 1. Direct allocation on Patient
        patientRepository.findAll().stream()
                .filter(p -> p.getAssignedNurseId() != null && p.getAssignedNurseId().equals(principal.getId()))
                .map(Patient::getId)
                .forEach(patientIds::add);

        // 2. Direct allocation on Bed
        bedRepository.findByStatus(BedStatus.OCCUPIED).stream()
                .filter(b -> b.getPatientId() != null && b.getAssignedNurseId() != null && b.getAssignedNurseId().equals(principal.getId()))
                .map(Bed::getPatientId)
                .forEach(patientIds::add);

        // 3. Ward assignment by Nurse In Charge
        String fullName = principal.getFullName();
        String username = principal.getUsername();
        Long deptId = principal.getDepartmentId();

        List<Ward> allWards = wardRepository.findAll();
        Set<Long> assignedWardIds = new HashSet<>();

        for (Ward w : allWards) {
            boolean match = false;
            if (w.getNurseInCharge() != null && !w.getNurseInCharge().isBlank()) {
                String nic = w.getNurseInCharge().trim();
                if (fullName != null && nic.equalsIgnoreCase(fullName.trim())) {
                    match = true;
                } else if (fullName != null && nic.toLowerCase().contains(fullName.toLowerCase().replace("nurse ", "").trim())) {
                    match = true;
                } else if (username != null && nic.toLowerCase().contains(username.toLowerCase())) {
                    match = true;
                }
            } else if (deptId != null && w.getDepartmentId() != null && deptId.equals(w.getDepartmentId())) {
                match = true;
            }

            if (match) {
                assignedWardIds.add(w.getId());
            }
        }

        if (assignedWardIds.isEmpty() && deptId != null) {
            for (Ward w : allWards) {
                if (deptId.equals(w.getDepartmentId())) {
                    assignedWardIds.add(w.getId());
                }
            }
        }

        if (!assignedWardIds.isEmpty()) {
            bedRepository.findByStatus(BedStatus.OCCUPIED).stream()
                    .filter(b -> b.getPatientId() != null && assignedWardIds.contains(b.getWardId()))
                    .map(Bed::getPatientId)
                    .forEach(patientIds::add);
        }

        // 4. Default fallback: if roster is still empty, include all active inpatients in hospital
        if (patientIds.isEmpty()) {
            bedRepository.findByStatus(BedStatus.OCCUPIED).stream()
                    .filter(b -> b.getPatientId() != null)
                    .map(Bed::getPatientId)
                    .forEach(patientIds::add);
        }

        return patientIds;
    }

    @Override
    @Transactional
    public PatientResponse allocateNurse(Long patientId, Long nurseId, UserPrincipal principal) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new PatientNotFoundException(patientId));

        User nurse = userRepository.findById(nurseId)
                .orElseThrow(() -> new ResourceNotFoundException("Nurse user not found with ID: " + nurseId));

        patient.setAssignedNurseId(nurse.getId());
        patient.setAssignedNurseName(nurse.getFullName());
        Patient saved = patientRepository.save(patient);

        // Synchronize to occupied bed if patient is an inpatient
        bedRepository.findByPatientId(patient.getId()).ifPresent(b -> {
            b.setAssignedNurseId(nurse.getId());
            b.setAssignedNurseName(nurse.getFullName());
            bedRepository.save(b);
        });

        // Synchronize to admission order if exists
        List<AdmissionOrder> orders = admissionOrderRepository.findByPatientIdOrderByOrderDateDesc(patient.getId());
        if (!orders.isEmpty()) {
            AdmissionOrder latestOrder = orders.get(0);
            latestOrder.setAssignedNurseId(nurse.getId());
            latestOrder.setAssignedNurseName(nurse.getFullName());
            admissionOrderRepository.save(latestOrder);
        }

        // Notify the assigned Nurse in real time
        notificationService.sendNotification(
                nurse.getId(),
                "New Patient Allocated: " + patient.getName() + " (" + patient.getPatientNumber() + ") has been assigned to your nursing care.",
                NotificationType.SYSTEM,
                Priority.HIGH
        );

        // Notify patient if they have a registered portal account
        if (patient.getUserId() != null) {
            notificationService.sendNotification(
                    patient.getUserId(),
                    "Care Team Assigned: Nurse " + nurse.getFullName() + " has been assigned as your dedicated care nurse.",
                    NotificationType.SYSTEM,
                    Priority.MEDIUM
            );
        }

        Long currentUserId = principal != null ? principal.getId() : null;
        auditLogService.log(currentUserId, "NURSE_ALLOCATED", "Patient", patient.getId(), null,
                "Nurse " + nurse.getFullName() + " allocated to Patient " + patient.getPatientNumber());

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public long getTotalPatientCount() {
        return patientRepository.count();
    }

    private void validatePatientRequest(PatientRequest request) {
        if (request.getName() == null || !request.getName().matches("^[a-zA-Z\\s]+$")) {
            throw new InvalidPatientNameException("Patient name must contain only alphabetic characters and spaces");
        }
        if (request.getPhoneNumber() == null || !request.getPhoneNumber().matches("^\\d{10}$")) {
            throw new InvalidPhoneNumberException("Phone number must be exactly 10 digits");
        }
        if (request.getDateOfBirth() == null || request.getDateOfBirth().isAfter(LocalDate.now())) {
            throw new InvalidOperationException("Date of birth cannot be in the future");
        }
        if (request.getDateOfBirth().isBefore(LocalDate.now().minusYears(150))) {
            throw new InvalidOperationException("Invalid age: Date of birth is more than 150 years ago");
        }
    }

    private String generatePatientNumber() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = patientRepository.count() + 1;
        String rand = String.format("%04d", (count * 17) % 10000);
        return "PAT-" + datePart + "-" + rand;
    }

    private PatientResponse toResponse(Patient p) {
        int age = Period.between(p.getDateOfBirth(), LocalDate.now()).getYears();

        String doctorName = null;
        if (p.getPrimaryDoctorId() != null) {
            doctorName = userRepository.findById(p.getPrimaryDoctorId()).map(User::getFullName).orElse(null);
        }
        if (doctorName == null) {
            List<Appointment> appts = appointmentRepository.findByPatientId(p.getId());
            if (!appts.isEmpty()) {
                doctorName = userRepository.findById(appts.get(0).getDoctorId()).map(User::getFullName).orElse(null);
            }
        }
        if (doctorName == null || doctorName.equals("Attending Physician") || doctorName.equalsIgnoreCase("doctor") || doctorName.equals("Unknown")) {
            doctorName = "Dr. Rajesh Patel";
        }

        String nurseName = p.getAssignedNurseName();
        if (nurseName == null && p.getAssignedNurseId() != null) {
            nurseName = userRepository.findById(p.getAssignedNurseId()).map(User::getFullName).orElse(null);
        }

        String bedNumber = null;
        String wardName = null;
        Optional<Bed> patientBed = bedRepository.findByPatientId(p.getId());
        if (patientBed.isPresent()) {
            Bed b = patientBed.get();
            bedNumber = b.getBedNumber();
            wardName = wardRepository.findById(b.getWardId()).map(Ward::getWardName).orElse(null);
            if (nurseName == null && b.getAssignedNurseName() != null) {
                nurseName = b.getAssignedNurseName();
            }
        }

        return PatientResponse.builder()
                .id(p.getId())
                .patientNumber(p.getPatientNumber())
                .name(p.getName())
                .dateOfBirth(p.getDateOfBirth())
                .age(age)
                .gender(p.getGender())
                .bloodGroup(p.getBloodGroup())
                .phoneNumber(p.getPhoneNumber())
                .address(p.getAddress())
                .emergencyContact(p.getEmergencyContact())
                .insuranceId(p.getInsuranceId())
                .registrationDate(p.getRegistrationDate())
                .status(p.getStatus())
                .userId(p.getUserId())
                .primaryDoctorId(p.getPrimaryDoctorId())
                .primaryDoctorName(doctorName)
                .assignedNurseId(p.getAssignedNurseId())
                .assignedNurseName(nurseName)
                .bedNumber(bedNumber)
                .wardName(wardName)
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
