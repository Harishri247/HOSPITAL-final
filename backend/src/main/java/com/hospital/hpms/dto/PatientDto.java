package com.hospital.hpms.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class PatientDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PatientRequest {
        @NotBlank(message = "Patient name is required")
        @Pattern(regexp = "^[a-zA-Z\\s]+$", message = "Patient name must contain only alphabetic characters and spaces")
        @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
        private String name;

        @NotNull(message = "Date of birth is required")
        @Past(message = "Date of birth must be a past date")
        private LocalDate dateOfBirth;

        @NotBlank(message = "Gender is required")
        private String gender;

        private String bloodGroup;

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^\\d{10}$", message = "Phone number must be exactly 10 digits")
        private String phoneNumber;

        private String address;
        private String emergencyContact;
        private String insuranceId;
        private String status;
        private Long userId;
        private Long primaryDoctorId;
        private Long assignedNurseId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PatientResponse {
        private Long id;
        private String patientNumber;
        private String name;
        private LocalDate dateOfBirth;
        private Integer age;
        private String gender;
        private String bloodGroup;
        private String phoneNumber;
        private String address;
        private String emergencyContact;
        private String insuranceId;
        private LocalDate registrationDate;
        private String status;
        private Long userId;
        private Long primaryDoctorId;
        private String primaryDoctorName;
        private Long assignedNurseId;
        private String assignedNurseName;
        private String bedNumber;
        private String wardName;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
