package com.hospital.hpms.dto;

import com.hospital.hpms.entity.DispensingStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class PrescriptionDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PrescriptionRequest {
        @NotNull(message = "Patient ID is required")
        private Long patientId;

        @NotNull(message = "Doctor ID is required")
        private Long doctorId;

        private Long medicalRecordId;

        @NotBlank(message = "Medication name is required")
        private String medicationName;

        @NotBlank(message = "Dosage is required")
        private String dosage;

        @NotBlank(message = "Frequency is required")
        private String frequency;

        @NotBlank(message = "Duration is required")
        private String duration;

        @NotBlank(message = "Route is required")
        private String route;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PrescriptionResponse {
        private Long id;
        private Long patientId;
        private String patientName;
        private String patientNumber;
        private Long doctorId;
        private String doctorName;
        private Long medicalRecordId;
        private String medicationName;
        private String dosage;
        private String frequency;
        private String duration;
        private String route;
        private DispensingStatus dispensingStatus;
        private LocalDate prescriptionDate;
        private Long dispensedBy;
        private String dispensedByName;
        private LocalDateTime dispensedDate;
        private Long medicineId;
        private Integer quantityDispensed;
        private String batchNumber;
        private String pharmacistNotes;
        private Boolean isControlled;
        private Integer stockAvailable;
        private String patientStatus; // INPATIENT or OUTPATIENT
        private Boolean isAdmitted;
        private String bedNumber;
        private String wardName;
        private Long assignedNurseId;
        private String assignedNurseName;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DispenseRequest {
        @NotNull(message = "Status is required")
        private DispensingStatus status;
        private Long medicineId;
        private Integer quantity;
        private String batchNumber;
        private String notes;
        private String supervisorSignoff;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PrescriptionSafetyCheckResponse {
        private Long prescriptionId;
        private String medicationName;
        private String dosage;
        private String frequency;
        private String duration;
        private String route;
        private Long patientId;
        private String patientName;
        private String patientNumber;
        private String doctorName;
        private Long matchedMedicineId;
        private String matchedMedicineName;
        private String genericName;
        private String category;
        private Integer stockQuantity;
        private Integer minThreshold;
        private String stockStatus; // IN_STOCK, LOW_STOCK, OUT_OF_STOCK, NOT_IN_CATALOG
        private String batchNumber;
        private LocalDate expiryDate;
        private boolean isControlled;
        private Integer suggestedQuantity;
        private List<String> safetyAlerts;
        private String patientStatus;
        private Boolean isAdmitted;
        private String bedNumber;
        private String wardName;
        private Long assignedNurseId;
        private String assignedNurseName;
    }
}
