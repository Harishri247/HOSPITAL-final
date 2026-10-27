package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "beds", indexes = {
    @Index(name = "idx_bed_ward", columnList = "ward_id"),
    @Index(name = "idx_bed_patient", columnList = "patient_id"),
    @Index(name = "idx_bed_ward_number", columnList = "ward_id, bed_number", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bed {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ward_id", nullable = false)
    private Long wardId;

    @Column(name = "bed_number", nullable = false, length = 20)
    private String bedNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "bed_type", nullable = false, length = 30)
    private BedType bedType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private BedStatus status = BedStatus.AVAILABLE;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "assignment_date")
    private LocalDateTime assignmentDate;

    @Column(name = "assigned_nurse_id")
    private Long assignedNurseId;

    @Column(name = "assigned_nurse_name", length = 100)
    private String assignedNurseName;

    @PrePersist
    protected void onCreate() {
        if (this.status == null) {
            this.status = BedStatus.AVAILABLE;
        }
    }
}
