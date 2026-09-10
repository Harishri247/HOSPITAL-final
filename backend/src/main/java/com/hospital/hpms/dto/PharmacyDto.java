package com.hospital.hpms.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class PharmacyDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MedicineRequest {
        @NotBlank(message = "Medicine name is required")
        private String name;

        private String genericName;

        @NotBlank(message = "Category is required")
        private String category;

        @NotBlank(message = "Dosage form is required")
        private String dosageForm;

        private String strength;

        @NotNull(message = "Stock quantity is required")
        @Min(value = 0, message = "Stock quantity cannot be negative")
        private Integer stockQuantity;

        @NotNull(message = "Minimum threshold is required")
        @Min(value = 1, message = "Minimum threshold must be at least 1")
        private Integer minThreshold;

        @NotNull(message = "Unit price is required")
        @DecimalMin(value = "0.01", message = "Unit price must be positive")
        private BigDecimal unitPrice;

        private LocalDate expiryDate;
        private String batchNumber;
        private String manufacturer;
        private String supplier;
        private Boolean isControlled;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MedicineResponse {
        private Long id;
        private String name;
        private String genericName;
        private String category;
        private String dosageForm;
        private String strength;
        private Integer stockQuantity;
        private Integer minThreshold;
        private Integer reorderLevel;
        private BigDecimal unitPrice;
        private LocalDate expiryDate;
        private String batchNumber;
        private String manufacturer;
        private String supplier;
        private boolean isControlled;
        private boolean isLowStock;
        private LocalDateTime createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StockUpdateRequest {
        @NotNull(message = "Quantity change is required")
        private Integer quantityChange;
        private String remarks;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DispenseMedicationRequest {
        @NotNull(message = "Dispense quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;

        private String batchNumber;

        @NotBlank(message = "Patient or prescription reference is required")
        private String patientReference;

        private String pharmacistName;

        private String supervisorSignoff;

        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ControlledSubstanceLogResponse {
        private Long id;
        private Long medicineId;
        private String medicineName;
        private Integer quantity;
        private String batchNumber;
        private String patientReference;
        private Long pharmacistUserId;
        private String pharmacistName;
        private String supervisorSignoff;
        private String notes;
        private LocalDateTime timestamp;
    }
}
