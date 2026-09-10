package com.hospital.hpms.dto;

import com.hospital.hpms.entity.LabOrderStatus;
import com.hospital.hpms.entity.ResultFlag;
import com.hospital.hpms.entity.SpecimenType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

public class LabDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LabOrderRequest {
        @NotNull(message = "Patient ID is required")
        private Long patientId;

        @NotNull(message = "Doctor ID is required")
        private Long doctorId;

        @NotBlank(message = "Test name is required")
        private String testName;

        @NotBlank(message = "Test code is required")
        private String testCode;

        @NotNull(message = "Specimen type is required")
        private SpecimenType specimenType;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LabOrderResponse {
        private Long id;
        private Long patientId;
        private String patientName;
        private String patientNumber;
        private Long doctorId;
        private String doctorName;
        private String testName;
        private String testCode;
        private SpecimenType specimenType;
        private LabOrderStatus status;
        private LocalDateTime orderedDate;
        private LocalDateTime resultDate;
        private LabResultResponse result;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LabResultRequest {
        @NotBlank(message = "Result value is required")
        private String resultValue;

        @NotBlank(message = "Reference range is required")
        private String referenceRange;

        @NotBlank(message = "Unit is required")
        private String unit;

        private ResultFlag flag;

        private String verifiedBy;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LabResultResponse {
        private Long id;
        private Long labOrderId;
        private String resultValue;
        private String referenceRange;
        private String unit;
        private ResultFlag flag;
        private String verifiedBy;
        private LocalDateTime resultDate;
    }
}
