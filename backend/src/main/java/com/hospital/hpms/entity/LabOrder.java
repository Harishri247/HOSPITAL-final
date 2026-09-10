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
