package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.AdmissionOrderDto.*;
import com.hospital.hpms.dto.AppointmentDto.*;
import com.hospital.hpms.dto.ConsultationDto.*;
import com.hospital.hpms.dto.DirectBookingDto.*;
import com.hospital.hpms.dto.LabDto.LabOrderResponse;
import com.hospital.hpms.dto.PrescriptionDto.PrescriptionResponse;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.AppointmentConflictException;
import com.hospital.hpms.exception.ResourceNotFoundException;
import com.hospital.hpms.exception.UnauthorizedAccessException;
import com.hospital.hpms.repository.*;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.AppointmentService;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.NotificationService;
import com.hospital.hpms.service.WardBedService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentServiceImpl implements AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabOrderRepository labOrderRepository;
    private final WardBedService wardBedService;
    private final VitalSignRepository vitalSignRepository;
    private final PasswordEncoder passwordEncoder;


    private static final List<String> STANDARD_SLOTS = List.of(
            "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30", "10:30 - 11:00",
            "11:00 - 11:30", "11:30 - 12:00", "13:00 - 13:30", "13:30 - 14:00",
            "14:00 - 14:30", "14:30 - 15:00", "15:00 - 15:30", "15:30 - 16:00"
    );

    @Override
    @Transactional
    public AppointmentResponse bookAppointment(AppointmentRequest request, Long currentUserId) {
        if (currentUserId != null) {
            User currentUser = userRepository.findById(currentUserId).orElse(null);
            if (currentUser != null && currentUser.getRole() == RoleType.ROLE_PATIENT) {
                Patient myPatient = patientRepository.findByUserId(currentUserId).orElse(null);
                if (myPatient == null && currentUser.getPhoneNumber() != null) {
                    myPatient = patientRepository.findByPhoneNumber(currentUser.getPhoneNumber()).orElse(null);
                }
                if (myPatient != null) {
                    request.setPatientId(myPatient.getId());
                }
            }
        }

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + request.getPatientId()));
        User doctor = userRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + request.getDoctorId()));

        if (doctor.getRole() != RoleType.ROLE_DOCTOR && doctor.getRole() != RoleType.ROLE_ADMIN) {
            throw new IllegalArgumentException("Selected user is not a registered doctor");
        }

        // Conflict detection: Doctor slot double booking
        boolean conflict = appointmentRepository.existsByDoctorIdAndAppointmentDateAndTimeSlotAndStatusNot(
                request.getDoctorId(), request.getAppointmentDate(), request.getTimeSlot(), AppointmentStatus.CANCELLED
        );
        if (conflict) {
            throw new AppointmentConflictException("Dr. " + doctor.getFullName() + " is already booked for time slot " + request.getTimeSlot() + " on " + request.getAppointmentDate() + ". Please choose another available slot.");
        }

        // Calculate queue number for the day
        List<Appointment> dayAppointments = appointmentRepository.findByDoctorIdAndAppointmentDate(request.getDoctorId(), request.getAppointmentDate());
        int queueNumber = dayAppointments.size() + 1;

        Appointment appointment = Appointment.builder()
                .patientId(request.getPatientId())
                .doctorId(request.getDoctorId())
                .departmentId(request.getDepartmentId() != null ? request.getDepartmentId() : doctor.getDepartmentId())
                .appointmentDate(request.getAppointmentDate())
                .timeSlot(request.getTimeSlot())
                .type(request.getType() != null ? request.getType() : AppointmentType.OPD)
                .status(AppointmentStatus.SCHEDULED)
                .notes(request.getNotes())
                .queueNumber(queueNumber)
                .build();

        Appointment saved = appointmentRepository.save(appointment);

        auditLogService.log(currentUserId, "APPOINTMENT_BOOKED", "Appointment", saved.getId(), null,
                "Dr. " + doctor.getFullName() + " with " + patient.getName() + " [SCHEDULED - Pending Doctor Confirmation]");

        // Send in-app notification to Doctor requesting confirmation
        notificationService.sendNotification(doctor.getId(),
                "New appointment pending confirmation: " + patient.getName() + " on " + saved.getAppointmentDate() + " (" + saved.getTimeSlot() + ")",
                NotificationType.APPOINTMENT, Priority.HIGH);

        // If patient has a user account, notify patient as well
        if (patient.getUserId() != null) {
            notificationService.sendNotification(patient.getUserId(),
                    "Appointment requested with Dr. " + doctor.getFullName() + " on " + saved.getAppointmentDate() + " (" + saved.getTimeSlot() + "). Pending doctor confirmation.",
                    NotificationType.APPOINTMENT, Priority.MEDIUM);
        }

        return toResponse(saved, patient, doctor);
    }

    @Override
    @Transactional
    public DirectBookingResponse directOpdBooking(DirectBookingRequest request, Long currentUserId) {
        if (request.getFullName() == null || request.getFullName().trim().isBlank()) {
            throw new IllegalArgumentException("Patient full name is required");
        }
        if (request.getPhoneNumber() == null || request.getPhoneNumber().trim().isBlank()) {
            throw new IllegalArgumentException("Phone number is required");
        }
        if (request.getDoctorId() == null) {
            throw new IllegalArgumentException("Doctor ID is required");
        }
        if (request.getAppointmentDate() == null) {
            throw new IllegalArgumentException("Appointment date is required");
        }
        if (request.getTimeSlot() == null || request.getTimeSlot().trim().isBlank()) {
            throw new IllegalArgumentException("Time slot is required");
        }

        // Clean phone number (extract digits only)
        String rawPhone = request.getPhoneNumber().trim().replaceAll("[^0-9]", "");
        String sanitizedPhone = rawPhone;
        if (rawPhone.length() == 12 && rawPhone.startsWith("91")) {
            sanitizedPhone = rawPhone.substring(2);
        } else if (rawPhone.length() > 10) {
            sanitizedPhone = rawPhone.substring(rawPhone.length() - 10);
        }

        if (sanitizedPhone.length() != 10) {
            throw new IllegalArgumentException("Phone number must contain exactly 10 digits");
        }

        // Clean patient name
        String cleanName = request.getFullName().trim().replaceAll("\\s+", " ");
        if (!cleanName.matches("^[a-zA-Z\\s.]+$")) {
            throw new IllegalArgumentException("Patient name must contain only alphabetic characters, dots, and spaces");
        }

        // Find doctor
        User doctor = userRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + request.getDoctorId()));

        if (doctor.getRole() != RoleType.ROLE_DOCTOR && doctor.getRole() != RoleType.ROLE_ADMIN) {
            throw new IllegalArgumentException("Selected user is not a registered doctor");
        }

        String docDisplayName = doctor.getFullName();
        if (!docDisplayName.toLowerCase().startsWith("dr.") && !docDisplayName.toLowerCase().startsWith("dr ")) {
            docDisplayName = "Dr. " + docDisplayName;
        }

        // Slot Conflict Prevention
        boolean conflict = appointmentRepository.existsByDoctorIdAndAppointmentDateAndTimeSlotAndStatusNot(
                doctor.getId(), request.getAppointmentDate(), request.getTimeSlot().trim(), AppointmentStatus.CANCELLED
        );
        if (conflict) {
            throw new AppointmentConflictException(docDisplayName + " is already booked for time slot " + request.getTimeSlot().trim() + " on " + request.getAppointmentDate() + ". Please choose another available slot.");
        }

        // Patient Resolution: Existing Patient vs New Patient
        Patient patient = null;
        boolean isNewPatient = false;
        boolean customPasswordSet = false;
        String portalUsername = null;

        // Try find patient by phone number
        Optional<Patient> existingPatientOpt = patientRepository.findByPhoneNumber(sanitizedPhone);
        if (existingPatientOpt.isEmpty() && request.getEmail() != null && !request.getEmail().trim().isBlank()) {
            String searchEmail = request.getEmail().trim().toLowerCase();
            Optional<User> userWithEmail = userRepository.findByEmail(searchEmail);
            if (userWithEmail.isPresent()) {
                existingPatientOpt = patientRepository.findByUserId(userWithEmail.get().getId());
            }
        }
        if (existingPatientOpt.isEmpty()) {
            List<Patient> nameMatches = patientRepository.searchPatientsList(cleanName);
            for (Patient p : nameMatches) {
                if (p.getName() != null && p.getName().trim().equalsIgnoreCase(cleanName)) {
                    existingPatientOpt = Optional.of(p);
                    break;
                }
            }
        }

        if (existingPatientOpt.isPresent()) {
            patient = existingPatientOpt.get();
            if (patient.getPrimaryDoctorId() == null) {
                patient.setPrimaryDoctorId(doctor.getId());
                patientRepository.save(patient);
            }
            if (patient.getUserId() != null) {
                User pu = userRepository.findById(patient.getUserId()).orElse(null);
                portalUsername = pu != null ? pu.getUsername() : null;
            }
        } else {
            // Register New Patient and Patient Portal User
            isNewPatient = true;

            String baseUsername = cleanName.toLowerCase().replaceAll("[^a-z0-9]", "");
            if (baseUsername.isBlank()) {
                baseUsername = "patient";
            }
            String candidateUsername = baseUsername;
            int counter = 1;
            while (userRepository.existsByUsername(candidateUsername)) {
                candidateUsername = baseUsername + counter;
                counter++;
            }
            portalUsername = candidateUsername;

            String userEmail = (request.getEmail() != null && !request.getEmail().trim().isBlank())
                    ? request.getEmail().trim().toLowerCase()
                    : candidateUsername + "@patient.hospital.com";
            if (userRepository.existsByEmail(userEmail)) {
                userEmail = candidateUsername + "@patient.hospital.com";
            }

            String chosenPassword = (request.getPassword() != null && !request.getPassword().trim().isBlank())
                    ? request.getPassword().trim()
                    : "Patient@" + java.util.UUID.randomUUID().toString().substring(0, 8);
            if (request.getPassword() != null && !request.getPassword().trim().isBlank()) {
                customPasswordSet = true;
            }

            User patientUser = User.builder()
                    .username(candidateUsername)
                    .passwordHash(passwordEncoder.encode(chosenPassword))
                    .fullName(cleanName)
                    .email(userEmail)
                    .role(RoleType.ROLE_PATIENT)
                    .phoneNumber(sanitizedPhone)
                    .active(true)
                    .build();
            User savedUser = userRepository.save(patientUser);

            String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            long count = patientRepository.count() + 1;
            String rand = String.format("%04d", (count * 17) % 10000);
            String patientNumber = "PAT-" + datePart + "-" + rand;

            LocalDate dob = request.getDateOfBirth() != null ? request.getDateOfBirth() : LocalDate.of(1995, 1, 1);
            String gender = (request.getGender() != null && !request.getGender().trim().isBlank()) ? request.getGender().trim() : "Other";

            Patient newPatient = Patient.builder()
                    .patientNumber(patientNumber)
                    .name(cleanName)
                    .dateOfBirth(dob)
                    .gender(gender)
                    .bloodGroup("Unknown")
                    .phoneNumber(sanitizedPhone)
                    .registrationDate(LocalDate.now())
                    .status("OUTPATIENT")
                    .userId(savedUser.getId())
                    .primaryDoctorId(doctor.getId())
                    .build();
            patient = patientRepository.save(newPatient);

            auditLogService.log(savedUser.getId(), "PATIENT_REGISTERED", "Patient", patient.getId(), null,
                    "Registered via Direct OPD: " + patient.getPatientNumber());
        }

        // Calculate queue number for the day
        List<Appointment> dayAppointments = appointmentRepository.findByDoctorIdAndAppointmentDate(doctor.getId(), request.getAppointmentDate());
        int queueNumber = dayAppointments.size() + 1;

        Long deptId = request.getDepartmentId() != null ? request.getDepartmentId() : doctor.getDepartmentId();

        Appointment appointment = Appointment.builder()
                .patientId(patient.getId())
                .doctorId(doctor.getId())
                .departmentId(deptId)
                .appointmentDate(request.getAppointmentDate())
                .timeSlot(request.getTimeSlot().trim())
                .type(AppointmentType.OPD)
                .status(AppointmentStatus.SCHEDULED)
                .notes(request.getReason() != null ? request.getReason().trim() : null)
                .queueNumber(queueNumber)
                .billingStatus("PENDING")
                .build();

        Appointment saved = appointmentRepository.save(appointment);

        auditLogService.log(patient.getUserId(), "DIRECT_OPD_BOOKING", "Appointment", saved.getId(), null,
                "Direct OPD: Dr. " + doctor.getFullName() + " with " + patient.getName() + " on " + saved.getAppointmentDate() + " (" + saved.getTimeSlot() + ")");

        // In-app notification to Doctor requesting confirmation
        notificationService.sendNotification(doctor.getId(),
                "New Direct OPD appointment: " + patient.getName() + " on " + saved.getAppointmentDate() + " (" + saved.getTimeSlot() + ")",
                NotificationType.APPOINTMENT, Priority.HIGH);

        // In-app notification to Patient if registered
        if (patient.getUserId() != null) {
            notificationService.sendNotification(patient.getUserId(),
                    "Direct OPD appointment booked with Dr. " + doctor.getFullName() + " on " + saved.getAppointmentDate() + " (" + saved.getTimeSlot() + "). Reference: APT-" + saved.getId(),
                    NotificationType.APPOINTMENT, Priority.MEDIUM);
        }

        String deptName = null;
        if (deptId != null) {
            deptName = departmentRepository.findById(deptId).map(Department::getName).orElse(null);
        }
        if (deptName == null) {
            deptName = "Department of General Medicine";
        }


        return DirectBookingResponse.builder()
                .appointmentId(saved.getId())
                .bookingCode("APT-" + saved.getId())
                .patientId(patient.getId())
                .patientNumber(patient.getPatientNumber())
                .patientName(patient.getName())
                .doctorId(doctor.getId())
                .doctorName(docDisplayName)
                .departmentId(deptId)
                .departmentName(deptName)
                .appointmentDate(saved.getAppointmentDate())
                .timeSlot(saved.getTimeSlot())
                .status(saved.getStatus().name())
                .queueNumber(saved.getQueueNumber())
                .notes(saved.getNotes())
                .portalUsername(portalUsername)
                .defaultPassword(null)
                .customPasswordSet(customPasswordSet)
                .phoneNumber(patient.getPhoneNumber())
                .isNewPatient(isNewPatient)
                .createdDate(saved.getCreatedDate())
                .build();
    }


    @Override
    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointmentsByPatient(Long patientId) {
        return appointmentRepository.findByPatientId(patientId).stream()
                .map(this::populateResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointmentsByDoctor(Long doctorId) {
        return appointmentRepository.findByDoctorId(doctorId).stream()
                .map(this::populateResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public AppointmentResponse getAppointmentById(Long id) {
        Appointment a = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + id));
        return populateResponse(a);
    }

    @Override
    @Transactional(readOnly = true)
    public AppointmentResponse getAppointmentById(Long id, UserPrincipal principal) {
        Appointment a = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + id));
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            if (!principal.getId().equals(a.getDoctorId())) {
                throw new UnauthorizedAccessException("Access denied: Doctors can only view their own appointments.");
            }
        }
        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatient(principal);
            if (myPatient == null || !myPatient.getId().equals(a.getPatientId())) {
                throw new UnauthorizedAccessException("Access denied: You can only view your own appointments.");
            }
        }
        return populateResponse(a);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointmentsByPatient(Long patientId, UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatient(principal);
            if (myPatient == null || !myPatient.getId().equals(patientId)) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to view your own appointments.");
            }
        }
        return getAppointmentsByPatient(patientId);
    }

    @Override
    @Transactional
    public AppointmentResponse updateAppointment(Long id, AppointmentRequest request, Long currentUserId) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + id));

        // If time or doctor changed, verify slot availability
        if (!appointment.getDoctorId().equals(request.getDoctorId()) ||
            !appointment.getAppointmentDate().equals(request.getAppointmentDate()) ||
            !appointment.getTimeSlot().equals(request.getTimeSlot())) {

            boolean conflict = appointmentRepository.existsByDoctorIdAndAppointmentDateAndTimeSlotAndStatusNot(
                    request.getDoctorId(), request.getAppointmentDate(), request.getTimeSlot(), AppointmentStatus.CANCELLED
            );
            if (conflict) {
                throw new AppointmentConflictException("Target doctor is unavailable at " + request.getTimeSlot() + " on " + request.getAppointmentDate());
            }
        }

        appointment.setDoctorId(request.getDoctorId());
        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setTimeSlot(request.getTimeSlot());
        if (request.getType() != null) appointment.setType(request.getType());
        if (request.getNotes() != null) appointment.setNotes(request.getNotes());

        Appointment updated = appointmentRepository.save(appointment);
        auditLogService.log(currentUserId, "APPOINTMENT_RESCHEDULED", "Appointment", updated.getId(), null, updated.getTimeSlot());

        return populateResponse(updated);
    }

    @Override
    @Transactional
    public AppointmentResponse updateStatus(Long id, AppointmentStatus status, Long currentUserId) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + id));

        // When confirming an appointment, strictly verify that ONLY the assigned doctor (or an Admin) can confirm it
        if (status == AppointmentStatus.CONFIRMED) {
            User currentUser = currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null;
            boolean isAssignedDoctor = currentUserId != null && appointment.getDoctorId().equals(currentUserId);
            boolean isAdmin = currentUser != null && currentUser.getRole() == RoleType.ROLE_ADMIN;

            if (!isAssignedDoctor && !isAdmin) {
                User doctor = userRepository.findById(appointment.getDoctorId()).orElse(null);
                String docName = doctor != null ? doctor.getFullName() : "the assigned doctor";
                throw new UnauthorizedAccessException(
                        "Permission Denied: Only " + docName + " can confirm this appointment. Status remains SCHEDULED until approved by the doctor."
                );
            }
        }

        AppointmentStatus oldStatus = appointment.getStatus();
        appointment.setStatus(status);
        Appointment updated = appointmentRepository.save(appointment);

        auditLogService.log(currentUserId, "APPOINTMENT_STATUS_CHANGED", "Appointment", id, oldStatus.name(), status.name());

        if (oldStatus != status) {
            triggerStatusChangeNotifications(updated, status);
        }

        return populateResponse(updated);
    }

    @Override
    @Transactional
    public void cancelAppointment(Long id, Long currentUserId) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + id));

        AppointmentStatus oldStatus = appointment.getStatus();
        appointment.setStatus(AppointmentStatus.CANCELLED);
        Appointment saved = appointmentRepository.save(appointment);
        auditLogService.log(currentUserId, "APPOINTMENT_CANCELLED", "Appointment", id, null, "CANCELLED");

        if (oldStatus != AppointmentStatus.CANCELLED) {
            triggerStatusChangeNotifications(saved, AppointmentStatus.CANCELLED);
        }
    }

    private void triggerStatusChangeNotifications(Appointment appointment, AppointmentStatus status) {
        Patient patient = patientRepository.findById(appointment.getPatientId()).orElse(null);
        User doctor = userRepository.findById(appointment.getDoctorId()).orElse(null);

        String patientName = patient != null ? patient.getName() : "Patient #" + appointment.getPatientId();
        String doctorName = doctor != null 
                ? (doctor.getFullName().startsWith("Dr.") ? doctor.getFullName() : "Dr. " + doctor.getFullName()) 
                : "Assigned Doctor";
        String dateSlotStr = appointment.getAppointmentDate() + " (" + appointment.getTimeSlot() + ")";

        if (status == AppointmentStatus.CONFIRMED) {
            // 1. In-app notification to assigned Doctor
            notificationService.sendNotification(
                    appointment.getDoctorId(),
                    "Appointment confirmed: " + patientName + " on " + dateSlotStr,
                    NotificationType.APPOINTMENT_CONFIRMED,
                    Priority.MEDIUM
            );

            // 2. Notify Patient (FR10 - in-app and simulated email/SMS channels)
            if (patient != null && patient.getUserId() != null) {
                notificationService.sendNotification(
                        patient.getUserId(),
                        "Your appointment with " + doctorName + " on " + dateSlotStr + " is confirmed.",
                        NotificationType.APPOINTMENT_CONFIRMED,
                        Priority.MEDIUM
                );
            }
        } else if (status == AppointmentStatus.CANCELLED) {
            // In-app notification to assigned Doctor
            notificationService.sendNotification(
                    appointment.getDoctorId(),
                    "Appointment cancelled: " + patientName + " on " + dateSlotStr,
                    NotificationType.APPOINTMENT_CANCELLED,
                    Priority.MEDIUM
            );

            // Notify Patient if user account exists
            if (patient != null && patient.getUserId() != null) {
                notificationService.sendNotification(
                        patient.getUserId(),
                        "Your appointment with " + doctorName + " on " + dateSlotStr + " has been cancelled.",
                        NotificationType.APPOINTMENT_CANCELLED,
                        Priority.MEDIUM
                );
            }
        } else if (status == AppointmentStatus.NO_SHOW) {
            // In-app notification to assigned Doctor
            notificationService.sendNotification(
                    appointment.getDoctorId(),
                    "Appointment marked as No-Show: " + patientName + " on " + dateSlotStr,
                    NotificationType.APPOINTMENT_NO_SHOW,
                    Priority.MEDIUM
            );
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AvailableSlotResponse> getAvailableSlots(Long doctorId, LocalDate date) {
        List<Appointment> bookedAppointments = appointmentRepository.findByDoctorIdAndAppointmentDate(doctorId, date);
        Set<String> bookedSlots = bookedAppointments.stream()
                .filter(a -> a.getStatus() != AppointmentStatus.CANCELLED)
                .map(Appointment::getTimeSlot)
                .collect(Collectors.toSet());

        return STANDARD_SLOTS.stream()
                .map(slot -> AvailableSlotResponse.builder()
                        .timeSlot(slot)
                        .available(!bookedSlots.contains(slot))
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppointmentResponse> filterAppointments(Long doctorId, LocalDate date, AppointmentStatus status) {
        return filterAppointments(doctorId, date, status, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppointmentResponse> filterAppointments(Long doctorId, LocalDate date, AppointmentStatus status, UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatient(principal);
            if (myPatient == null) return Collections.emptyList();
            return appointmentRepository.findByPatientId(myPatient.getId()).stream()
                    .filter(a -> doctorId == null || a.getDoctorId().equals(doctorId))
                    .filter(a -> date == null || a.getAppointmentDate().equals(date))
                    .filter(a -> status == null || a.getStatus() == status)
                    .sorted(Comparator.comparing(Appointment::getAppointmentDate).reversed()
                            .thenComparing(Appointment::getTimeSlot, Comparator.nullsLast(Comparator.naturalOrder())))
                    .map(this::populateResponse)
                    .collect(Collectors.toList());
        }

        Long targetDocId = doctorId;
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            targetDocId = principal.getId();
        }

        return appointmentRepository.filterAppointments(targetDocId, date, status).stream()
                .map(this::populateResponse)
                .collect(Collectors.toList());
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

    @Override
    @Transactional(readOnly = true)
    public long getTotalAppointmentsCount() {
        return appointmentRepository.count();
    }

    @Override
    @Transactional(readOnly = true)
    public long getTodayAppointmentsCount() {
        return appointmentRepository.filterAppointments(null, LocalDate.now(), null).size();
    }

    @Override
    @Transactional
    public ConsultationResponse completeConsultation(Long appointmentId, ConsultationRequest request, UserPrincipal principal) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + appointmentId));

        if (principal == null || principal.getRole() != RoleType.ROLE_DOCTOR) {
            throw new UnauthorizedAccessException("Access denied: Consultations can only be conducted by doctors.");
        }

        if (!principal.getId().equals(appointment.getDoctorId())) {
            throw new UnauthorizedAccessException("Access denied: You can only complete consultations for your own appointments.");
        }

        Patient patient = patientRepository.findById(appointment.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + appointment.getPatientId()));
        User doctor = userRepository.findById(appointment.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + appointment.getDoctorId()));

        // 1. Create Medical Record (SOAP structure)
        String notes = request.getClinicalNotes();
        if (request.getClinicalObservations() != null && !request.getClinicalObservations().isBlank()) {
            notes = (notes == null || notes.isBlank())
                    ? "Clinical Observations: " + request.getClinicalObservations()
                    : "Clinical Observations: " + request.getClinicalObservations() + "\n\n" + notes;
        }

        MedicalRecord record = MedicalRecord.builder()
                .patientId(patient.getId())
                .doctorId(doctor.getId())
                .visitDate(LocalDate.now())
                .chiefComplaint(request.getChiefComplaint())
                .diagnosis(request.getDiagnosis())
                .icdCode(request.getIcdCode())
                .treatment(request.getTreatmentPlan())
                .notes(notes)
                .followUpDate(request.getFollowUpDate())
                .build();

        MedicalRecord savedRecord = medicalRecordRepository.save(record);

        // 2. Prescribe medications if provided
        List<PrescriptionResponse> prescriptionResponses = new ArrayList<>();
        if (request.getPrescriptions() != null && !request.getPrescriptions().isEmpty()) {
            Long firstPrescId = null;
            for (ConsultationPrescriptionItem item : request.getPrescriptions()) {
                if (item.getMedicationName() != null && !item.getMedicationName().isBlank()) {
                    Prescription prescription = Prescription.builder()
                            .patientId(patient.getId())
                            .doctorId(doctor.getId())
                            .medicalRecordId(savedRecord.getId())
                            .medicationName(item.getMedicationName().trim())
                            .dosage(item.getDosage() != null ? item.getDosage().trim() : "Standard")
                            .frequency(item.getFrequency() != null ? item.getFrequency().trim() : "Once daily")
                            .duration(item.getDuration() != null ? item.getDuration().trim() : "5 days")
                            .route(item.getRoute() != null ? item.getRoute().trim() : "Oral")
                            .dispensingStatus(DispensingStatus.PENDING)
                            .prescriptionDate(LocalDate.now())
                            .build();
                    Prescription savedPresc = prescriptionRepository.save(prescription);
                    if (firstPrescId == null) {
                        firstPrescId = savedPresc.getId();
                    }
                    prescriptionResponses.add(PrescriptionResponse.builder()
                            .id(savedPresc.getId())
                            .patientId(patient.getId())
                            .patientName(patient.getName())
                            .patientNumber(patient.getPatientNumber())
                            .doctorId(doctor.getId())
                            .doctorName(doctor.getFullName())
                            .medicalRecordId(savedRecord.getId())
                            .medicationName(savedPresc.getMedicationName())
                            .dosage(savedPresc.getDosage())
                            .frequency(savedPresc.getFrequency())
                            .duration(savedPresc.getDuration())
                            .route(savedPresc.getRoute())
                            .dispensingStatus(savedPresc.getDispensingStatus())
                            .prescriptionDate(savedPresc.getPrescriptionDate())
                            .build());
                }
            }
            if (firstPrescId != null) {
                savedRecord.setPrescriptionId(firstPrescId);
                medicalRecordRepository.save(savedRecord);
            }
        }

        // 3. Order lab tests if provided
        List<LabOrderResponse> labOrderResponses = new ArrayList<>();
        if (request.getLabOrders() != null && !request.getLabOrders().isEmpty()) {
            for (ConsultationLabItem item : request.getLabOrders()) {
                if (item.getTestName() != null && !item.getTestName().isBlank()) {
                    String code = (item.getTestCode() != null && !item.getTestCode().isBlank())
                            ? item.getTestCode().trim()
                            : item.getTestName().toUpperCase().replaceAll("[^A-Z0-9]", "_");
                    LabOrder labOrder = LabOrder.builder()
                            .patientId(patient.getId())
                            .doctorId(doctor.getId())
                            .testName(item.getTestName().trim())
                            .testCode(code)
                            .specimenType(item.getSpecimenType() != null ? item.getSpecimenType() : SpecimenType.BLOOD)
                            .status(LabOrderStatus.ORDERED)
                            .orderedDate(LocalDateTime.now())
                            .build();
                    LabOrder savedLab = labOrderRepository.save(labOrder);
                    labOrderResponses.add(LabOrderResponse.builder()
                            .id(savedLab.getId())
                            .patientId(patient.getId())
                            .patientName(patient.getName())
                            .patientNumber(patient.getPatientNumber())
                            .doctorId(doctor.getId())
                            .doctorName(doctor.getFullName())
                            .testName(savedLab.getTestName())
                            .testCode(savedLab.getTestCode())
                            .specimenType(savedLab.getSpecimenType())
                            .status(savedLab.getStatus())
                            .orderedDate(savedLab.getOrderedDate())
                            .build());
                }
            }
        }

        // 4. Inpatient Admission Order if requested
        Long admissionOrderId = null;
        String admissionOrderStatus = null;
        if (request.getAdmissionOrder() != null && (request.getAdmissionOrder().getRecommendedWardType() != null || (request.getAdmissionOrder().getNotes() != null && !request.getAdmissionOrder().getNotes().isBlank()))) {
            AdmissionOrderRequest admissionReq = AdmissionOrderRequest.builder()
                    .patientId(patient.getId())
                    .doctorId(doctor.getId())
                    .diagnosis(request.getDiagnosis())
                    .recommendedWardType(request.getAdmissionOrder().getRecommendedWardType())
                    .priority(request.getAdmissionOrder().getPriority() != null ? request.getAdmissionOrder().getPriority() : Priority.MEDIUM)
                    .notes(request.getAdmissionOrder().getNotes())
                    .build();
            AdmissionOrderResponse admResp = wardBedService.createAdmissionOrder(admissionReq, principal);
            admissionOrderId = admResp.getId();
            admissionOrderStatus = admResp.getStatus() != null ? admResp.getStatus().name() : "ORDERED";
        }

        // 4.5. Doctor-examined Outpatient Vital Signs (saved to vital_signs table)
        if (request.getVitals() != null) {
            ConsultationVitals v = request.getVitals();
            boolean hasAnyVital = (v.getBloodPressure() != null && !v.getBloodPressure().isBlank())
                    || v.getPulse() != null
                    || v.getTemperature() != null
                    || v.getRespiratoryRate() != null
                    || v.getOxygenSaturation() != null;
            if (hasAnyVital) {
                Integer systolic = v.getSystolic();
                Integer diastolic = v.getDiastolic();
                if ((systolic == null || diastolic == null) && v.getBloodPressure() != null && v.getBloodPressure().contains("/")) {
                    try {
                        String[] parts = v.getBloodPressure().trim().split("/");
                        systolic = Integer.parseInt(parts[0].trim());
                        diastolic = Integer.parseInt(parts[1].trim());
                    } catch (Exception ignored) {}
                }

                boolean isAlert = false;
                String alertSeverity = "NORMAL";
                if (v.getOxygenSaturation() != null && v.getOxygenSaturation() < 92.0) {
                    isAlert = true;
                    alertSeverity = "CRITICAL";
                }
                if (v.getTemperature() != null && (v.getTemperature() >= 102.0 || v.getTemperature() < 95.0)) {
                    isAlert = true;
                    alertSeverity = "CRITICAL";
                }
                if (systolic != null && (systolic >= 180 || (diastolic != null && diastolic >= 120))) {
                    isAlert = true;
                    alertSeverity = "CRITICAL";
                } else if (systolic != null && (systolic >= 140 || (diastolic != null && diastolic >= 90))) {
                    if (!isAlert) { isAlert = true; alertSeverity = "WARNING"; }
                }
                if (v.getPulse() != null && (v.getPulse() >= 120 || v.getPulse() < 50)) {
                    isAlert = true;
                    alertSeverity = "CRITICAL";
                }

                VitalSign doctorVital = VitalSign.builder()
                        .patientId(patient.getId())
                        .recordedBy(doctor.getId())
                        .bloodPressure(v.getBloodPressure())
                        .systolic(systolic)
                        .diastolic(diastolic)
                        .pulse(v.getPulse())
                        .temperature(v.getTemperature())
                        .respiratoryRate(v.getRespiratoryRate())
                        .oxygenSaturation(v.getOxygenSaturation())
                        .notes("Outpatient vital signs examined and recorded directly by attending physician Dr. " + doctor.getFullName())
                        .isAlert(isAlert)
                        .alertSeverity(alertSeverity)
                        .recordedAt(LocalDateTime.now())
                        .build();
                vitalSignRepository.save(doctorVital);
            }
        }

        // 5. Update Appointment to COMPLETED
        appointment.setStatus(AppointmentStatus.COMPLETED);
        if (request.getFollowUpDate() != null) {
            appointment.setFollowUpDate(request.getFollowUpDate());
        }
        appointmentRepository.save(appointment);

        // 6. Audit Logging
        Long currentUserId = principal != null ? principal.getId() : doctor.getId();
        auditLogService.log(currentUserId, "CONSULTATION_COMPLETED", "Appointment", appointment.getId(),
                "SCHEDULED", "Consultation completed for " + patient.getName() + " by Dr. " + doctor.getFullName() + ". Diagnosis: " + request.getDiagnosis());

        // 7. In-App Notification to Patient
        if (patient.getUserId() != null) {
            notificationService.sendNotification(patient.getUserId(),
                    "Consultation completed with Dr. " + doctor.getFullName() + ". Diagnosis: " + request.getDiagnosis() + (request.getFollowUpDate() != null ? ". Follow-up scheduled for: " + request.getFollowUpDate() : ""),
                    NotificationType.APPOINTMENT, Priority.MEDIUM);
        }

        return ConsultationResponse.builder()
                .appointmentId(appointment.getId())
                .appointmentStatus(appointment.getStatus().name())
                .medicalRecordId(savedRecord.getId())
                .diagnosis(savedRecord.getDiagnosis())
                .icdCode(savedRecord.getIcdCode())
                .treatmentPlan(savedRecord.getTreatment())
                .followUpDate(request.getFollowUpDate())
                .prescriptions(prescriptionResponses)
                .labOrders(labOrderResponses)
                .admissionOrderId(admissionOrderId)
                .admissionOrderStatus(admissionOrderStatus)
                .completedAt(LocalDateTime.now())
                .message("Consultation completed successfully. Medical record, prescriptions, and lab orders created.")
                .build();
    }

    private AppointmentResponse populateResponse(Appointment a) {
        Patient patient = patientRepository.findById(a.getPatientId()).orElse(null);
        User doctor = userRepository.findById(a.getDoctorId()).orElse(null);
        return toResponse(a, patient, doctor);
    }

    private AppointmentResponse toResponse(Appointment a, Patient patient, User doctor) {
        String deptName = null;
        if (a.getDepartmentId() != null) {
            deptName = departmentRepository.findById(a.getDepartmentId())
                    .map(Department::getName)
                    .orElse(null);
        }
        if (deptName == null && doctor != null && doctor.getDepartmentId() != null) {
            deptName = departmentRepository.findById(doctor.getDepartmentId())
                    .map(Department::getName)
                    .orElse(null);
        }
        if (deptName == null || deptName.equalsIgnoreCase("General")) {
            deptName = "Department of General Medicine";
        }

        String docFullName = doctor != null ? doctor.getFullName() : "Dr. Rajesh Patel";
        if (docFullName == null || docFullName.equals("Attending Physician") || docFullName.equalsIgnoreCase("doctor") || docFullName.equals("Unknown")) {
            docFullName = "Dr. Rajesh Patel";
        }

        return AppointmentResponse.builder()
                .id(a.getId())
                .patientId(a.getPatientId())
                .patientName(patient != null ? patient.getName() : "Unknown")
                .patientNumber(patient != null ? patient.getPatientNumber() : "N/A")
                .doctorId(a.getDoctorId())
                .doctorName(docFullName)
                .departmentId(a.getDepartmentId())
                .departmentName(deptName)
                .appointmentDate(a.getAppointmentDate())
                .timeSlot(a.getTimeSlot())
                .type(a.getType())
                .status(a.getStatus())
                .notes(a.getNotes())
                .queueNumber(a.getQueueNumber())
                .followUpDate(a.getFollowUpDate())
                .billId(a.getBillId())
                .billingStatus(a.getBillingStatus())
                .createdDate(a.getCreatedDate())
                .build();
    }
}
