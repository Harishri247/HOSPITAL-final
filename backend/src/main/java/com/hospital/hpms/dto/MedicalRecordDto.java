package com.hospital.hpms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class MedicalRecordDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MedicalRecordRequest {
        @NotNull(message = "Patient ID is required")
        private Long patientId;

        @NotNull(message = "Doctor ID is required")
        private Long doctorId;

        private LocalDate visitDate;

        @NotBlank(message = "Chief complaint is required")
        private String chiefComplaint;

        @NotBlank(message = "Diagnosis is required")
        private String diagnosis;

        private String icdCode;
        private String treatment;
        private Long prescriptionId;
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MedicalRecordResponse {
        private Long id;
        private Long patientId;
        private String patientName;
        private String patientNumber;
        private Long doctorId;
        private String doctorName;
        private LocalDate visitDate;
        private String chiefComplaint;
        private String diagnosis;
        private String icdCode;
        private String treatment;
        private Long prescriptionId;
        private String notes;
        private LocalDateTime createdAt;
    }
}
