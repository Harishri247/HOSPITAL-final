package com.hospital.hpms.dto;

import com.hospital.hpms.entity.DispensingStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

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
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DispenseRequest {
        @NotNull(message = "Status is required")
        private DispensingStatus status;
        private String notes;
    }
}
