package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.LabDto.*;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.ResourceNotFoundException;
import com.hospital.hpms.repository.LabOrderRepository;
import com.hospital.hpms.repository.LabResultRepository;
import com.hospital.hpms.repository.PatientRepository;
import com.hospital.hpms.repository.UserRepository;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.LabService;
import com.hospital.hpms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.exception.UnauthorizedAccessException;
import com.hospital.hpms.entity.RoleType;

@Service
@RequiredArgsConstructor
public class LabServiceImpl implements LabService {

    private final LabOrderRepository labOrderRepository;
    private final LabResultRepository labResultRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    private boolean isDoctorAuthorizedForPatient(Long doctorId, Long patientId) {
        return patientRepository.isPatientAssignedToDoctor(patientId, doctorId);
    }

    private boolean isDoctorAuthorizedForOrder(Long doctorId, LabOrder order) {
        return order.getDoctorId() != null && order.getDoctorId().equals(doctorId);
    }

    @Override
    @Transactional
    public LabOrderResponse createOrder(LabOrderRequest request, Long currentUserId) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + request.getPatientId()));
        User doctor = userRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + request.getDoctorId()));

        Priority priority = request.getPriority() != null ? request.getPriority() : Priority.ROUTINE;

        LabOrder order = LabOrder.builder()
                .patientId(request.getPatientId())
                .doctorId(request.getDoctorId())
                .testName(request.getTestName())
                .testCode(request.getTestCode())
                .specimenType(request.getSpecimenType())
                .priority(priority)
                .clinicalNotes(request.getClinicalNotes())
                .status(LabOrderStatus.ORDERED)
                .orderedDate(LocalDateTime.now())
                .build();

        LabOrder saved = labOrderRepository.save(order);
        auditLogService.log(currentUserId, "LAB_ORDER_CREATED", "LabOrder", saved.getId(), null, saved.getTestName() + " (" + priority + ")");

        return toOrderResponse(saved, patient, doctor, null, null);
    }

    @Override
    @Transactional
    public LabOrderResponse receiveOrder(Long orderId, ReceiveOrderRequest request, Long labTechUserId) {
        LabOrder order = labOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab order not found: " + orderId));

        User tech = userRepository.findById(labTechUserId).orElse(null);
        String techName = (request != null && request.getReceivedBy() != null && !request.getReceivedBy().isBlank())
                ? request.getReceivedBy()
                : (tech != null && tech.getFullName() != null ? tech.getFullName() : "Lab Technician");

        order.setStatus(LabOrderStatus.RECEIVED);
        order.setReceivedDate(LocalDateTime.now());
        order.setReceivedBy(techName);

        LabOrder saved = labOrderRepository.save(order);
        auditLogService.log(labTechUserId, "LAB_ORDER_RECEIVED", "LabOrder", saved.getId(), null, "Order received by " + techName);

        return fetchFullOrderResponse(saved);
    }

    @Override
    @Transactional
    public LabOrderResponse collectSpecimen(Long orderId, CollectSpecimenRequest request, Long labTechUserId) {
        LabOrder order = labOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab order not found: " + orderId));

        String barcode = (request != null && request.getSpecimenBarcode() != null && !request.getSpecimenBarcode().isBlank())
                ? request.getSpecimenBarcode()
                : "SP-" + orderId + "-" + (System.currentTimeMillis() % 100000);

        order.setSpecimenBarcode(barcode);
        order.setSpecimenCollectedDate(LocalDateTime.now());
        if (request != null && request.getSpecimenNotes() != null) {
            order.setSpecimenNotes(request.getSpecimenNotes());
        }
        order.setStatus(LabOrderStatus.SPECIMEN_COLLECTED);

        LabOrder saved = labOrderRepository.save(order);
        auditLogService.log(labTechUserId, "LAB_SPECIMEN_COLLECTED", "LabOrder", saved.getId(), null, "Specimen accession: " + barcode);

        return fetchFullOrderResponse(saved);
    }

    @Override
    @Transactional
    public LabOrderResponse startTesting(Long orderId, StartTestingRequest request, Long labTechUserId) {
        LabOrder order = labOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab order not found: " + orderId));

        String equipment = (request != null && request.getTestingEquipment() != null && !request.getTestingEquipment().isBlank())
                ? request.getTestingEquipment()
                : "Standard Laboratory Analyzer";

        order.setTestingEquipment(equipment);
        order.setTestStartedDate(LocalDateTime.now());
        order.setStatus(LabOrderStatus.IN_PROGRESS);

        LabOrder saved = labOrderRepository.save(order);
        auditLogService.log(labTechUserId, "LAB_TEST_STARTED", "LabOrder", saved.getId(), null, "Testing started using: " + equipment);

        return fetchFullOrderResponse(saved);
    }

    @Override
    @Transactional
    public LabOrderResponse doctorReview(Long orderId, DoctorReviewRequest request, Long doctorId) {
        LabOrder order = labOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab order not found: " + orderId));

        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + doctorId));

        String reviewNotes = (request != null && request.getDoctorReviewNotes() != null && !request.getDoctorReviewNotes().isBlank())
                ? request.getDoctorReviewNotes()
                : "Reviewed and approved by ordering physician.";

        order.setStatus(LabOrderStatus.REVIEWED);
        order.setReviewedDate(LocalDateTime.now());
        order.setReviewedByDoctorId(doctorId);
        order.setDoctorReviewNotes(reviewNotes);

        LabOrder saved = labOrderRepository.save(order);
        auditLogService.log(doctorId, "LAB_ORDER_REVIEWED", "LabOrder", saved.getId(), null, "Doctor reviewed and signed off: " + reviewNotes);

        return fetchFullOrderResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getOrdersByPatient(Long patientId) {
        return getOrdersByPatient(patientId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getOrdersByPatient(Long patientId, UserPrincipal principal) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatient(principal);
            if (myPatient == null || !myPatient.getId().equals(patientId)) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to access your own lab orders.");
            }
        }

        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            Long doctorId = principal.getId();
            return labOrderRepository.findByPatientId(patientId).stream()
                    .filter(o -> o.getDoctorId() != null && o.getDoctorId().equals(doctorId))
                    .map(this::fetchFullOrderResponse)
                    .collect(Collectors.toList());
        }

        return labOrderRepository.findByPatientId(patientId).stream()
                .map(this::fetchFullOrderResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getPendingOrders() {
        return getPendingOrders(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getPendingOrders(UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            Long doctorId = principal.getId();
            return labOrderRepository.findByStatus(LabOrderStatus.ORDERED).stream()
                    .filter(o -> isDoctorAuthorizedForOrder(doctorId, o))
                    .map(this::fetchFullOrderResponse)
                    .collect(Collectors.toList());
        }

        return labOrderRepository.findByStatus(LabOrderStatus.ORDERED).stream()
                .map(this::fetchFullOrderResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getAllOrders(UserPrincipal principal) {
        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient patient = resolvePatient(principal);
            if (patient == null) return java.util.Collections.emptyList();
            return labOrderRepository.findByPatientId(patient.getId()).stream()
                    .map(this::fetchFullOrderResponse)
                    .collect(Collectors.toList());
        }

        List<LabOrder> orders = (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR)
                ? labOrderRepository.findAll().stream()
                    .filter(o -> isDoctorAuthorizedForOrder(principal.getId(), o))
                    .collect(Collectors.toList())
                : labOrderRepository.findAll();

        return orders.stream()
                .map(this::fetchFullOrderResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public LabResultResponse recordResult(Long orderId, LabResultRequest request, Long labTechUserId) {
        LabOrder order = labOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab order not found: " + orderId));

        User tech = userRepository.findById(labTechUserId).orElse(null);
        String verifierName = (tech != null && tech.getFullName() != null) ? tech.getFullName() : "Lab Technician";

        ResultFlag flag = request.getFlag() != null ? request.getFlag() : ResultFlag.NORMAL;

        LabResult result = labResultRepository.findByLabOrderId(orderId)
                .orElse(LabResult.builder().labOrderId(orderId).build());

        result.setResultValue(request.getResultValue());
        result.setReferenceRange(request.getReferenceRange());
        result.setUnit(request.getUnit());
        result.setFlag(flag);
        result.setVerifiedBy(verifierName);
        result.setRemarks(request.getRemarks());
        result.setResultDate(LocalDateTime.now());

        LabResult savedResult = labResultRepository.save(result);

        order.setStatus(LabOrderStatus.COMPLETED);
        order.setResultDate(LocalDateTime.now());
        labOrderRepository.save(order);

        auditLogService.log(labTechUserId, "LAB_RESULT_RECORDED", "LabResult", savedResult.getId(), null,
                "Order #" + orderId + " - Result: " + savedResult.getResultValue() + " (" + flag + ")");

        // Critical value notification to ordering doctor
        if (flag == ResultFlag.CRITICAL) {
            notificationService.sendNotification(order.getDoctorId(),
                    "CRITICAL LAB RESULT: Test '" + order.getTestName() + "' for patient is " + result.getResultValue() + " " + result.getUnit() + " (Ref: " + result.getReferenceRange() + ")",
                    NotificationType.LAB_ALERT, Priority.URGENT);
        } else {
            notificationService.sendNotification(order.getDoctorId(),
                    "Lab result ready: " + order.getTestName() + " (" + result.getResultValue() + " " + result.getUnit() + ")",
                    NotificationType.LAB_ALERT, Priority.LOW);
        }

        return toResultResponse(savedResult);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabResultResponse> getCriticalValues() {
        return getCriticalValues(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabResultResponse> getCriticalValues(UserPrincipal principal) {
        List<LabResult> criticals = labResultRepository.findByFlag(ResultFlag.CRITICAL);
        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatient(principal);
            if (myPatient == null) return java.util.Collections.emptyList();
            return criticals.stream()
                    .filter(r -> {
                        LabOrder order = labOrderRepository.findById(r.getLabOrderId()).orElse(null);
                        return order != null && myPatient.getId().equals(order.getPatientId());
                    })
                    .map(this::toResultResponse)
                    .collect(Collectors.toList());
        }

        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            Long doctorId = principal.getId();
            return criticals.stream()
                    .filter(r -> {
                        LabOrder order = labOrderRepository.findById(r.getLabOrderId()).orElse(null);
                        return order != null && isDoctorAuthorizedForOrder(doctorId, order);
                    })
                    .map(this::toResultResponse)
                    .collect(Collectors.toList());
        }

        return criticals.stream()
                .map(this::toResultResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public LabOrderResponse getOrderById(Long orderId) {
        return getOrderById(orderId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public LabOrderResponse getOrderById(Long orderId, UserPrincipal principal) {
        LabOrder o = labOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab order not found: " + orderId));

        if (principal != null && principal.getRole() == RoleType.ROLE_PATIENT) {
            Patient myPatient = resolvePatient(principal);
            if (myPatient == null || !myPatient.getId().equals(o.getPatientId())) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to view your own lab reports.");
            }
        }

        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            if (!isDoctorAuthorizedForOrder(principal.getId(), o)) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to access lab records for your assigned patients.");
            }
        }

        return fetchFullOrderResponse(o);
    }

    private Patient resolvePatient(UserPrincipal principal) {
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
    @Transactional(readOnly = true)
    public long getPendingOrdersCount() {
        return labOrderRepository.countByStatus(LabOrderStatus.ORDERED);
    }

    private LabOrderResponse fetchFullOrderResponse(LabOrder o) {
        Patient p = patientRepository.findById(o.getPatientId()).orElse(null);
        User doc = userRepository.findById(o.getDoctorId()).orElse(null);
        LabResult res = labResultRepository.findByLabOrderId(o.getId()).orElse(null);
        User reviewingDoc = o.getReviewedByDoctorId() != null
                ? userRepository.findById(o.getReviewedByDoctorId()).orElse(null)
                : null;
        return toOrderResponse(o, p, doc, res, reviewingDoc);
    }

    private LabOrderResponse toOrderResponse(LabOrder o, Patient p, User doc, LabResult res, User reviewingDoc) {
        return LabOrderResponse.builder()
                .id(o.getId())
                .patientId(o.getPatientId())
                .patientName(p != null ? p.getName() : "Unknown")
                .patientNumber(p != null ? p.getPatientNumber() : "N/A")
                .doctorId(o.getDoctorId())
                .doctorName(doc != null ? doc.getFullName() : "Unknown")
                .testName(o.getTestName())
                .testCode(o.getTestCode())
                .specimenType(o.getSpecimenType())
                .priority(o.getPriority() != null ? o.getPriority() : Priority.ROUTINE)
                .clinicalNotes(o.getClinicalNotes())
                .status(o.getStatus())
                .orderedDate(o.getOrderedDate())
                .receivedDate(o.getReceivedDate())
                .receivedBy(o.getReceivedBy())
                .specimenBarcode(o.getSpecimenBarcode())
                .specimenCollectedDate(o.getSpecimenCollectedDate())
                .specimenNotes(o.getSpecimenNotes())
                .testStartedDate(o.getTestStartedDate())
                .testingEquipment(o.getTestingEquipment())
                .resultDate(o.getResultDate())
                .reviewedDate(o.getReviewedDate())
                .doctorReviewNotes(o.getDoctorReviewNotes())
                .reviewedByDoctorId(o.getReviewedByDoctorId())
                .reviewedByDoctorName(reviewingDoc != null ? reviewingDoc.getFullName() : null)
                .result(res != null ? toResultResponse(res) : null)
                .build();
    }

    private LabResultResponse toResultResponse(LabResult r) {
        return LabResultResponse.builder()
                .id(r.getId())
                .labOrderId(r.getLabOrderId())
                .resultValue(r.getResultValue())
                .referenceRange(r.getReferenceRange())
                .unit(r.getUnit())
                .flag(r.getFlag())
                .verifiedBy(r.getVerifiedBy())
                .remarks(r.getRemarks())
                .resultDate(r.getResultDate())
                .build();
    }
}
