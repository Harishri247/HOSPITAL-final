package com.hospital.hpms.dto;

import com.hospital.hpms.dto.AdmissionOrderDto.AdmissionOrderResponse;
import com.hospital.hpms.dto.LabDto.LabOrderResponse;
import com.hospital.hpms.dto.MedicalRecordDto.MedicalRecordResponse;
import com.hospital.hpms.dto.PatientDto.PatientResponse;
import com.hospital.hpms.dto.PrescriptionDto.PrescriptionResponse;
import com.hospital.hpms.dto.WardBedDto.BedResponse;
import com.hospital.hpms.dto.WardBedDto.WardResponse;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

public class NurseDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VitalSignRequest {
        @NotNull(message = "Patient ID is required")
        private Long patientId;
        private Double temperature;
        private String bloodPressure;
        private Integer systolic;
        private Integer diastolic;
        private Integer pulse;
        private Integer respiratoryRate;
        private Double oxygenSaturation;
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VitalSignResponse {
        private Long id;
        private Long patientId;
        private String patientName;
        private String patientNumber;
        private String bedNumber;
        private String wardName;
        private Long recordedBy;
        private String recordedByName;
        private Double temperature;
        private String bloodPressure;
        private Integer systolic;
        private Integer diastolic;
        private Integer pulse;
        private Integer respiratoryRate;
        private Double oxygenSaturation;
        private String notes;
        private Boolean isAlert;
        private String alertSeverity;
        private String alertMessage;
        private Boolean alertAcknowledged;
        private Long acknowledgedBy;
        private String acknowledgedByName;
        private LocalDateTime acknowledgedAt;
        private String responseNotes;
        private LocalDateTime recordedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AlertResponseRequest {
        private String responseNotes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MedicationAdministrationRequest {
        private Long prescriptionId;
        @NotNull(message = "Patient ID is required")
        private Long patientId;
        private String scheduledTime;
        private String status; // GIVEN, HELD, REFUSED
        private String dosageGiven;
        private String route;
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MedicationAdministrationResponse {
        private Long id;
        private Long prescriptionId;
        private String medicationName;
        private Long patientId;
        private String patientName;
        private Long administeredBy;
        private String administeredByName;
        private String scheduledTime;
        private LocalDateTime administeredAt;
        private String status;
        private String dosageGiven;
        private String route;
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MedScheduleItemDto {
        private Long prescriptionId;
        private Long patientId;
        private String patientName;
        private String patientNumber;
        private String bedNumber;
        private String wardName;
        private String medicationName;
        private String dosage;
        private String route;
        private String frequency;
        private String scheduledSlot; // e.g. "08:00 AM", "01:00 PM", "08:00 PM"
        private Boolean isGivenToday;
        private LocalDateTime lastGivenAt;
        private String lastGivenByName;
        private String dispensingStatus;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NursingNoteRequest {
        @NotNull(message = "Patient ID is required")
        private Long patientId;
        @NotNull(message = "Activity type is required")
        private String activityType; // CHECK_IN, VITALS_RECORDED, MEDICATION_ADMINISTERED, CONDITION_OBSERVED, CARE_PROVIDED, ALERT_RESPONSE, DOCTOR_ESCALATED
        @NotNull(message = "Note content is required")
        private String note;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NursingNoteResponse {
        private Long id;
        private Long patientId;
        private String patientName;
        private Long nurseId;
        private String nurseName;
        private String activityType;
        private String note;
        private LocalDateTime recordedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AssignedWardPatientDto {
        private Long patientId;
        private String patientNumber;
        private String patientName;
        private Integer age;
        private String gender;
        private String bloodGroup;
        private Long bedId;
        private String bedNumber;
        private Long wardId;
        private String wardName;
        private LocalDateTime admissionDate;
        private String diagnosis;
        private Long attendingDoctorId;
        private String attendingDoctorName;
        private VitalSignResponse latestVitals;
        private Boolean vitalsCheckedByNurse;
        private Boolean hasActiveAlert;
        private String activeAlertSeverity;
        private String activeAlertMessage;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NurseDashboardResponse {
        private int assignedPatientsCount;
        private int occupiedWardBeds;
        private int totalWardBeds;
        private int activeAlertsCount;
        private int pendingDosesTodayCount;
        private int givenDosesTodayCount;
        private List<AssignedWardPatientDto> assignedPatients;
        private List<VitalSignResponse> activeAlerts;
        private List<MedScheduleItemDto> medicationSchedule;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NursePatientCareContextResponse {
        private PatientResponse patient;
        private BedResponse bed;
        private WardResponse ward;
        private AdmissionOrderResponse admissionOrder;
        private VitalSignResponse latestVitals;
        private Boolean vitalsCheckedByNurse;
        private List<VitalSignResponse> vitalsHistory;
        private List<PrescriptionResponse> prescriptions;
        private List<MedicationAdministrationResponse> medicationAdministrations;
        private List<NursingNoteResponse> nursingNotes;
        private List<LabOrderResponse> labOrders;
        private List<MedicalRecordResponse> medicalRecords;
    }
}
