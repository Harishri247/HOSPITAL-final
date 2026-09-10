package com.hospital.hpms.dto;

import com.hospital.hpms.entity.BedStatus;
import com.hospital.hpms.entity.BedType;
import com.hospital.hpms.entity.WardType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

public class WardBedDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WardRequest {
        @NotBlank(message = "Ward name is required")
        private String wardName;

        @NotNull(message = "Ward type is required")
        private WardType wardType;

        @NotNull(message = "Total beds is required")
        private Integer totalBeds;

        private Long departmentId;
        private Integer floorNumber;
        private String nurseInCharge;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WardResponse {
        private Long id;
        private String wardName;
        private WardType wardType;
        private Integer totalBeds;
        private Integer occupiedBeds;
        private Integer availableBeds;
        private Long departmentId;
        private Integer floorNumber;
        private String nurseInCharge;
        private LocalDateTime createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BedRequest {
        @NotNull(message = "Ward ID is required")
        private Long wardId;

        @NotBlank(message = "Bed number is required")
        private String bedNumber;

        @NotNull(message = "Bed type is required")
        private BedType bedType;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BedResponse {
        private Long id;
        private Long wardId;
        private String wardName;
        private String bedNumber;
        private BedType bedType;
        private BedStatus status;
        private Long patientId;
        private String patientName;
        private String patientNumber;
        private LocalDateTime assignmentDate;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BedAssignRequest {
        @NotNull(message = "Bed ID is required")
        private Long bedId;

        @NotNull(message = "Patient ID is required")
        private Long patientId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BedTransferRequest {
        @NotNull(message = "Current bed ID is required")
        private Long currentBedId;

        @NotNull(message = "Target bed ID is required")
        private Long targetBedId;
    }
}
