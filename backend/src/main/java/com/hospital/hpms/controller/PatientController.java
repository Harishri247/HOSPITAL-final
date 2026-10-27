package com.hospital.hpms.controller;

import com.hospital.hpms.dto.PatientDto.*;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @PostMapping("/register")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DOCTOR')")
    public ResponseEntity<PatientResponse> registerPatient(
            @Valid @RequestBody PatientRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        if (principal != null && principal.getRole() == com.hospital.hpms.entity.RoleType.ROLE_DOCTOR && request.getPrimaryDoctorId() == null) {
            request.setPrimaryDoctorId(principal.getId());
        }
        PatientResponse response = patientService.registerPatient(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/me")
    public ResponseEntity<PatientResponse> getMyProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(patientService.getMyPatientProfile(principal));
    }

    @GetMapping
    public ResponseEntity<List<PatientResponse>> getAllPatients(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(patientService.getAllPatients(principal));
    }

    @GetMapping("/paged")
    public ResponseEntity<Page<PatientResponse>> getPatientsPaged(
            Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(patientService.getPatientsPaged(pageable, principal));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientResponse> getPatientById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(patientService.getPatientById(id, principal));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DOCTOR')")
    public ResponseEntity<PatientResponse> updatePatient(
            @PathVariable Long id,
            @Valid @RequestBody PatientRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(patientService.updatePatient(id, request, userId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deletePatient(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        patientService.deletePatient(id, userId);
        return ResponseEntity.ok(Map.of("message", "Patient deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<List<PatientResponse>> searchPatients(
            @RequestParam(required = false) String query,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(patientService.searchPatients(query, principal));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<Map<String, Object>> getPatientHistory(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(patientService.getPatientHistory(id, principal));
    }

    @PostMapping("/{id}/allocate-nurse")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<PatientResponse> allocateNurse(
            @PathVariable Long id,
            @RequestParam Long nurseId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(patientService.allocateNurse(id, nurseId, principal));
    }
}
