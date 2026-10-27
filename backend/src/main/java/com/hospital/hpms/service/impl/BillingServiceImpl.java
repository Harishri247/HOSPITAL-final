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
import com.hospital.hpms.repository.AppointmentRepository;
import com.hospital.hpms.repository.MedicalRecordRepository;
import com.hospital.hpms.repository.MedicineRepository;
import com.hospital.hpms.repository.PrescriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillingServiceImpl implements BillingService {

    private final BillRepository billRepository;
    private final PaymentRepository paymentRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicineRepository medicineRepository;
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
                .appointmentId(request.getAppointmentId())
                .consultationFee(request.getConsultationFee() != null ? request.getConsultationFee() : BigDecimal.ZERO)
                .prescriptionFee(request.getPrescriptionFee() != null ? request.getPrescriptionFee() : BigDecimal.ZERO)
                .itemsBreakdown(request.getItemsBreakdown())
                .totalAmount(request.getTotalAmount())
                .paidAmount(BigDecimal.ZERO)
                .balanceAmount(request.getTotalAmount())
                .status(BillStatus.UNPAID)
                .insuranceClaimId(request.getInsuranceClaimId())
                .generatedDate(LocalDateTime.now())
                .build();

        Bill saved = billRepository.save(bill);

        if (request.getAppointmentId() != null) {
            appointmentRepository.findById(request.getAppointmentId()).ifPresent(app -> {
                app.setBillId(saved.getId());
                app.setBillingStatus("BILLED");
                appointmentRepository.save(app);
            });
        }

        auditLogService.log(currentUserId, "BILL_GENERATED", "Bill", saved.getId(), null, "₹" + saved.getTotalAmount());

        if (patient.getUserId() != null) {
            notificationService.sendNotification(patient.getUserId(),
                    "New hospital invoice generated: ₹" + saved.getTotalAmount() + " (Invoice #" + saved.getId() + ")",
                    NotificationType.BILLING, Priority.MEDIUM);
        }

        return toBillResponse(saved, patient);
    }

    @Override
    @Transactional(readOnly = true)
    public ConsultationBillPreviewResponse calculateConsultationBill(Long appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + appointmentId));

        Patient patient = patientRepository.findById(appointment.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + appointment.getPatientId()));
        User doctor = userRepository.findById(appointment.getDoctorId()).orElse(null);

        // Check if bill already exists for this appointment
        Optional<Bill> existingBill = billRepository.findByAppointmentId(appointmentId);
        boolean isBilled = existingBill.isPresent();
        Long existingBillId = isBilled ? existingBill.get().getId() : null;
        BillStatus existingBillStatus = isBilled ? existingBill.get().getStatus() : null;

        // 1. Doctor Consultation Fee (Standard OPD fee: ₹500.00)
        BigDecimal consultationFee = new BigDecimal("500.00");
        String doctorName = doctor != null ? doctor.getFullName() : "Attending Physician";
        String doctorLabel = doctorName.toLowerCase().startsWith("dr") ? doctorName : "Dr. " + doctorName;

        List<BillItemDto> items = new ArrayList<>();
        items.add(BillItemDto.builder()
                .description("Clinical Consultation & Examination (" + doctorLabel + ")")
                .category("CONSULTATION")
                .quantity(1)
                .unitPrice(consultationFee)
                .amount(consultationFee)
                .build());

        // 2. Fetch Prescriptions for this consultation
        List<Prescription> prescriptions = new ArrayList<>();
        List<MedicalRecord> records = medicalRecordRepository.findByPatientIdAndDoctorIdAndVisitDate(
                patient.getId(), appointment.getDoctorId(), appointment.getAppointmentDate());

        String diagnosis = records.isEmpty() ? null : records.get(0).getDiagnosis();

        for (MedicalRecord record : records) {
            List<Prescription> recPrescs = prescriptionRepository.findByMedicalRecordId(record.getId());
            prescriptions.addAll(recPrescs);
        }

        if (prescriptions.isEmpty()) {
            // Fallback: search by patient, doctor, and date
            prescriptions = prescriptionRepository.findByPatientIdAndDoctorIdAndPrescriptionDate(
                    patient.getId(), appointment.getDoctorId(), appointment.getAppointmentDate());
        }

        // Deduplicate prescriptions by ID if any
        prescriptions = prescriptions.stream().distinct().collect(Collectors.toList());

        BigDecimal totalPrescriptionFee = BigDecimal.ZERO;
        for (Prescription p : prescriptions) {
            BigDecimal unitPrice = lookupMedicineUnitPrice(p.getMedicationName());
            int quantity = estimateMedicineQuantity(p.getDuration(), p.getFrequency());
            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
            totalPrescriptionFee = totalPrescriptionFee.add(itemTotal);

            String desc = p.getMedicationName() + " (" + p.getDosage() + " • " + p.getFrequency() + " • " + p.getDuration() + ")";
            items.add(BillItemDto.builder()
                    .description(desc)
                    .category("PRESCRIPTION")
                    .quantity(quantity)
                    .unitPrice(unitPrice)
                    .amount(itemTotal)
                    .build());
        }

        BigDecimal totalAmount = consultationFee.add(totalPrescriptionFee);

        return ConsultationBillPreviewResponse.builder()
                .appointmentId(appointment.getId())
                .patientId(patient.getId())
                .patientName(patient.getName())
                .patientNumber(patient.getPatientNumber())
                .doctorId(appointment.getDoctorId())
                .doctorName(doctorName)
                .appointmentDate(appointment.getAppointmentDate().toString())
                .timeSlot(appointment.getTimeSlot())
                .diagnosis(diagnosis)
                .consultationFee(consultationFee)
                .prescriptionFee(totalPrescriptionFee)
                .totalAmount(totalAmount)
                .items(items)
                .isBilled(isBilled)
                .existingBillId(existingBillId)
                .existingBillStatus(existingBillStatus)
                .build();
    }

    @Override
    @Transactional
    public BillResponse generateConsultationBill(GenerateConsultationBillRequest request, Long currentUserId) {
        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found: " + request.getAppointmentId()));

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + request.getPatientId()));

        // Prevent duplicate billing for the same appointment
        Optional<Bill> existing = billRepository.findByAppointmentId(request.getAppointmentId());
        if (existing.isPresent()) {
            return toBillResponse(existing.get(), patient);
        }

        if (request.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidOperationException("Total bill amount must be greater than zero");
        }

        BigDecimal consultationFee = request.getConsultationFee() != null ? request.getConsultationFee() : new BigDecimal("500.00");
        BigDecimal prescriptionFee = request.getPrescriptionFee() != null ? request.getPrescriptionFee() : BigDecimal.ZERO;

        Bill bill = Bill.builder()
                .patientId(request.getPatientId())
                .appointmentId(request.getAppointmentId())
                .consultationFee(consultationFee)
                .prescriptionFee(prescriptionFee)
                .itemsBreakdown(request.getItemsBreakdown())
                .totalAmount(request.getTotalAmount())
                .paidAmount(BigDecimal.ZERO)
                .balanceAmount(request.getTotalAmount())
                .status(BillStatus.UNPAID)
                .insuranceClaimId(request.getInsuranceClaimId())
                .generatedDate(LocalDateTime.now())
                .build();

        Bill saved = billRepository.save(bill);

        // Update appointment
        appointment.setBillId(saved.getId());
        appointment.setBillingStatus("BILLED");
        appointmentRepository.save(appointment);

        auditLogService.log(currentUserId, "CONSULTATION_BILL_GENERATED", "Bill", saved.getId(), null,
                "Consultation invoice issued: ₹" + saved.getTotalAmount() + " (Consultation: ₹" + consultationFee + ", Pharmacy: ₹" + prescriptionFee + ")");

        if (patient.getUserId() != null) {
            notificationService.sendNotification(patient.getUserId(),
                    "Your consultation invoice #" + saved.getId() + " (₹" + saved.getTotalAmount() + ") has been calculated by reception desk. Please proceed with payment.",
                    NotificationType.BILLING, Priority.HIGH);
        }

        return toBillResponse(saved, patient);
    }

    private BigDecimal lookupMedicineUnitPrice(String medicationName) {
        if (medicationName == null || medicationName.isBlank()) {
            return new BigDecimal("10.00");
        }
        String trimmed = medicationName.trim();
        Optional<Medicine> exact = medicineRepository.findByName(trimmed);
        if (exact.isPresent() && exact.get().getUnitPrice() != null && exact.get().getUnitPrice().compareTo(BigDecimal.ZERO) > 0) {
            return exact.get().getUnitPrice();
        }
        String[] words = trimmed.split("\\s+");
        if (words.length > 0) {
            String firstWord = words[0].replaceAll("[^a-zA-Z0-9]", "");
            if (!firstWord.isBlank()) {
                List<Medicine> searched = medicineRepository.searchMedicines(firstWord);
                if (!searched.isEmpty() && searched.get(0).getUnitPrice() != null && searched.get(0).getUnitPrice().compareTo(BigDecimal.ZERO) > 0) {
                    return searched.get(0).getUnitPrice();
                }
            }
        }
        return new BigDecimal("15.00");
    }

    private int estimateMedicineQuantity(String duration, String frequency) {
        int days = 5;
        if (duration != null) {
            Matcher m = Pattern.compile("\\d+").matcher(duration.toLowerCase());
            if (m.find()) {
                try {
                    days = Integer.parseInt(m.group());
                } catch (NumberFormatException ignored) {}
            }
        }
        int perDay = 1;
        if (frequency != null) {
            String freq = frequency.toLowerCase();
            if (freq.contains("thrice") || freq.contains("three") || freq.contains("tds") || freq.contains("tid")) {
                perDay = 3;
            } else if (freq.contains("twice") || freq.contains("two") || freq.contains("bd") || freq.contains("bid")) {
                perDay = 2;
            } else if (freq.contains("four") || freq.contains("qid")) {
                perDay = 4;
            }
        }
        int total = days * perDay;
        return Math.max(1, Math.min(total, 60));
    }

    @Override
    public List<BillResponse> getAllBills() {
        return getAllBills(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BillResponse> getAllBills(com.hospital.hpms.security.UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatient(principal);
            if (myPatient == null) return java.util.Collections.emptyList();
            return billRepository.findByPatientId(myPatient.getId()).stream()
                    .map(b -> toBillResponse(b, myPatient))
                    .collect(Collectors.toList());
        }

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
        return getBillsByPatient(patientId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BillResponse> getBillsByPatient(Long patientId, com.hospital.hpms.security.UserPrincipal principal) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatient(principal);
            if (myPatient == null || !myPatient.getId().equals(patientId)) {
                throw new com.hospital.hpms.exception.UnauthorizedAccessException("Access denied: You are only authorized to view your own billing records.");
            }
        }

        return billRepository.findByPatientId(patientId).stream()
                .map(b -> toBillResponse(b, patient))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BillResponse getBillById(Long id) {
        return getBillById(id, null);
    }

    @Override
    @Transactional(readOnly = true)
    public BillResponse getBillById(Long id, com.hospital.hpms.security.UserPrincipal principal) {
        Bill bill = billRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found: " + id));
        Patient patient = patientRepository.findById(bill.getPatientId()).orElse(null);

        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatient(principal);
            if (myPatient == null || !myPatient.getId().equals(bill.getPatientId())) {
                throw new com.hospital.hpms.exception.UnauthorizedAccessException("Access denied: You are only authorized to view your own bills.");
            }
        }

        return toBillResponse(bill, patient);
    }

    private Patient resolvePatient(com.hospital.hpms.security.UserPrincipal principal) {
        if (principal == null) return null;
        Patient p = patientRepository.findByUserId(principal.getId()).orElse(null);
        if (p != null) return p;
        User u = userRepository.findById(principal.getId()).orElse(null);
        if (u != null && u.getPhoneNumber() != null && !u.getPhoneNumber().isBlank()) {
            p = patientRepository.findByPhoneNumber(u.getPhoneNumber().trim()).orElse(null);
            if (p != null) {
                if (p.getUserId() == null) {
                    p.setUserId(principal.getId());
                    patientRepository.save(p);
                }
                return p;
            }
        }
        if (principal.getFullName() != null && !principal.getFullName().isBlank()) {
            List<Patient> list = patientRepository.searchPatientsList(principal.getFullName().trim());
            if (list.size() == 1) {
                p = list.get(0);
                if (p.getUserId() == null) {
                    p.setUserId(principal.getId());
                    patientRepository.save(p);
                }
                return p;
            }
        }
        return null;
    }

    @Override
    @Transactional
    public BillResponse recordPayment(Long billId, PaymentRequest request, Long currentUserId) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found: " + billId));

        if (currentUserId != null) {
            User currentUser = userRepository.findById(currentUserId).orElse(null);
            if (currentUser != null && currentUser.getRole() == RoleType.ROLE_PATIENT) {
                Patient patient = patientRepository.findById(bill.getPatientId()).orElse(null);
                boolean isMine = patient != null && (
                        (patient.getUserId() != null && patient.getUserId().equals(currentUserId))
                        || (currentUser.getPhoneNumber() != null && currentUser.getPhoneNumber().equals(patient.getPhoneNumber()))
                );
                if (!isMine) {
                    throw new com.hospital.hpms.exception.UnauthorizedAccessException("Access denied: You can only pay your own hospital invoices.");
                }
            }
        }

        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidOperationException("Payment amount must be greater than zero");
        }

        if (request.getAmount().compareTo(bill.getBalanceAmount()) > 0) {
            throw new InvalidOperationException("Payment amount (₹" + request.getAmount() + ") cannot exceed current outstanding balance (₹" + bill.getBalanceAmount() + ")");
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
            if (bill.getAppointmentId() != null) {
                appointmentRepository.findById(bill.getAppointmentId()).ifPresent(app -> {
                    app.setBillingStatus("PAID");
                    appointmentRepository.save(app);
                });
            }
        } else {
            bill.setStatus(BillStatus.PARTIALLY_PAID);
            if (bill.getAppointmentId() != null) {
                appointmentRepository.findById(bill.getAppointmentId()).ifPresent(app -> {
                    app.setBillingStatus("PARTIALLY_PAID");
                    appointmentRepository.save(app);
                });
            }
        }

        Bill updatedBill = billRepository.save(bill);
        auditLogService.log(currentUserId, "PAYMENT_RECORDED", "Bill", billId, null,
                "Received ₹" + request.getAmount() + " via " + request.getPaymentMethod());

        Patient patient = patientRepository.findById(bill.getPatientId()).orElse(null);
        if (patient != null && patient.getUserId() != null) {
            notificationService.sendNotification(patient.getUserId(),
                    "Payment of ₹" + request.getAmount() + " received for Invoice #" + billId + ". Remaining balance: ₹" + newBalance,
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
                .appointmentId(b.getAppointmentId())
                .consultationFee(b.getConsultationFee())
                .prescriptionFee(b.getPrescriptionFee())
                .itemsBreakdown(b.getItemsBreakdown())
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
