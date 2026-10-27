package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "discharge_summaries", indexes = {
    @Index(name = "idx_discharge_summary_admission", columnList = "admission_order_id"),
    @Index(name = "idx_discharge_summary_patient", columnList = "patient_id"),
    @Index(name = "idx_discharge_summary_doctor", columnList = "doctor_id"),
    @Index(name = "idx_discharge_summary_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DischargeSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admission_order_id", nullable = false)
    private Long admissionOrderId;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    @Column(name = "ward_id")
    private Long wardId;

    @Column(name = "bed_id")
    private Long bedId;

    @Column(name = "admission_date")
    private LocalDateTime admissionDate;

    @Column(name = "discharge_date")
    private LocalDateTime dischargeDate;

    @Column(name = "admission_diagnosis", length = 500)
    private String admissionDiagnosis;

    @Column(name = "final_diagnosis", length = 500)
    private String finalDiagnosis;

    @Column(name = "icd_code", length = 50)
    private String icdCode;

    @Column(name = "hospital_course", columnDefinition = "TEXT")
    private String hospitalCourse;

    @Column(name = "condition_at_discharge", length = 100)
    private String conditionAtDischarge; // STABLE, IMPROVED, RECOVERED, TRANSFERRED

    @Column(name = "discharge_medications", columnDefinition = "TEXT")
    private String dischargeMedications;

    @Column(name = "discharge_instructions", columnDefinition = "TEXT")
    private String dischargeInstructions;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    @Column(name = "follow_up_instructions", columnDefinition = "TEXT")
    private String followUpInstructions;

    @Column(name = "doctor_signature", length = 255)
    private String doctorSignature;

    @Column(name = "signature_hash", length = 255)
    private String signatureHash;

    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    @Column(name = "is_signed", nullable = false)
    @Builder.Default
    private Boolean isSigned = false;

    @Column(name = "billing_cleared", nullable = false)
    @Builder.Default
    private Boolean billingCleared = false;

    @Column(name = "billing_cleared_at")
    private LocalDateTime billingClearedAt;

    @Column(name = "billing_cleared_by")
    private Long billingClearedBy;

    @Column(name = "bill_id")
    private Long billId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private DischargeStatus status = DischargeStatus.DRAFT;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.isSigned == null) {
            this.isSigned = false;
        }
        if (this.billingCleared == null) {
            this.billingCleared = false;
        }
        if (this.status == null) {
            this.status = DischargeStatus.DRAFT;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
