package com.hospital.hpms.controller;

import com.hospital.hpms.dto.NurseDto.*;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.NurseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/nurse")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('NURSE', 'ADMIN', 'DOCTOR')")
public class NurseController {

    private final NurseService nurseService;

    @GetMapping("/dashboard")
    public ResponseEntity<NurseDashboardResponse> getDashboard(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(nurseService.getDashboardData(principal));
    }

    @GetMapping("/patients")
    public ResponseEntity<List<AssignedWardPatientDto>> getAssignedPatients(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(nurseService.getAssignedPatients(principal));
    }

    @GetMapping("/patients/{patientId}/care-context")
    public ResponseEntity<NursePatientCareContextResponse> getPatientCareContext(
            @PathVariable Long patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(nurseService.getPatientCareContext(patientId, principal));
    }

    @PostMapping("/vitals")
    @PreAuthorize("hasRole('NURSE')")
    public ResponseEntity<VitalSignResponse> recordVitalSigns(
            @Valid @RequestBody VitalSignRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        VitalSignResponse response = nurseService.recordVitalSigns(request, principal);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/vitals/patient/{patientId}")
    public ResponseEntity<List<VitalSignResponse>> getPatientVitals(
            @PathVariable Long patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(nurseService.getPatientVitals(patientId, principal));
    }

    @GetMapping("/vitals/alerts")
    public ResponseEntity<List<VitalSignResponse>> getActiveVitalAlerts(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(nurseService.getActiveVitalAlerts(principal));
    }

    @PostMapping("/vitals/alerts/{id}/respond")
    public ResponseEntity<VitalSignResponse> respondToVitalAlert(
            @PathVariable Long id,
            @RequestBody(required = false) AlertResponseRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(nurseService.respondToVitalAlert(id, request, principal));
    }

    @GetMapping("/medications/schedule")
    public ResponseEntity<List<MedScheduleItemDto>> getMedicationSchedule(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(nurseService.getMedicationSchedule(principal));
    }

    @PostMapping("/medications/administer")
    public ResponseEntity<MedicationAdministrationResponse> administerMedication(
            @Valid @RequestBody MedicationAdministrationRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        MedicationAdministrationResponse response = nurseService.administerMedication(request, principal);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/medications/patient/{patientId}")
    public ResponseEntity<List<MedicationAdministrationResponse>> getPatientMedicationAdministrations(
            @PathVariable Long patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(nurseService.getPatientMedicationAdministrations(patientId, principal));
    }

    @PostMapping("/notes")
    public ResponseEntity<NursingNoteResponse> addNursingNote(
            @Valid @RequestBody NursingNoteRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        NursingNoteResponse response = nurseService.addNursingNote(request, principal);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/notes/patient/{patientId}")
    public ResponseEntity<List<NursingNoteResponse>> getPatientNursingNotes(
            @PathVariable Long patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(nurseService.getPatientNursingNotes(patientId, principal));
    }
}
