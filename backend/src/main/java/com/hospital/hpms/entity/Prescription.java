package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "prescriptions", indexes = {
    @Index(name = "idx_presc_patient", columnList = "patient_id"),
    @Index(name = "idx_presc_doctor", columnList = "doctor_id"),
    @Index(name = "idx_presc_status", columnList = "dispensing_status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    @Column(name = "medical_record_id")
    private Long medicalRecordId;

    @Column(name = "medication_name", nullable = false, length = 150)
    private String medicationName;

    @Column(name = "dosage", nullable = false, length = 50)
    private String dosage;

    @Column(name = "frequency", nullable = false, length = 50)
    private String frequency;

    @Column(name = "duration", nullable = false, length = 50)
    private String duration;

    @Column(name = "route", nullable = false, length = 50)
    private String route;

    @Enumerated(EnumType.STRING)
    @Column(name = "dispensing_status", nullable = false, length = 30)
    @Builder.Default
    private DispensingStatus dispensingStatus = DispensingStatus.PENDING;

    @Column(name = "prescription_date", nullable = false)
    private LocalDate prescriptionDate;

    @Column(name = "dispensed_by")
    private Long dispensedBy;

    @Column(name = "dispensed_date")
    private LocalDateTime dispensedDate;

    @PrePersist
    protected void onCreate() {
        if (this.prescriptionDate == null) {
            this.prescriptionDate = LocalDate.now();
        }
        if (this.dispensingStatus == null) {
            this.dispensingStatus = DispensingStatus.PENDING;
        }
    }
}
