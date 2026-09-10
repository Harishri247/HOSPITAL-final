package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "medical_records", indexes = {
    @Index(name = "idx_record_patient", columnList = "patient_id"),
    @Index(name = "idx_record_doctor", columnList = "doctor_id"),
    @Index(name = "idx_record_date", columnList = "visit_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    @Column(name = "visit_date", nullable = false)
    private LocalDate visitDate;

    @Column(name = "chief_complaint", nullable = false, length = 500)
    private String chiefComplaint;

    @Column(name = "diagnosis", nullable = false, length = 1000)
    private String diagnosis;

    @Column(name = "icd_code", length = 30)
    private String icdCode;

    @Column(name = "treatment", length = 2000)
    private String treatment;

    @Column(name = "prescription_id")
    private Long prescriptionId;

    @Column(name = "notes", length = 2000)
    private String notes;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.visitDate == null) {
            this.visitDate = LocalDate.now();
        }
    }
}
