package com.hospital.hpms.service;

import com.hospital.hpms.dto.WardBedDto.*;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.BedUnavailableException;
import com.hospital.hpms.repository.*;
import com.hospital.hpms.service.impl.WardBedServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WardBedServiceTest {

    @Mock
    private WardRepository wardRepository;
    @Mock
    private BedRepository bedRepository;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private WardBedServiceImpl wardBedService;

    private Ward ward;
    private Bed availableBed;
    private Bed occupiedBed;
    private Patient patient;

    @BeforeEach
    void setUp() {
        ward = Ward.builder().id(1L).wardName("ICU").totalBeds(5).occupiedBeds(1).build();
        availableBed = Bed.builder().id(10L).wardId(1L).bedNumber("ICU-101").status(BedStatus.AVAILABLE).build();
        occupiedBed = Bed.builder().id(11L).wardId(1L).bedNumber("ICU-102").status(BedStatus.OCCUPIED).patientId(9L).build();
        patient = Patient.builder().id(2L).name("Jane Doe").patientNumber("PAT-002").build();
    }

    @Test
    void testAssignBed_Success() {
        when(bedRepository.findById(10L)).thenReturn(Optional.of(availableBed));
        when(patientRepository.findById(2L)).thenReturn(Optional.of(patient));
        when(bedRepository.findByPatientId(2L)).thenReturn(Optional.empty());
        when(wardRepository.findById(1L)).thenReturn(Optional.of(ward));
        when(bedRepository.save(any(Bed.class))).thenAnswer(i -> i.getArgument(0));
        when(bedRepository.countByWardIdAndStatus(1L, BedStatus.OCCUPIED)).thenReturn(2L);

        BedAssignRequest req = BedAssignRequest.builder().bedId(10L).patientId(2L).build();
        BedResponse res = wardBedService.assignBed(req, 1L);

        assertNotNull(res);
        assertEquals(BedStatus.OCCUPIED, res.getStatus());
        assertEquals("Jane Doe", res.getPatientName());
        assertEquals(2, ward.getOccupiedBeds());
    }

    @Test
    void testAssignBed_OccupiedBedThrowsException() {
        when(bedRepository.findById(11L)).thenReturn(Optional.of(occupiedBed));

        BedAssignRequest req = BedAssignRequest.builder().bedId(11L).patientId(2L).build();
        assertThrows(BedUnavailableException.class, () -> wardBedService.assignBed(req, 1L));
    }

    @Test
    void testAssignBed_MaintenanceBedThrowsException() {
        Bed maintenanceBed = Bed.builder().id(12L).wardId(1L).bedNumber("ICU-103").status(BedStatus.MAINTENANCE).build();
        when(bedRepository.findById(12L)).thenReturn(Optional.of(maintenanceBed));

        BedAssignRequest req = BedAssignRequest.builder().bedId(12L).patientId(2L).build();
        assertThrows(BedUnavailableException.class, () -> wardBedService.assignBed(req, 1L));
    }

    @Test
    void testAssignBed_NonexistentBedThrowsException() {
        when(bedRepository.findById(999L)).thenReturn(Optional.empty());

        BedAssignRequest req = BedAssignRequest.builder().bedId(999L).patientId(2L).build();
        assertThrows(com.hospital.hpms.exception.ResourceNotFoundException.class, () -> wardBedService.assignBed(req, 1L));
    }

    @Test
    void testCreateWard_GeneratesPhysicalBeds() {
        WardRequest request = WardRequest.builder()
                .wardName("Emergency Ward")
                .wardType(WardType.EMERGENCY)
                .totalBeds(4)
                .departmentId(1L)
                .floorNumber(1)
                .build();

        when(wardRepository.save(any(Ward.class))).thenAnswer(i -> {
            Ward w = i.getArgument(0);
            w.setId(100L);
            return w;
        });

        WardResponse response = wardBedService.createWard(request, 1L);

        assertNotNull(response);
        assertEquals(100L, response.getId());
        assertEquals(4, response.getTotalBeds());

        // Verify that bedRepository.saveAll was called with exactly 4 physical Bed records
        verify(bedRepository, times(1)).saveAll(argThat(beds -> {
            java.util.List<Bed> list = (java.util.List<Bed>) beds;
            return list.size() == 4 &&
                    list.stream().allMatch(b -> b.getWardId().equals(100L) && b.getStatus() == BedStatus.AVAILABLE);
        }));
    }
}
