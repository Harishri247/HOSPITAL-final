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
        Long userId = principal != null ? principal.getId() : null;
        PrescriptionResponse response = prescriptionService.createPrescription(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<PrescriptionResponse>> getPrescriptionsByPatient(
            @PathVariable Long patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(prescriptionService.getPrescriptionsByPatient(patientId, userId));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN', 'DOCTOR')")
    public ResponseEntity<List<PrescriptionResponse>> getPendingPrescriptions() {
        return ResponseEntity.ok(prescriptionService.getPendingPrescriptions());
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
