package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.BillingDto.*;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.InvalidOperationException;
import com.hospital.hpms.exception.ResourceNotFoundException;
import com.hospital.hpms.repository.BillRepository;
import com.hospital.hpms.repository.PatientRepository;
import com.hospital.hpms.repository.PaymentRepository;
import com.hospital.hpms.repository.UserRepository;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.BillingService;
import com.hospital.hpms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillingServiceImpl implements BillingService {

    private final BillRepository billRepository;
    private final PaymentRepository paymentRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public BillResponse generateBill(BillGenerateRequest request, Long currentUserId) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + request.getPatientId()));

        if (request.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidOperationException("Total bill amount must be greater than zero");
        }

        Bill bill = Bill.builder()
                .patientId(request.getPatientId())
                .admissionId(request.getAdmissionId())
                .totalAmount(request.getTotalAmount())
                .paidAmount(BigDecimal.ZERO)
                .balanceAmount(request.getTotalAmount())
                .status(BillStatus.UNPAID)
                .insuranceClaimId(request.getInsuranceClaimId())
                .generatedDate(LocalDateTime.now())
                .build();

        Bill saved = billRepository.save(bill);
        auditLogService.log(currentUserId, "BILL_GENERATED", "Bill", saved.getId(), null, "$" + saved.getTotalAmount());

        if (patient.getUserId() != null) {
            notificationService.sendNotification(patient.getUserId(),
                    "New hospital invoice generated: $" + saved.getTotalAmount() + " (Invoice #" + saved.getId() + ")",
                    NotificationType.BILLING, Priority.MEDIUM);
        }

        return toBillResponse(saved, patient);
    }

    @Override
    public List<BillResponse> getAllBills() {
        return billRepository.findAll().stream()
                .map(bill -> {
                    Patient p = patientRepository.findById(bill.getPatientId()).orElse(null);
                    return toBillResponse(bill, p);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BillResponse> getBillsByPatient(Long patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        return billRepository.findByPatientId(patientId).stream()
                .map(b -> toBillResponse(b, patient))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BillResponse getBillById(Long id) {
        Bill bill = billRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found: " + id));
        Patient patient = patientRepository.findById(bill.getPatientId()).orElse(null);
        return toBillResponse(bill, patient);
    }

    @Override
    @Transactional
    public BillResponse recordPayment(Long billId, PaymentRequest request, Long currentUserId) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found: " + billId));

        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidOperationException("Payment amount must be greater than zero");
        }

        if (request.getAmount().compareTo(bill.getBalanceAmount()) > 0) {
            throw new InvalidOperationException("Payment amount ($" + request.getAmount() + ") cannot exceed current outstanding balance ($" + bill.getBalanceAmount() + ")");
        }

        String receiver = request.getReceivedBy();
        if (receiver == null && currentUserId != null) {
            receiver = userRepository.findById(currentUserId).map(User::getFullName).orElse("Reception/Cashier");
        }

        Payment payment = Payment.builder()
                .billId(billId)
                .amount(request.getAmount())
                .paymentMethod(request.getPaymentMethod())
                .transactionReference(request.getTransactionReference())
                .paymentDate(LocalDateTime.now())
                .receivedBy(receiver)
                .build();

        paymentRepository.save(payment);

        BigDecimal newPaid = bill.getPaidAmount().add(request.getAmount());
        BigDecimal newBalance = bill.getTotalAmount().subtract(newPaid);

        bill.setPaidAmount(newPaid);
        bill.setBalanceAmount(newBalance);

        if (newBalance.compareTo(BigDecimal.ZERO) == 0) {
            bill.setStatus(BillStatus.PAID);
        } else {
            bill.setStatus(BillStatus.PARTIALLY_PAID);
        }

        Bill updatedBill = billRepository.save(bill);
        auditLogService.log(currentUserId, "PAYMENT_RECORDED", "Bill", billId, null,
                "Received $" + request.getAmount() + " via " + request.getPaymentMethod());

        Patient patient = patientRepository.findById(bill.getPatientId()).orElse(null);
        if (patient != null && patient.getUserId() != null) {
            notificationService.sendNotification(patient.getUserId(),
                    "Payment of $" + request.getAmount() + " received for Invoice #" + billId + ". Remaining balance: $" + newBalance,
                    NotificationType.BILLING, Priority.MEDIUM);
        }

        return toBillResponse(updatedBill, patient);
    }

    @Override
    @Transactional
    public BillResponse submitInsuranceClaim(InsuranceClaimRequest request, Long currentUserId) {
        Bill bill = billRepository.findById(request.getBillId())
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found: " + request.getBillId()));

        String claimId = "CLM-" + System.currentTimeMillis();
        bill.setInsuranceClaimId(claimId);
        Bill updated = billRepository.save(bill);

        auditLogService.log(currentUserId, "INSURANCE_CLAIM_SUBMITTED", "Bill", bill.getId(), null, claimId);
        Patient patient = patientRepository.findById(bill.getPatientId()).orElse(null);
        return toBillResponse(updated, patient);
    }

    @Override
    @Transactional(readOnly = true)
    public BillingReportResponse getFinancialReport() {
        BigDecimal totalBilled = billRepository.getTotalBilledAmount();
        BigDecimal totalCollected = billRepository.getTotalRevenueCollected();
        BigDecimal totalOutstanding = billRepository.getTotalOutstandingAmount();
        long totalBills = billRepository.count();
        long paidBills = billRepository.findByStatus(BillStatus.PAID).size();
        long pendingBills = totalBills - paidBills;

        return BillingReportResponse.builder()
                .totalBilled(totalBilled)
                .totalCollected(totalCollected)
                .totalOutstanding(totalOutstanding)
                .totalBills(totalBills)
                .paidBillsCount(paidBills)
                .pendingBillsCount(pendingBills)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getTotalRevenue() {
        return billRepository.getTotalRevenueCollected();
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getOutstandingBalance() {
        return billRepository.getTotalOutstandingAmount();
    }

    private BillResponse toBillResponse(Bill b, Patient patient) {
        List<PaymentResponse> payments = paymentRepository.findByBillId(b.getId()).stream()
                .map(p -> PaymentResponse.builder()
                        .id(p.getId())
                        .billId(p.getBillId())
                        .amount(p.getAmount())
                        .paymentMethod(p.getPaymentMethod())
                        .transactionReference(p.getTransactionReference())
                        .paymentDate(p.getPaymentDate())
                        .receivedBy(p.getReceivedBy())
                        .build())
                .collect(Collectors.toList());

        return BillResponse.builder()
                .id(b.getId())
                .patientId(b.getPatientId())
                .patientName(patient != null ? patient.getName() : "Unknown")
                .patientNumber(patient != null ? patient.getPatientNumber() : "N/A")
                .admissionId(b.getAdmissionId())
                .totalAmount(b.getTotalAmount())
                .paidAmount(b.getPaidAmount())
                .balanceAmount(b.getBalanceAmount())
                .status(b.getStatus())
                .insuranceClaimId(b.getInsuranceClaimId())
                .generatedDate(b.getGeneratedDate())
                .payments(payments)
                .build();
    }
}
