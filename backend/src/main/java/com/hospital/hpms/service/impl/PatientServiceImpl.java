package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.PatientDto.*;
import com.hospital.hpms.entity.Patient;
import com.hospital.hpms.entity.RoleType;
import com.hospital.hpms.exception.*;
import com.hospital.hpms.repository.*;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    private final BillRepository billRepository;
    private final AuditLogService auditLogService;

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
                .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                .userId(request.getUserId())
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
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            return patientRepository.findPatientsByDoctorId(principal.getId()).stream()
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
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            return patientRepository.findPatientsByDoctorId(principal.getId(), pageable)
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
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            boolean isAssigned = patientRepository.isPatientAssignedToDoctor(id, principal.getId());
            if (!isAssigned) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to access patients assigned to your care.");
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
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            return patientRepository.searchPatientsByDoctorId(principal.getId(), query != null ? query.trim() : "").stream()
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
        history.put("labOrders", labOrderRepository.findByPatientId(id));
        history.put("bills", billRepository.findByPatientId(id));

        return history;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getPatientHistory(Long id, UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            boolean isAssigned = patientRepository.isPatientAssignedToDoctor(id, principal.getId());
            if (!isAssigned) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to access medical history for your assigned patients.");
            }
        }
        return getPatientHistory(id);
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
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
