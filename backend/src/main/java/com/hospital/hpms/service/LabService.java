package com.hospital.hpms.service;

import com.hospital.hpms.dto.LabDto.*;
import com.hospital.hpms.security.UserPrincipal;

import java.util.List;

public interface LabService {
    LabOrderResponse createOrder(LabOrderRequest request, Long currentUserId);
    List<LabOrderResponse> getOrdersByPatient(Long patientId);
    List<LabOrderResponse> getOrdersByPatient(Long patientId, UserPrincipal principal);
    List<LabOrderResponse> getPendingOrders();
    List<LabOrderResponse> getPendingOrders(UserPrincipal principal);
    List<LabOrderResponse> getAllOrders(UserPrincipal principal);
    LabResultResponse recordResult(Long orderId, LabResultRequest request, Long labTechUserId);
    List<LabResultResponse> getCriticalValues();
    List<LabResultResponse> getCriticalValues(UserPrincipal principal);
    LabOrderResponse getOrderById(Long orderId);
    LabOrderResponse getOrderById(Long orderId, UserPrincipal principal);
    long getPendingOrdersCount();

    // End-to-end workflow transitions
    LabOrderResponse receiveOrder(Long orderId, ReceiveOrderRequest request, Long labTechUserId);
    LabOrderResponse collectSpecimen(Long orderId, CollectSpecimenRequest request, Long labTechUserId);
    LabOrderResponse startTesting(Long orderId, StartTestingRequest request, Long labTechUserId);
    LabOrderResponse doctorReview(Long orderId, DoctorReviewRequest request, Long doctorId);
}
