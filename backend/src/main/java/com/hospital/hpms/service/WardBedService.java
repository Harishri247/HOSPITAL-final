package com.hospital.hpms.service;

import com.hospital.hpms.dto.WardBedDto.*;

import java.util.List;

public interface WardBedService {
    WardResponse createWard(WardRequest request, Long currentUserId);
    List<WardResponse> getAllWards();
    List<WardResponse> getAllWards(com.hospital.hpms.security.UserPrincipal principal);
    WardResponse getWardById(Long id);

    BedResponse createBed(BedRequest request, Long currentUserId);
    List<BedResponse> getBedsByWard(Long wardId);
    List<BedResponse> getBedsByWard(Long wardId, com.hospital.hpms.security.UserPrincipal principal);
    List<BedResponse> getDoctorPatientBeds(Long doctorId);
    List<BedResponse> getAvailableBeds();
    BedResponse assignBed(BedAssignRequest request, Long currentUserId);
    BedResponse transferBed(BedTransferRequest request, Long currentUserId);
    BedResponse releaseBed(Long bedId, Long currentUserId);
    BedResponse updateBedStatus(Long bedId, com.hospital.hpms.entity.BedStatus status, Long currentUserId);

    long getTotalBeds();
    long getOccupiedBeds();
    double getBedOccupancyRate();
}
