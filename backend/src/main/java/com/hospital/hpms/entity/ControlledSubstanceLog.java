package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "controlled_substance_logs", indexes = {
    @Index(name = "idx_ctrl_med", columnList = "medicine_id"),
    @Index(name = "idx_ctrl_timestamp", columnList = "timestamp"),
    @Index(name = "idx_ctrl_patient", columnList = "patient_reference")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ControlledSubstanceLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "medicine_id", nullable = false)
    private Long medicineId;

    @Column(name = "medicine_name", nullable = false, length = 150)
    private String medicineName;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "batch_number", length = 50)
    private String batchNumber;

    @Column(name = "patient_reference", nullable = false, length = 150)
    private String patientReference;

    @Column(name = "pharmacist_user_id")
    private Long pharmacistUserId;

    @Column(name = "pharmacist_name", nullable = false, length = 120)
    private String pharmacistName;

    @Column(name = "supervisor_signoff", length = 120)
    private String supervisorSignoff;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (this.timestamp == null) {
            this.timestamp = LocalDateTime.now();
        }
    }
}
