package com.hospital.hpms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bills", indexes = {
    @Index(name = "idx_bill_patient", columnList = "patient_id"),
    @Index(name = "idx_bill_status", columnList = "status"),
    @Index(name = "idx_bill_appointment", columnList = "appointment_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "admission_id")
    private Long admissionId;

    @Column(name = "appointment_id")
    private Long appointmentId;

    @Column(name = "consultation_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal consultationFee = BigDecimal.ZERO;

    @Column(name = "prescription_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal prescriptionFee = BigDecimal.ZERO;

    @Column(name = "items_breakdown", columnDefinition = "TEXT")
    private String itemsBreakdown;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "paid_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "balance_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal balanceAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private BillStatus status = BillStatus.UNPAID;

    @Column(name = "insurance_claim_id", length = 50)
    private String insuranceClaimId;

    @Column(name = "generated_date", nullable = false)
    private LocalDateTime generatedDate;

    @PrePersist
    protected void onCreate() {
        if (this.generatedDate == null) {
            this.generatedDate = LocalDateTime.now();
        }
        if (this.paidAmount == null) {
            this.paidAmount = BigDecimal.ZERO;
        }
        if (this.balanceAmount == null && this.totalAmount != null) {
            this.balanceAmount = this.totalAmount.subtract(this.paidAmount);
        }
        if (this.status == null) {
            this.status = BillStatus.UNPAID;
        }
    }
}
