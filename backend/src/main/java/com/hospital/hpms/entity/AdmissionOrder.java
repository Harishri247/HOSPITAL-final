package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "admission_orders", indexes = {
    @Index(name = "idx_admission_order_patient", columnList = "patient_id"),
    @Index(name = "idx_admission_order_doctor", columnList = "doctor_id"),
    @Index(name = "idx_admission_order_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdmissionOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    @Column(name = "diagnosis", nullable = false, length = 255)
    private String diagnosis;

    @Enumerated(EnumType.STRING)
    @Column(name = "recommended_ward_type", length = 50)
    private WardType recommendedWardType;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 30)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private AdmissionOrderStatus status = AdmissionOrderStatus.ORDERED;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "assigned_bed_id")
    private Long assignedBedId;

    @Column(name = "assigned_ward_id")
    private Long assignedWardId;

    @Column(name = "assigned_by")
    private Long assignedBy;

    @Column(name = "assigned_nurse_id")
    private Long assignedNurseId;

    @Column(name = "assigned_nurse_name", length = 100)
    private String assignedNurseName;

    @Column(name = "order_date", nullable = false)
    private LocalDateTime orderDate;

    @Column(name = "admitted_date")
    private LocalDateTime admittedDate;

    @PrePersist
    protected void onCreate() {
        if (this.orderDate == null) {
            this.orderDate = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = AdmissionOrderStatus.ORDERED;
        }
        if (this.priority == null) {
            this.priority = Priority.MEDIUM;
        }
    }
}
