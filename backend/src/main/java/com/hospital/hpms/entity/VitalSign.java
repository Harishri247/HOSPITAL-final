package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "vital_signs", indexes = {
    @Index(name = "idx_vitals_patient", columnList = "patient_id"),
    @Index(name = "idx_vitals_recorded_at", columnList = "recorded_at"),
    @Index(name = "idx_vitals_alert", columnList = "is_alert, alert_acknowledged")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VitalSign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "recorded_by")
    private Long recordedBy;

    @Column(name = "temperature")
    private Double temperature;

    @Column(name = "blood_pressure", length = 30)
    private String bloodPressure;

    @Column(name = "systolic")
    private Integer systolic;

    @Column(name = "diastolic")
    private Integer diastolic;

    @Column(name = "pulse")
    private Integer pulse;

    @Column(name = "respiratory_rate")
    private Integer respiratoryRate;

    @Column(name = "oxygen_saturation")
    private Double oxygenSaturation;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "is_alert", nullable = false)
    @Builder.Default
    private Boolean isAlert = false;

    @Column(name = "alert_severity", length = 20)
    @Builder.Default
    private String alertSeverity = "NORMAL";

    @Column(name = "alert_message")
    private String alertMessage;

    @Column(name = "alert_acknowledged", nullable = false)
    @Builder.Default
    private Boolean alertAcknowledged = false;

    @Column(name = "acknowledged_by")
    private Long acknowledgedBy;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "response_notes", length = 1000)
    private String responseNotes;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        if (this.recordedAt == null) {
            this.recordedAt = LocalDateTime.now();
        }
        if (this.isAlert == null) {
            this.isAlert = false;
        }
        if (this.alertAcknowledged == null) {
            this.alertAcknowledged = false;
        }
        if (this.alertSeverity == null) {
            this.alertSeverity = "NORMAL";
        }
    }
}
