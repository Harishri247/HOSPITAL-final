package com.hospital.hpms.dto;

import com.hospital.hpms.entity.BillStatus;
import com.hospital.hpms.entity.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class BillingDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BillGenerateRequest {
        @NotNull(message = "Patient ID is required")
        private Long patientId;

        private Long admissionId;
        private Long appointmentId;
        private BigDecimal consultationFee;
        private BigDecimal prescriptionFee;
        private String itemsBreakdown;

        @NotNull(message = "Total amount is required")
        @DecimalMin(value = "0.01", message = "Total amount must be greater than zero")
        private BigDecimal totalAmount;

        private String insuranceClaimId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GenerateConsultationBillRequest {
        @NotNull(message = "Appointment ID is required")
        private Long appointmentId;

        @NotNull(message = "Patient ID is required")
        private Long patientId;

        private BigDecimal consultationFee;
        private BigDecimal prescriptionFee;

        @NotNull(message = "Total amount is required")
        @DecimalMin(value = "0.01", message = "Total amount must be greater than zero")
        private BigDecimal totalAmount;

        private String itemsBreakdown;
        private String insuranceClaimId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BillItemDto {
        private String description;
        private String category; // CONSULTATION, PRESCRIPTION, LAB, OTHER
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal amount;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConsultationBillPreviewResponse {
        private Long appointmentId;
        private Long patientId;
        private String patientName;
        private String patientNumber;
        private Long doctorId;
        private String doctorName;
        private String appointmentDate;
        private String timeSlot;
        private String diagnosis;
        private BigDecimal consultationFee;
        private BigDecimal prescriptionFee;
        private BigDecimal totalAmount;
        private List<BillItemDto> items;
        private boolean isBilled;
        private Long existingBillId;
        private BillStatus existingBillStatus;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentRequest {
        @NotNull(message = "Payment amount is required")
        @DecimalMin(value = "0.01", message = "Payment amount must be greater than zero")
        private BigDecimal amount;

        @NotNull(message = "Payment method is required")
        private PaymentMethod paymentMethod;

        private String transactionReference;
        private String receivedBy;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class InsuranceClaimRequest {
        @NotNull(message = "Bill ID is required")
        private Long billId;
        private String insuranceProvider;
        private String policyNumber;
        @DecimalMin(value = "0.01", message = "Claim amount must be greater than zero")
        private BigDecimal claimAmount;
        private String remarks;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BillResponse {
        private Long id;
        private Long patientId;
        private String patientName;
        private String patientNumber;
        private Long admissionId;
        private Long appointmentId;
        private BigDecimal consultationFee;
        private BigDecimal prescriptionFee;
        private String itemsBreakdown;
        private BigDecimal totalAmount;
        private BigDecimal paidAmount;
        private BigDecimal balanceAmount;
        private BillStatus status;
        private String insuranceClaimId;
        private LocalDateTime generatedDate;
        private List<PaymentResponse> payments;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentResponse {
        private Long id;
        private Long billId;
        private BigDecimal amount;
        private PaymentMethod paymentMethod;
        private String transactionReference;
        private LocalDateTime paymentDate;
        private String receivedBy;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BillingReportResponse {
        private BigDecimal totalBilled;
        private BigDecimal totalCollected;
        private BigDecimal totalOutstanding;
        private long totalBills;
        private long paidBillsCount;
        private long pendingBillsCount;
    }
}
