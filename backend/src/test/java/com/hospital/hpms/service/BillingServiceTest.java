package com.hospital.hpms.service;

import com.hospital.hpms.dto.BillingDto.*;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.InvalidOperationException;
import com.hospital.hpms.repository.*;
import com.hospital.hpms.service.impl.BillingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BillingServiceTest {

    @Mock
    private BillRepository billRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private BillingServiceImpl billingService;

    private Patient patient;
    private Bill sampleBill;

    @BeforeEach
    void setUp() {
        patient = Patient.builder().id(1L).name("John Doe").patientNumber("PAT-001").build();
        sampleBill = Bill.builder()
                .id(100L)
                .patientId(1L)
                .totalAmount(new BigDecimal("500.00"))
                .paidAmount(BigDecimal.ZERO)
                .balanceAmount(new BigDecimal("500.00"))
                .status(BillStatus.UNPAID)
                .generatedDate(LocalDateTime.now())
                .build();
    }

    @Test
    void testGenerateBill_Success() {
        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(billRepository.save(any(Bill.class))).thenReturn(sampleBill);

        BillGenerateRequest req = BillGenerateRequest.builder()
                .patientId(1L)
                .totalAmount(new BigDecimal("500.00"))
                .build();

        BillResponse res = billingService.generateBill(req, 1L);

        assertNotNull(res);
        assertEquals(new BigDecimal("500.00"), res.getTotalAmount());
        assertEquals(BillStatus.UNPAID, res.getStatus());
    }

    @Test
    void testRecordPayment_PartialPaymentSuccess() {
        when(billRepository.findById(100L)).thenReturn(Optional.of(sampleBill));
        when(billRepository.save(any(Bill.class))).thenAnswer(i -> i.getArgument(0));

        PaymentRequest payReq = PaymentRequest.builder()
                .amount(new BigDecimal("200.00"))
                .paymentMethod(PaymentMethod.CASH)
                .build();

        BillResponse res = billingService.recordPayment(100L, payReq, 1L);

        assertEquals(new BigDecimal("200.00"), res.getPaidAmount());
        assertEquals(new BigDecimal("300.00"), res.getBalanceAmount());
        assertEquals(BillStatus.PARTIALLY_PAID, res.getStatus());
    }

    @Test
    void testRecordPayment_FullPaymentMarksBillPaid() {
        when(billRepository.findById(100L)).thenReturn(Optional.of(sampleBill));
        when(billRepository.save(any(Bill.class))).thenAnswer(i -> i.getArgument(0));

        PaymentRequest payReq = PaymentRequest.builder()
                .amount(new BigDecimal("500.00"))
                .paymentMethod(PaymentMethod.CREDIT_CARD)
                .build();

        BillResponse res = billingService.recordPayment(100L, payReq, 1L);

        assertEquals(new BigDecimal("500.00"), res.getPaidAmount());
        assertEquals(0, res.getBalanceAmount().compareTo(BigDecimal.ZERO));
        assertEquals(BillStatus.PAID, res.getStatus());
    }

    @Test
    void testRecordPayment_OverpaymentThrowsException() {
        when(billRepository.findById(100L)).thenReturn(Optional.of(sampleBill));

        PaymentRequest payReq = PaymentRequest.builder()
                .amount(new BigDecimal("600.00")) // Exceeds 500 balance
                .paymentMethod(PaymentMethod.CASH)
                .build();

        assertThrows(InvalidOperationException.class, () -> billingService.recordPayment(100L, payReq, 1L));
        verify(paymentRepository, never()).save(any());
    }
}
