package com.hospital.hpms.dto;

import com.hospital.hpms.entity.DischargeStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class DischargeDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DischargeSummaryRequest {
        private Long admissionOrderId;
        private Long patientId;
        private Long doctorId;
        private String admissionDiagnosis;
        private String finalDiagnosis;
        private String icdCode;
        private String hospitalCourse;
        private String conditionAtDischarge;
        private String dischargeMedications;
        private String dischargeInstructions;
        private LocalDate followUpDate;
        private String followUpInstructions;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DischargeSignRequest {
        @NotBlank(message = "Doctor signature is required")
        private String doctorSignature;

        private String finalDiagnosis;
        private String icdCode;
        private String hospitalCourse;
        private String conditionAtDischarge;
        private String dischargeMedications;
        private String dischargeInstructions;
        private LocalDate followUpDate;
        private String followUpInstructions;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BillingClearanceRequest {
        private Long billId;
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DischargeSummaryResponse {
        private Long id;
        private Long admissionOrderId;
        private Long patientId;
        private String patientName;
        private String patientMrn;
        private Long doctorId;
        private String doctorName;
        private Long wardId;
        private String wardName;
        private Long bedId;
        private String bedNumber;
        private LocalDateTime admissionDate;
        private LocalDateTime dischargeDate;
        private String admissionDiagnosis;
        private String finalDiagnosis;
        private String icdCode;
        private String hospitalCourse;
        private String conditionAtDischarge;
        private String dischargeMedications;
        private String dischargeInstructions;
        private LocalDate followUpDate;
        private String followUpInstructions;
        private String doctorSignature;
        private String signatureHash;
        private LocalDateTime signedAt;
        private Boolean isSigned;
        private Boolean billingCleared;
        private LocalDateTime billingClearedAt;
        private Long billingClearedBy;
        private Long billId;
        private DischargeStatus status;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
