package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "patients", indexes = {
    @Index(name = "idx_patient_number", columnList = "patient_number", unique = true),
    @Index(name = "idx_patient_phone", columnList = "phone_number"),
    @Index(name = "idx_patient_name_dob", columnList = "name, date_of_birth")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_number", nullable = false, unique = true, length = 30)
    private String patientNumber;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Column(name = "gender", nullable = false, length = 20)
    private String gender;

    @Column(name = "blood_group", length = 10)
    private String bloodGroup;

    @Column(name = "phone_number", nullable = false, length = 10)
    private String phoneNumber;

    @Column(name = "address", length = 300)
    private String address;

    @Column(name = "emergency_contact", length = 150)
    private String emergencyContact;

    @Column(name = "insurance_id", length = 50)
    private String insuranceId;

    @Column(name = "registration_date", nullable = false)
    private LocalDate registrationDate;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.registrationDate == null) {
            this.registrationDate = LocalDate.now();
        }
        if (this.status == null) {
            this.status = "ACTIVE";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
