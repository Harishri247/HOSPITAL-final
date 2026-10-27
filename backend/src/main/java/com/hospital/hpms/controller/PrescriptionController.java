package com.hospital.hpms.controller;

import com.hospital.hpms.dto.PrescriptionDto.*;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.PrescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @PostMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<PrescriptionResponse> createPrescription(
            @Valid @RequestBody PrescriptionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        PrescriptionResponse response = prescriptionService.createPrescription(request, principal);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN', 'DOCTOR', 'PATIENT')")
    public ResponseEntity<List<PrescriptionResponse>> getPrescriptions(
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(prescriptionService.getPrescriptions(doctorId, status, principal));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN', 'DOCTOR', 'NURSE', 'PATIENT')")
    public ResponseEntity<List<PrescriptionResponse>> getPrescriptionsByPatient(
            @PathVariable Long patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(prescriptionService.getPrescriptionsByPatient(patientId, principal));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN', 'DOCTOR')")
    public ResponseEntity<List<PrescriptionResponse>> getPendingPrescriptions(
            @RequestParam(required = false) Long doctorId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(prescriptionService.getPendingPrescriptions(doctorId, principal));
    }

    @GetMapping("/{id}/safety-check")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN', 'DOCTOR')")
    public ResponseEntity<PrescriptionSafetyCheckResponse> checkPrescriptionSafety(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(prescriptionService.checkPrescriptionSafety(id, principal));
    }

    @PutMapping("/{id}/dispense")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    public ResponseEntity<PrescriptionResponse> dispensePrescription(
            @PathVariable Long id,
            @Valid @RequestBody DispenseRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(prescriptionService.dispensePrescription(id, request, userId));
    }
}

