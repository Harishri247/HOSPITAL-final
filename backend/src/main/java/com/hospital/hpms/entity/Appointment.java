package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointments", indexes = {
    @Index(name = "idx_app_patient", columnList = "patient_id"),
    @Index(name = "idx_app_doctor", columnList = "doctor_id"),
    @Index(name = "idx_app_date_slot", columnList = "doctor_id, appointment_date, time_slot")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "appointment_date", nullable = false)
    private LocalDate appointmentDate;

    @Column(name = "time_slot", nullable = false, length = 30)
    private String timeSlot;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private AppointmentType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private AppointmentStatus status = AppointmentStatus.SCHEDULED;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "queue_number")
    private Integer queueNumber;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    @Column(name = "bill_id")
    private Long billId;

    @Column(name = "billing_status", length = 30)
    @Builder.Default
    private String billingStatus = "PENDING";

    @Column(name = "created_date", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @PrePersist
    protected void onCreate() {
        this.createdDate = LocalDateTime.now();
        if (this.status == null) {
            this.status = AppointmentStatus.SCHEDULED;
        }
        if (this.type == null) {
            this.type = AppointmentType.OPD;
        }
    }
}
