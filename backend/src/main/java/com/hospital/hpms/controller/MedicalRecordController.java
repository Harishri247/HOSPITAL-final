package com.hospital.hpms.controller;

import com.hospital.hpms.dto.MedicalRecordDto.*;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.MedicalRecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/records")
@RequiredArgsConstructor
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;

    @PostMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<MedicalRecordResponse> createRecord(
            @Valid @RequestBody MedicalRecordRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        MedicalRecordResponse response = medicalRecordService.createRecord(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<MedicalRecordResponse>> getRecordsByPatient(
            @PathVariable Long patientId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(medicalRecordService.getRecordsByPatient(patientId, userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicalRecordResponse> getRecordById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(medicalRecordService.getRecordById(id, userId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<MedicalRecordResponse> updateRecord(
            @PathVariable Long id,
            @Valid @RequestBody MedicalRecordRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(medicalRecordService.updateRecord(id, request, userId));
    }
}
