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

        LabOrder order = LabOrder.builder()
                .patientId(request.getPatientId())
                .doctorId(request.getDoctorId())
                .testName(request.getTestName())
                .testCode(request.getTestCode())
                .specimenType(request.getSpecimenType())
                .status(LabOrderStatus.ORDERED)
                .orderedDate(LocalDateTime.now())
                .build();

        LabOrder saved = labOrderRepository.save(order);
        auditLogService.log(currentUserId, "LAB_ORDER_CREATED", "LabOrder", saved.getId(), null, saved.getTestName());

        return toOrderResponse(saved, patient, doctor, null);
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

        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            Long doctorId = principal.getId();
            return labOrderRepository.findByPatientId(patientId).stream()
                    .filter(o -> o.getDoctorId() != null && o.getDoctorId().equals(doctorId))
                    .map(o -> {
                        User doc = userRepository.findById(o.getDoctorId()).orElse(null);
                        LabResult res = labResultRepository.findByLabOrderId(o.getId()).orElse(null);
                        return toOrderResponse(o, patient, doc, res);
                    })
                    .collect(Collectors.toList());
        }

        return labOrderRepository.findByPatientId(patientId).stream()
                .map(o -> {
                    User doc = userRepository.findById(o.getDoctorId()).orElse(null);
                    LabResult res = labResultRepository.findByLabOrderId(o.getId()).orElse(null);
                    return toOrderResponse(o, patient, doc, res);
                })
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
                    .map(o -> {
                        Patient p = patientRepository.findById(o.getPatientId()).orElse(null);
                        User doc = userRepository.findById(o.getDoctorId()).orElse(null);
                        return toOrderResponse(o, p, doc, null);
                    })
                    .collect(Collectors.toList());
        }

        return labOrderRepository.findByStatus(LabOrderStatus.ORDERED).stream()
                .map(o -> {
                    Patient p = patientRepository.findById(o.getPatientId()).orElse(null);
                    User doc = userRepository.findById(o.getDoctorId()).orElse(null);
                    return toOrderResponse(o, p, doc, null);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getAllOrders(UserPrincipal principal) {
        List<LabOrder> orders = (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR)
                ? labOrderRepository.findAll().stream()
                    .filter(o -> isDoctorAuthorizedForOrder(principal.getId(), o))
                    .collect(Collectors.toList())
                : labOrderRepository.findAll();

        return orders.stream()
                .map(o -> {
                    Patient p = patientRepository.findById(o.getPatientId()).orElse(null);
                    User doc = userRepository.findById(o.getDoctorId()).orElse(null);
                    LabResult res = labResultRepository.findByLabOrderId(o.getId()).orElse(null);
                    return toOrderResponse(o, p, doc, res);
                })
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

        if (principal != null && principal.getRole() == RoleType.ROLE_DOCTOR) {
            if (!isDoctorAuthorizedForOrder(principal.getId(), o)) {
                throw new UnauthorizedAccessException("Access denied: You are only authorized to access lab records for your assigned patients.");
            }
        }

        Patient p = patientRepository.findById(o.getPatientId()).orElse(null);
        User doc = userRepository.findById(o.getDoctorId()).orElse(null);
        LabResult res = labResultRepository.findByLabOrderId(orderId).orElse(null);
        return toOrderResponse(o, p, doc, res);
    }

    @Override
    @Transactional(readOnly = true)
    public long getPendingOrdersCount() {
        return labOrderRepository.countByStatus(LabOrderStatus.ORDERED);
    }

    private LabOrderResponse toOrderResponse(LabOrder o, Patient p, User doc, LabResult res) {
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
                .status(o.getStatus())
                .orderedDate(o.getOrderedDate())
                .resultDate(o.getResultDate())
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
                .resultDate(r.getResultDate())
                .build();
    }
}
