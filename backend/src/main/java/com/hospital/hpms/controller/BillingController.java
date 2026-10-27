package com.hospital.hpms.controller;

import com.hospital.hpms.dto.BillingDto.*;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.BillingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DOCTOR')")
    public ResponseEntity<BillResponse> generateBill(
            @Valid @RequestBody BillGenerateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        BillResponse response = billingService.generateBill(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/consultation-preview/{appointmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DOCTOR')")
    public ResponseEntity<ConsultationBillPreviewResponse> getConsultationBillPreview(
            @PathVariable Long appointmentId
    ) {
        return ResponseEntity.ok(billingService.calculateConsultationBill(appointmentId));
    }

    @PostMapping("/generate-consultation-bill")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<BillResponse> generateConsultationBill(
            @Valid @RequestBody GenerateConsultationBillRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        BillResponse response = billingService.generateConsultationBill(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT')")
    public ResponseEntity<List<BillResponse>> getAllBills(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(billingService.getAllBills(principal));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<BillResponse>> getBillsByPatient(
            @PathVariable Long patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(billingService.getBillsByPatient(patientId, principal));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BillResponse> getBillById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(billingService.getBillById(id, principal));
    }

    @PutMapping("/{id}/payment")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'PATIENT')")
    public ResponseEntity<BillResponse> recordPayment(
            @PathVariable Long id,
            @Valid @RequestBody PaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(billingService.recordPayment(id, request, userId));
    }

    @PostMapping("/insurance-claim")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<BillResponse> submitInsuranceClaim(
            @Valid @RequestBody InsuranceClaimRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(billingService.submitInsuranceClaim(request, userId));
    }

    @GetMapping("/reports")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<BillingReportResponse> getFinancialReports() {
        return ResponseEntity.ok(billingService.getFinancialReport());
    }
}
