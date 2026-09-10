package com.hospital.hpms.repository;

import com.hospital.hpms.entity.DispensingStatus;
import com.hospital.hpms.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    List<Prescription> findByPatientIdOrderByPrescriptionDateDesc(Long patientId);
    List<Prescription> findByDoctorId(Long doctorId);
    List<Prescription> findByDispensingStatus(DispensingStatus dispensingStatus);
    long countByDispensingStatus(DispensingStatus dispensingStatus);
}
