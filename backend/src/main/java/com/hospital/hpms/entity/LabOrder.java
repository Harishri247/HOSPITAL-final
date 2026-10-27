package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lab_orders", indexes = {
    @Index(name = "idx_lab_order_patient", columnList = "patient_id"),
    @Index(name = "idx_lab_order_doctor", columnList = "doctor_id"),
    @Index(name = "idx_lab_order_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    @Column(name = "test_name", nullable = false, length = 150)
    private String testName;

    @Column(name = "test_code", nullable = false, length = 30)
    private String testCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "specimen_type", nullable = false, length = 30)
    private SpecimenType specimenType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private LabOrderStatus status = LabOrderStatus.ORDERED;

    @Column(name = "ordered_date", nullable = false)
    private LocalDateTime orderedDate;

    @Column(name = "result_date")
    private LocalDateTime resultDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 20)
    @Builder.Default
    private Priority priority = Priority.ROUTINE;

    @Column(name = "clinical_notes", columnDefinition = "TEXT")
    private String clinicalNotes;

    @Column(name = "received_date")
    private LocalDateTime receivedDate;

    @Column(name = "received_by", length = 100)
    private String receivedBy;

    @Column(name = "specimen_barcode", length = 50)
    private String specimenBarcode;

    @Column(name = "specimen_collected_date")
    private LocalDateTime specimenCollectedDate;

    @Column(name = "specimen_notes", columnDefinition = "TEXT")
    private String specimenNotes;

    @Column(name = "test_started_date")
    private LocalDateTime testStartedDate;

    @Column(name = "testing_equipment", length = 100)
    private String testingEquipment;

    @Column(name = "reviewed_date")
    private LocalDateTime reviewedDate;

    @Column(name = "doctor_review_notes", columnDefinition = "TEXT")
    private String doctorReviewNotes;

    @Column(name = "reviewed_by_doctor_id")
    private Long reviewedByDoctorId;

    @PrePersist
    protected void onCreate() {
        if (this.orderedDate == null) {
            this.orderedDate = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = LabOrderStatus.ORDERED;
        }
    }
}
