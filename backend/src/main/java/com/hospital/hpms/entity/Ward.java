package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "wards")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ward_name", nullable = false, length = 100)
    private String wardName;

    @Enumerated(EnumType.STRING)
    @Column(name = "ward_type", nullable = false, length = 30)
    private WardType wardType;

    @Column(name = "total_beds", nullable = false)
    private Integer totalBeds;

    @Column(name = "occupied_beds", nullable = false)
    @Builder.Default
    private Integer occupiedBeds = 0;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "floor_number")
    private Integer floorNumber;

    @Column(name = "nurse_in_charge", length = 100)
    private String nurseInCharge;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.occupiedBeds == null) {
            this.occupiedBeds = 0;
        }
    }
}
