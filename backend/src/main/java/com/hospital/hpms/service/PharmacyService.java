package com.hospital.hpms.service;

import com.hospital.hpms.dto.PharmacyDto.*;

import java.util.List;

public interface PharmacyService {
    MedicineResponse addMedicine(MedicineRequest request, Long currentUserId);
    MedicineResponse updateMedicine(Long id, MedicineRequest request, Long currentUserId);
    MedicineResponse updateStock(Long id, StockUpdateRequest request, Long currentUserId);
    List<MedicineResponse> getAllMedicines();
    List<MedicineResponse> getLowStockMedicines();
    List<MedicineResponse> searchMedicines(String query);
    MedicineResponse getMedicineById(Long id);
    void deleteMedicine(Long id, Long currentUserId);
    MedicineResponse dispenseMedication(Long id, DispenseMedicationRequest request, Long currentUserId);
    List<ControlledSubstanceLogResponse> getControlledSubstanceLogs();
}
