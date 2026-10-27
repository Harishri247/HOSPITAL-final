package com.hospital.hpms.controller;

import com.hospital.hpms.dto.AdmissionOrderDto.*;
import com.hospital.hpms.dto.WardBedDto.*;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.WardBedService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class WardBedController {

    private final WardBedService wardBedService;

    // Ward endpoints
    @PostMapping("/wards")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WardResponse> createWard(
            @Valid @RequestBody WardRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        WardResponse response = wardBedService.createWard(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/wards")
    public ResponseEntity<List<WardResponse>> getAllWards(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(wardBedService.getAllWards(principal));
    }

    @GetMapping("/wards/{id}")
    public ResponseEntity<WardResponse> getWardById(@PathVariable Long id) {
        return ResponseEntity.ok(wardBedService.getWardById(id));
    }

    // Bed endpoints
    @PostMapping("/beds")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BedResponse> createBed(
            @Valid @RequestBody BedRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        BedResponse response = wardBedService.createBed(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/beds/available")
    public ResponseEntity<List<BedResponse>> getAvailableBeds(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal != null && principal.getRole() == com.hospital.hpms.entity.RoleType.ROLE_DOCTOR) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(wardBedService.getAvailableBeds());
    }

    @GetMapping("/beds/ward/{wardId}")
    public ResponseEntity<List<BedResponse>> getBedsByWard(
            @PathVariable Long wardId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(wardBedService.getBedsByWard(wardId, principal));
    }

    @GetMapping("/beds/doctor-beds")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<List<BedResponse>> getDoctorPatientBeds(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long doctorId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(wardBedService.getDoctorPatientBeds(doctorId));
    }

    @PostMapping("/beds/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<BedResponse> assignBed(
            @Valid @RequestBody BedAssignRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(wardBedService.assignBed(request, userId));
    }

    @PostMapping("/beds/transfer")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<BedResponse> transferBed(
            @Valid @RequestBody BedTransferRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(wardBedService.transferBed(request, userId));
    }

    @PostMapping("/beds/{id}/release")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<BedResponse> releaseBed(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(wardBedService.releaseBed(id, userId));
    }

    @PutMapping("/beds/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<BedResponse> updateBedStatus(
            @PathVariable Long id,
            @RequestParam com.hospital.hpms.entity.BedStatus status,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(wardBedService.updateBedStatus(id, status, userId));
    }

    @GetMapping("/wards/stats")
    public ResponseEntity<Map<String, Object>> getWardStats() {
        return ResponseEntity.ok(Map.of(
                "totalBeds", wardBedService.getTotalBeds(),
                "occupiedBeds", wardBedService.getOccupiedBeds(),
                "occupancyRate", wardBedService.getBedOccupancyRate()
        ));
    }

    // ==========================================
    // Inpatient Admission Orders Endpoints
    // ==========================================

    @PostMapping("/admissions/orders")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<AdmissionOrderResponse> createAdmissionOrder(
            @Valid @RequestBody AdmissionOrderRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        AdmissionOrderResponse response = wardBedService.createAdmissionOrder(request, principal);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/admissions/orders")
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE', 'ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<List<AdmissionOrderResponse>> getAdmissionOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long doctorId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(wardBedService.getAllAdmissionOrders(status, doctorId, principal));
    }

    @GetMapping("/admissions/orders/pending")
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE', 'ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<List<AdmissionOrderResponse>> getPendingAdmissionOrders(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(wardBedService.getPendingAdmissionOrders(principal));
    }

    @GetMapping("/admissions/orders/patient/{patientId}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE', 'ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<List<AdmissionOrderResponse>> getAdmissionOrdersByPatient(
            @PathVariable Long patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(wardBedService.getAdmissionOrdersByPatient(patientId, principal));
    }

    @PostMapping("/admissions/orders/{id}/cancel")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<AdmissionOrderResponse> cancelAdmissionOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(wardBedService.cancelAdmissionOrder(id, principal));
    }
}

