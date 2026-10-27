package com.hospital.hpms.dto;

import com.hospital.hpms.entity.AppointmentStatus;
import com.hospital.hpms.entity.AppointmentType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class AppointmentDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AppointmentRequest {
        @NotNull(message = "Patient ID is required")
        private Long patientId;

        @NotNull(message = "Doctor ID is required")
        private Long doctorId;

        private Long departmentId;

        @NotNull(message = "Appointment date is required")
        private LocalDate appointmentDate;

        @NotNull(message = "Time slot is required")
        private String timeSlot;

        private AppointmentType type;
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AppointmentResponse {
        private Long id;
        private Long patientId;
        private String patientName;
        private String patientNumber;
        private Long doctorId;
        private String doctorName;
        private Long departmentId;
        private String departmentName;
        private LocalDate appointmentDate;
        private String timeSlot;
        private AppointmentType type;
        private AppointmentStatus status;
        private String notes;
        private Integer queueNumber;
        private LocalDate followUpDate;
        private Long billId;
        private String billingStatus;
        private LocalDateTime createdDate;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AvailableSlotResponse {
        private String timeSlot;
        private boolean available;
    }
}
