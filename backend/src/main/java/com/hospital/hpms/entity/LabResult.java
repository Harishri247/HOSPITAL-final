package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lab_results", indexes = {
    @Index(name = "idx_lab_result_order", columnList = "lab_order_id"),
    @Index(name = "idx_lab_result_flag", columnList = "flag")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lab_order_id", nullable = false)
    private Long labOrderId;

    @Column(name = "result_value", nullable = false, length = 100)
    private String resultValue;

    @Column(name = "reference_range", nullable = false, length = 100)
    private String referenceRange;

    @Column(name = "unit", nullable = false, length = 30)
    private String unit;

    @Enumerated(EnumType.STRING)
    @Column(name = "flag", nullable = false, length = 30)
    @Builder.Default
    private ResultFlag flag = ResultFlag.NORMAL;

    @Column(name = "verified_by", nullable = false, length = 100)
    private String verifiedBy;

    @Column(name = "result_date", nullable = false)
    private LocalDateTime resultDate;

    @PrePersist
    protected void onCreate() {
        if (this.resultDate == null) {
            this.resultDate = LocalDateTime.now();
        }
        if (this.flag == null) {
            this.flag = ResultFlag.NORMAL;
        }
    }
}
