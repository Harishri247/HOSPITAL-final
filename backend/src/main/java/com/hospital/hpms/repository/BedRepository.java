package com.hospital.hpms.repository;

import com.hospital.hpms.entity.Bed;
import com.hospital.hpms.entity.BedStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BedRepository extends JpaRepository<Bed, Long> {
    List<Bed> findByWardId(Long wardId);
    List<Bed> findByStatus(BedStatus status);
    Optional<Bed> findByPatientId(Long patientId);
    Optional<Bed> findByWardIdAndBedNumber(Long wardId, String bedNumber);
    long countByStatus(BedStatus status);
    long countByWardIdAndStatus(Long wardId, BedStatus status);

    @org.springframework.data.jpa.repository.Query("SELECT b FROM Bed b WHERE b.status = com.hospital.hpms.entity.BedStatus.OCCUPIED AND b.patientId IS NOT NULL AND (" +
           "EXISTS (SELECT 1 FROM Appointment a WHERE a.patientId = b.patientId AND a.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM MedicalRecord m WHERE m.patientId = b.patientId AND m.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM Prescription pr WHERE pr.patientId = b.patientId AND pr.doctorId = :doctorId))")
    List<Bed> findBedsOccupiedByDoctorPatients(@org.springframework.data.repository.query.Param("doctorId") Long doctorId);

    @org.springframework.data.jpa.repository.Query("SELECT b FROM Bed b WHERE b.wardId = :wardId AND b.status = com.hospital.hpms.entity.BedStatus.OCCUPIED AND b.patientId IS NOT NULL AND (" +
           "EXISTS (SELECT 1 FROM Appointment a WHERE a.patientId = b.patientId AND a.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM MedicalRecord m WHERE m.patientId = b.patientId AND m.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM Prescription pr WHERE pr.patientId = b.patientId AND pr.doctorId = :doctorId))")
    List<Bed> findBedsOccupiedByDoctorPatientsInWard(
            @org.springframework.data.repository.query.Param("wardId") Long wardId,
            @org.springframework.data.repository.query.Param("doctorId") Long doctorId
    );
}
