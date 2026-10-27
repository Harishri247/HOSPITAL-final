package com.hospital.hpms.controller;

import com.hospital.hpms.dto.AppointmentDto.*;
import com.hospital.hpms.dto.ConsultationDto.*;
import com.hospital.hpms.entity.AppointmentStatus;
import com.hospital.hpms.entity.RoleType;
import com.hospital.hpms.exception.UnauthorizedAccessException;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'PATIENT')")
    public ResponseEntity<AppointmentResponse> bookAppointment(
            @Valid @RequestBody AppointmentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        AppointmentResponse response = appointmentService.bookAppointment(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> filterAppointments(
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) AppointmentStatus status,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            doctorId = principal.getId();
        }
        return ResponseEntity.ok(appointmentService.filterAppointments(doctorId, date, status, principal));
    }

    @GetMapping("/today")
    public ResponseEntity<List<AppointmentResponse>> getTodayAppointments(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long doctorId = (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) ? principal.getId() : null;
        return ResponseEntity.ok(appointmentService.filterAppointments(doctorId, LocalDate.now(), null, principal));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getAppointmentById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        AppointmentResponse appointment = appointmentService.getAppointmentById(id, principal);
        return ResponseEntity.ok(appointment);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<AppointmentResponse>> getAppointmentsByPatient(
            @PathVariable Long patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(appointmentService.getAppointmentsByPatient(patientId, principal));
    }

    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DOCTOR')")
    public ResponseEntity<List<AppointmentResponse>> getAppointmentsByDoctor(
            @PathVariable Long doctorId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            if (!principal.getId().equals(doctorId)) {
                throw new UnauthorizedAccessException("Access denied: Doctors can only view their own appointments.");
            }
        }
        return ResponseEntity.ok(appointmentService.getAppointmentsByDoctor(doctorId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppointmentResponse> updateAppointment(
            @PathVariable Long id,
            @Valid @RequestBody AppointmentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(appointmentService.updateAppointment(id, request, userId));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<AppointmentResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam AppointmentStatus status,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(appointmentService.updateStatus(id, status, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> cancelAppointment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        appointmentService.cancelAppointment(id, userId);
        return ResponseEntity.ok(Map.of("message", "Appointment cancelled successfully"));
    }

    @GetMapping("/available-slots")
    public ResponseEntity<List<AvailableSlotResponse>> getAvailableSlots(
            @RequestParam Long doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(appointmentService.getAvailableSlots(doctorId, date));
    }

    @PostMapping("/{id}/consultation")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ConsultationResponse> completeConsultation(
            @PathVariable Long id,
            @Valid @RequestBody ConsultationRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(appointmentService.completeConsultation(id, request, principal));
    }
}
