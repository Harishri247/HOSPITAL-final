package com.hospital.hpms.controller;

import com.hospital.hpms.dto.LabDto.*;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.LabService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lab")
@RequiredArgsConstructor
public class LabController {

    private final LabService labService;

    @PostMapping("/orders")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<LabOrderResponse> createOrder(
            @Valid @RequestBody LabOrderRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        LabOrderResponse response = labService.createOrder(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/orders")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'LAB_TECHNICIAN', 'NURSE')")
    public ResponseEntity<List<LabOrderResponse>> getAllOrders(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(labService.getAllOrders(principal));
    }

    @GetMapping("/orders/patient/{patientId}")
    public ResponseEntity<List<LabOrderResponse>> getOrdersByPatient(
            @PathVariable Long patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(labService.getOrdersByPatient(patientId, principal));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<LabOrderResponse> getOrderById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(labService.getOrderById(id, principal));
    }

    @GetMapping("/results/pending")
    @PreAuthorize("hasAnyRole('LAB_TECHNICIAN', 'ADMIN', 'DOCTOR')")
    public ResponseEntity<List<LabOrderResponse>> getPendingOrders(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(labService.getPendingOrders(principal));
    }

    @PutMapping("/results/{orderId}")
    @PreAuthorize("hasAnyRole('LAB_TECHNICIAN', 'ADMIN')")
    public ResponseEntity<LabResultResponse> recordResult(
            @PathVariable Long orderId,
            @Valid @RequestBody LabResultRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(labService.recordResult(orderId, request, userId));
    }

    @GetMapping("/critical-values")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'LAB_TECHNICIAN', 'NURSE')")
    public ResponseEntity<List<LabResultResponse>> getCriticalValues(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(labService.getCriticalValues(principal));
    }
}
