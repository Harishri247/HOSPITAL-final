package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "medicines", indexes = {
    @Index(name = "idx_medicine_name", columnList = "name"),
    @Index(name = "idx_medicine_category", columnList = "category")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "generic_name", length = 150)
    private String genericName;

    @Column(name = "category", nullable = false, length = 100)
    private String category;

    @Column(name = "dosage_form", nullable = false, length = 50)
    private String dosageForm;

    @Column(name = "strength", length = 50)
    private String strength;

    @Column(name = "stock_quantity", nullable = false)
    @Builder.Default
    private Integer stockQuantity = 0;

    @Column(name = "min_threshold", nullable = false)
    @Builder.Default
    private Integer minThreshold = 10;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "batch_number", length = 50)
    private String batchNumber;

    @Column(name = "manufacturer", length = 100)
    private String manufacturer;

    @Column(name = "supplier", length = 150)
    private String supplier;

    @Column(name = "is_controlled", nullable = false)
    @Builder.Default
    private boolean isControlled = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.stockQuantity == null) {
            this.stockQuantity = 0;
        }
        if (this.minThreshold == null) {
            this.minThreshold = 10;
        }
    }
}
