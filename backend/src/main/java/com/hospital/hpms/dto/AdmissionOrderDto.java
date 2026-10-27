package com.hospital.hpms.dto;

import com.hospital.hpms.entity.AdmissionOrderStatus;
import com.hospital.hpms.entity.Priority;
import com.hospital.hpms.entity.WardType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

public class AdmissionOrderDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdmissionOrderRequest {
        @NotNull(message = "Patient ID is required")
        private Long patientId;

        private Long doctorId;

        @NotBlank(message = "Clinical diagnosis or reason for admission is required")
        private String diagnosis;

        private WardType recommendedWardType;

        private Priority priority;

        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdmissionOrderResponse {
        private Long id;
        private Long patientId;
        private String patientName;
        private String patientNumber;
        private Long doctorId;
        private String doctorName;
        private String doctorStaffId;
        private String diagnosis;
        private WardType recommendedWardType;
        private Priority priority;
        private AdmissionOrderStatus status;
        private String notes;
        private Long assignedBedId;
        private String assignedBedNumber;
        private Long assignedWardId;
        private String assignedWardName;
        private Long assignedBy;
        private String assignedByName;
        private LocalDateTime orderDate;
        private LocalDateTime admittedDate;
    }
}
