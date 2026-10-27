package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "medication_administrations", indexes = {
    @Index(name = "idx_med_admin_patient", columnList = "patient_id"),
    @Index(name = "idx_med_admin_prescription", columnList = "prescription_id"),
    @Index(name = "idx_med_admin_time", columnList = "administered_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicationAdministration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prescription_id")
    private Long prescriptionId;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "administered_by", nullable = false)
    private Long administeredBy;

    @Column(name = "scheduled_time", length = 50)
    private String scheduledTime;

    @Column(name = "administered_at", nullable = false)
    private LocalDateTime administeredAt;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "GIVEN"; // GIVEN, HELD, REFUSED

    @Column(name = "dosage_given", length = 50)
    private String dosageGiven;

    @Column(name = "route", length = 50)
    private String route;

    @Column(name = "notes", length = 500)
    private String notes;

    @PrePersist
    protected void onCreate() {
        if (this.administeredAt == null) {
            this.administeredAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = "GIVEN";
        }
    }
}
