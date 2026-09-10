package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.AppointmentDto.*;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.AppointmentConflictException;
import com.hospital.hpms.exception.ResourceNotFoundException;
import com.hospital.hpms.exception.UnauthorizedAccessException;
import com.hospital.hpms.repository.AppointmentRepository;
import com.hospital.hpms.repository.DepartmentRepository;
import com.hospital.hpms.repository.PatientRepository;
import com.hospital.hpms.repository.UserRepository;
import com.hospital.hpms.service.AppointmentService;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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

    private static final List<String> STANDARD_SLOTS = List.of(
            "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30", "10:30 - 11:00",
            "11:00 - 11:30", "11:30 - 12:00", "13:00 - 13:30", "13:30 - 14:00",
            "14:00 - 14:30", "14:30 - 15:00", "15:00 - 15:30", "15:30 - 16:00"
    );

    @Override
    @Transactional
    public AppointmentResponse bookAppointment(AppointmentRequest request, Long currentUserId) {
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
        return appointmentRepository.filterAppointments(doctorId, date, status).stream()
                .map(this::populateResponse)
                .collect(Collectors.toList());
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

        return AppointmentResponse.builder()
                .id(a.getId())
                .patientId(a.getPatientId())
                .patientName(patient != null ? patient.getName() : "Unknown")
                .patientNumber(patient != null ? patient.getPatientNumber() : "N/A")
                .doctorId(a.getDoctorId())
                .doctorName(doctor != null ? doctor.getFullName() : "Unknown")
                .departmentId(a.getDepartmentId())
                .departmentName(deptName)
                .appointmentDate(a.getAppointmentDate())
                .timeSlot(a.getTimeSlot())
                .type(a.getType())
                .status(a.getStatus())
                .notes(a.getNotes())
                .queueNumber(a.getQueueNumber())
                .createdDate(a.getCreatedDate())
                .build();
    }
}
