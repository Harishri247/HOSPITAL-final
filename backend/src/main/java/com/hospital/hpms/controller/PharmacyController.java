package com.hospital.hpms.controller;

import com.hospital.hpms.dto.PharmacyDto.*;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.PharmacyService;
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
@RequestMapping("/api/pharmacy")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
public class PharmacyController {

    private final PharmacyService pharmacyService;

    @GetMapping("/medicines")
    public ResponseEntity<List<MedicineResponse>> getAllMedicines() {
        return ResponseEntity.ok(pharmacyService.getAllMedicines());
    }

    @PostMapping("/medicines")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    public ResponseEntity<MedicineResponse> addMedicine(
            @Valid @RequestBody MedicineRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        MedicineResponse response = pharmacyService.addMedicine(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/medicines/{id}")
    public ResponseEntity<MedicineResponse> getMedicineById(@PathVariable Long id) {
        return ResponseEntity.ok(pharmacyService.getMedicineById(id));
    }

    @PutMapping("/medicines/{id}")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    public ResponseEntity<MedicineResponse> updateMedicine(
            @PathVariable Long id,
            @Valid @RequestBody MedicineRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(pharmacyService.updateMedicine(id, request, userId));
    }

    @PutMapping("/medicines/{id}/stock")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    public ResponseEntity<MedicineResponse> updateStock(
            @PathVariable Long id,
            @Valid @RequestBody StockUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(pharmacyService.updateStock(id, request, userId));
    }

    @DeleteMapping("/medicines/{id}")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    public ResponseEntity<Map<String, String>> deleteMedicine(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        pharmacyService.deleteMedicine(id, userId);
        return ResponseEntity.ok(Map.of("message", "Medicine deleted successfully"));
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    public ResponseEntity<List<MedicineResponse>> getLowStockMedicines() {
        return ResponseEntity.ok(pharmacyService.getLowStockMedicines());
    }

    @GetMapping("/search")
    public ResponseEntity<List<MedicineResponse>> searchMedicines(@RequestParam(required = false) String query) {
        return ResponseEntity.ok(pharmacyService.searchMedicines(query));
    }

    @PostMapping("/medicines/{id}/dispense")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    public ResponseEntity<MedicineResponse> dispenseMedicine(
            @PathVariable Long id,
            @Valid @RequestBody DispenseMedicationRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(pharmacyService.dispenseMedication(id, request, userId));
    }

    @GetMapping("/controlled-logs")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    public ResponseEntity<List<ControlledSubstanceLogResponse>> getControlledLogs() {
        return ResponseEntity.ok(pharmacyService.getControlledSubstanceLogs());
    }
}
