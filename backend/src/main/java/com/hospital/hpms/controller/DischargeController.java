package com.hospital.hpms.controller;

import com.hospital.hpms.dto.DischargeDto.*;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.DischargeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/discharge")
@RequiredArgsConstructor
public class DischargeController {

    private final DischargeService dischargeService;

    @PostMapping("/draft")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<DischargeSummaryResponse> saveDraft(
            @Valid @RequestBody DischargeSummaryRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        DischargeSummaryResponse response = dischargeService.saveOrUpdateDraft(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/{id}/sign")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<DischargeSummaryResponse> signSummary(
            @PathVariable Long id,
            @Valid @RequestBody DischargeSignRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        DischargeSummaryResponse response = dischargeService.signDischargeSummary(id, request, userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/clear-billing")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DOCTOR')")
    public ResponseEntity<DischargeSummaryResponse> clearBilling(
            @PathVariable Long id,
            @RequestBody(required = false) BillingClearanceRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        DischargeSummaryResponse response = dischargeService.clearBilling(id, request, userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'NURSE', 'RECEPTIONIST')")
    public ResponseEntity<DischargeSummaryResponse> completeDischarge(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        DischargeSummaryResponse response = dischargeService.completeDischarge(id, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DischargeSummaryResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(dischargeService.getById(id));
    }

    @GetMapping("/admission/{admissionOrderId}")
    public ResponseEntity<DischargeSummaryResponse> getByAdmission(@PathVariable Long admissionOrderId) {
        DischargeSummaryResponse response = dischargeService.getByAdmissionOrderId(admissionOrderId);
        if (response == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<DischargeSummaryResponse>> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(dischargeService.getByPatientId(patientId));
    }

    @GetMapping
    public ResponseEntity<List<DischargeSummaryResponse>> getAllDischarges() {
        return ResponseEntity.ok(dischargeService.getAllDischarges());
    }
}
