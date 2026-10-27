package com.hospital.hpms.dto;

import com.hospital.hpms.dto.PrescriptionDto.PrescriptionResponse;
import com.hospital.hpms.dto.LabDto.LabOrderResponse;
import com.hospital.hpms.entity.Priority;
import com.hospital.hpms.entity.SpecimenType;
import com.hospital.hpms.entity.WardType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class ConsultationDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConsultationRequest {
        @NotBlank(message = "Chief complaint / symptoms is required")
        private String chiefComplaint; // Subjective

        private String clinicalObservations; // Objective (vitals, exam findings)

        @NotBlank(message = "Diagnosis is required")
        private String diagnosis; // Assessment

        private String icdCode; // e.g. J02.0, I10

        private String treatmentPlan; // Plan

        private String clinicalNotes; // Additional instructions

        private LocalDate followUpDate; // Optional follow-up date

        @Valid
        private List<ConsultationPrescriptionItem> prescriptions;

        @Valid
        private List<ConsultationLabItem> labOrders;

        private ConsultationAdmissionItem admissionOrder;

        private ConsultationVitals vitals; // Doctor-examined outpatient vitals
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConsultationVitals {
        private String bloodPressure;
        private Integer systolic;
        private Integer diastolic;
        private Integer pulse;
        private Double temperature;
        private Integer respiratoryRate;
        private Double oxygenSaturation;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConsultationPrescriptionItem {
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
    public static class ConsultationLabItem {
        @NotBlank(message = "Test name is required")
        private String testName;

        private String testCode;

        private SpecimenType specimenType;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConsultationAdmissionItem {
        private WardType recommendedWardType;
        private Priority priority;
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConsultationResponse {
        private Long appointmentId;
        private String appointmentStatus;
        private Long medicalRecordId;
        private String diagnosis;
        private String icdCode;
        private String treatmentPlan;
        private LocalDate followUpDate;
        private List<PrescriptionResponse> prescriptions;
        private List<LabOrderResponse> labOrders;
        private Long admissionOrderId;
        private String admissionOrderStatus;
        private LocalDateTime completedAt;
        private String message;
    }
}
