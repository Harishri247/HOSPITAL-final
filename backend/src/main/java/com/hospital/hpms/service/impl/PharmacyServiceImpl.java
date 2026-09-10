package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.PharmacyDto.*;
import com.hospital.hpms.entity.ControlledSubstanceLog;
import com.hospital.hpms.entity.Medicine;
import com.hospital.hpms.entity.User;
import com.hospital.hpms.exception.InvalidOperationException;
import com.hospital.hpms.exception.ResourceNotFoundException;
import com.hospital.hpms.repository.ControlledSubstanceLogRepository;
import com.hospital.hpms.repository.MedicineRepository;
import com.hospital.hpms.repository.UserRepository;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.PharmacyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PharmacyServiceImpl implements PharmacyService {

    private final MedicineRepository medicineRepository;
    private final ControlledSubstanceLogRepository controlledSubstanceLogRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public MedicineResponse addMedicine(MedicineRequest request, Long currentUserId) {
        Medicine medicine = Medicine.builder()
                .name(request.getName())
                .genericName(request.getGenericName())
                .category(request.getCategory())
                .dosageForm(request.getDosageForm())
                .strength(request.getStrength())
                .stockQuantity(request.getStockQuantity())
                .minThreshold(request.getMinThreshold())
                .unitPrice(request.getUnitPrice())
                .expiryDate(request.getExpiryDate())
                .batchNumber(request.getBatchNumber())
                .manufacturer(request.getManufacturer())
                .supplier(request.getSupplier() != null ? request.getSupplier() : (request.getManufacturer() != null ? request.getManufacturer() + " Supply" : "Standard Depot"))
                .isControlled(Boolean.TRUE.equals(request.getIsControlled()))
                .build();

        Medicine saved = medicineRepository.save(medicine);
        auditLogService.log(currentUserId, "MEDICINE_ADDED", "Medicine", saved.getId(), null, saved.getName());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public MedicineResponse updateMedicine(Long id, MedicineRequest request, Long currentUserId) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found: " + id));

        medicine.setName(request.getName());
        medicine.setGenericName(request.getGenericName());
        medicine.setCategory(request.getCategory());
        medicine.setDosageForm(request.getDosageForm());
        medicine.setStrength(request.getStrength());
        medicine.setMinThreshold(request.getMinThreshold());
        medicine.setUnitPrice(request.getUnitPrice());
        medicine.setExpiryDate(request.getExpiryDate());
        medicine.setBatchNumber(request.getBatchNumber());
        medicine.setManufacturer(request.getManufacturer());
        if (request.getSupplier() != null) {
            medicine.setSupplier(request.getSupplier());
        }
        if (request.getIsControlled() != null) {
            medicine.setControlled(request.getIsControlled());
        }

        Medicine updated = medicineRepository.save(medicine);
        auditLogService.log(currentUserId, "MEDICINE_UPDATED", "Medicine", id, null, updated.getName());
        return toResponse(updated);
    }

    @Override
    @Transactional
    public MedicineResponse updateStock(Long id, StockUpdateRequest request, Long currentUserId) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found: " + id));

        int oldStock = medicine.getStockQuantity();
        int newStock = oldStock + request.getQuantityChange();
        if (newStock < 0) {
            throw new InvalidOperationException("Stock reduction cannot exceed available inventory (" + oldStock + " units)");
        }

        medicine.setStockQuantity(newStock);
        Medicine updated = medicineRepository.save(medicine);

        auditLogService.log(currentUserId, "STOCK_ADJUSTED", "Medicine", id,
                "Qty: " + oldStock, "Qty: " + newStock + " (" + request.getRemarks() + ")");

        return toResponse(updated);
    }

    @Override
    @Transactional
    public MedicineResponse dispenseMedication(Long id, DispenseMedicationRequest request, Long currentUserId) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found: " + id));

        if (request.getQuantity() <= 0) {
            throw new InvalidOperationException("Dispense quantity must be greater than zero.");
        }

        int currentStock = medicine.getStockQuantity();
        if (request.getQuantity() > currentStock) {
            throw new InvalidOperationException("Insufficient stock for " + medicine.getName() + ". Available: " + currentStock + " units, requested: " + request.getQuantity());
        }

        // Determine Pharmacist display name
        String pharmacistName = request.getPharmacistName();
        if (currentUserId != null) {
            User user = userRepository.findById(currentUserId).orElse(null);
            if (user != null) {
                pharmacistName = user.getFullName();
            }
        }
        if (pharmacistName == null || pharmacistName.trim().isEmpty()) {
            pharmacistName = "Dispensing Pharmacist";
        }

        String batch = request.getBatchNumber() != null && !request.getBatchNumber().trim().isEmpty() 
                ? request.getBatchNumber().trim() 
                : (medicine.getBatchNumber() != null ? medicine.getBatchNumber() : "BATCH-GEN");

        // Controlled substance compliance verification (FR8)
        if (medicine.isControlled()) {
            if (request.getSupervisorSignoff() == null || request.getSupervisorSignoff().trim().isEmpty()) {
                throw new InvalidOperationException("Controlled Substance Regulation Error: A supervisor authorization / second sign-off PIN is strictly mandatory before dispensing " + medicine.getName());
            }

            // Save dedicated regulatory controlled substance audit log
            ControlledSubstanceLog log = ControlledSubstanceLog.builder()
                    .medicineId(medicine.getId())
                    .medicineName(medicine.getName())
                    .quantity(request.getQuantity())
                    .batchNumber(batch)
                    .patientReference(request.getPatientReference())
                    .pharmacistUserId(currentUserId)
                    .pharmacistName(pharmacistName)
                    .supervisorSignoff(request.getSupervisorSignoff().trim())
                    .notes(request.getNotes())
                    .build();

            controlledSubstanceLogRepository.save(log);

            auditLogService.log(currentUserId, "CONTROLLED_SUBSTANCE_DISPENSED", "Medicine", id,
                    "Stock: " + currentStock,
                    "Dispensed: " + request.getQuantity() + " | Patient: " + request.getPatientReference() + " | Auth: " + request.getSupervisorSignoff());
        } else {
            auditLogService.log(currentUserId, "MEDICINE_DISPENSED", "Medicine", id,
                    "Stock: " + currentStock,
                    "Dispensed: " + request.getQuantity() + " | Patient: " + request.getPatientReference());
        }

        // Decrement stock level
        int newStock = currentStock - request.getQuantity();
        medicine.setStockQuantity(newStock);
        Medicine updated = medicineRepository.save(medicine);

        return toResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ControlledSubstanceLogResponse> getControlledSubstanceLogs() {
        return controlledSubstanceLogRepository.findAllByOrderByTimestampDesc().stream()
                .map(l -> ControlledSubstanceLogResponse.builder()
                        .id(l.getId())
                        .medicineId(l.getMedicineId())
                        .medicineName(l.getMedicineName())
                        .quantity(l.getQuantity())
                        .batchNumber(l.getBatchNumber())
                        .patientReference(l.getPatientReference())
                        .pharmacistUserId(l.getPharmacistUserId())
                        .pharmacistName(l.getPharmacistName())
                        .supervisorSignoff(l.getSupervisorSignoff())
                        .notes(l.getNotes())
                        .timestamp(l.getTimestamp())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineResponse> getAllMedicines() {
        return medicineRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineResponse> getLowStockMedicines() {
        return medicineRepository.findLowStockMedicines().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineResponse> searchMedicines(String query) {
        if (query == null || query.trim().isEmpty()) {
            return getAllMedicines();
        }
        return medicineRepository.searchMedicines(query.trim()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public MedicineResponse getMedicineById(Long id) {
        Medicine m = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found: " + id));
        return toResponse(m);
    }

    @Override
    @Transactional
    public void deleteMedicine(Long id, Long currentUserId) {
        Medicine m = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicine not found: " + id));
        auditLogService.log(currentUserId, "MEDICINE_DELETED", "Medicine", id, m.getName(), null);
        medicineRepository.delete(m);
    }

    private MedicineResponse toResponse(Medicine m) {
        boolean low = m.getStockQuantity() <= m.getMinThreshold();
        return MedicineResponse.builder()
                .id(m.getId())
                .name(m.getName())
                .genericName(m.getGenericName())
                .category(m.getCategory())
                .dosageForm(m.getDosageForm())
                .strength(m.getStrength())
                .stockQuantity(m.getStockQuantity())
                .minThreshold(m.getMinThreshold())
                .reorderLevel(m.getMinThreshold())
                .unitPrice(m.getUnitPrice())
                .expiryDate(m.getExpiryDate())
                .batchNumber(m.getBatchNumber())
                .manufacturer(m.getManufacturer())
                .supplier(m.getSupplier() != null ? m.getSupplier() : (m.getManufacturer() != null ? m.getManufacturer() + " Supply" : "Direct Supply"))
                .isControlled(m.isControlled())
                .isLowStock(low)
                .createdAt(m.getCreatedAt())
                .build();
    }
}
