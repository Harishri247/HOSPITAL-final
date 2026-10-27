package com.hospital.hpms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class DirectBookingDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DirectBookingRequest {
        @NotBlank(message = "Patient name is required")
        private String fullName;

        @NotBlank(message = "Phone number is required")
        private String phoneNumber;

        private String email;

        @NotNull(message = "Doctor is required")
        private Long doctorId;

        private Long departmentId;

        @NotNull(message = "Appointment date is required")
        private LocalDate appointmentDate;

        @NotBlank(message = "Time slot is required")
        private String timeSlot;

        private String reason;

        private String gender;

        private LocalDate dateOfBirth;

        private String password;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DirectBookingResponse {
        private Long appointmentId;
        private String bookingCode;
        private Long patientId;
        private String patientNumber;
        private String patientName;
        private Long doctorId;
        private String doctorName;
        private Long departmentId;
        private String departmentName;
        private LocalDate appointmentDate;
        private String timeSlot;
        private String status;
        private Integer queueNumber;
        private String notes;
        private String portalUsername;
        private String defaultPassword;
        private boolean customPasswordSet;
        private String phoneNumber;
        private boolean isNewPatient;
        private LocalDateTime createdDate;
    }
}
