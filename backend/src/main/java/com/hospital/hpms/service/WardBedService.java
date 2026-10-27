package com.hospital.hpms.service;

import com.hospital.hpms.dto.AdmissionOrderDto.*;
import com.hospital.hpms.dto.WardBedDto.*;
import com.hospital.hpms.security.UserPrincipal;

import java.util.List;

public interface WardBedService {
    WardResponse createWard(WardRequest request, Long currentUserId);
    List<WardResponse> getAllWards();
    List<WardResponse> getAllWards(UserPrincipal principal);
    WardResponse getWardById(Long id);

    BedResponse createBed(BedRequest request, Long currentUserId);
    List<BedResponse> getBedsByWard(Long wardId);
    List<BedResponse> getBedsByWard(Long wardId, UserPrincipal principal);
    List<BedResponse> getDoctorPatientBeds(Long doctorId);
    List<BedResponse> getAvailableBeds();
    BedResponse assignBed(BedAssignRequest request, Long currentUserId);
    BedResponse transferBed(BedTransferRequest request, Long currentUserId);
    BedResponse releaseBed(Long bedId, Long currentUserId);
    BedResponse updateBedStatus(Long bedId, com.hospital.hpms.entity.BedStatus status, Long currentUserId);

    // Inpatient Admission Orders Workflow
    AdmissionOrderResponse createAdmissionOrder(AdmissionOrderRequest request, UserPrincipal principal);
    List<AdmissionOrderResponse> getPendingAdmissionOrders(UserPrincipal principal);
    List<AdmissionOrderResponse> getAllAdmissionOrders(String status, Long doctorId, UserPrincipal principal);
    List<AdmissionOrderResponse> getAdmissionOrdersByPatient(Long patientId, UserPrincipal principal);
    AdmissionOrderResponse cancelAdmissionOrder(Long orderId, UserPrincipal principal);

    long getTotalBeds();
    long getOccupiedBeds();
    double getBedOccupancyRate();
}

