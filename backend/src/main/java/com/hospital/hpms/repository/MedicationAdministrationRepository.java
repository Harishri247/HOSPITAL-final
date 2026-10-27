package com.hospital.hpms.repository;

import com.hospital.hpms.entity.MedicationAdministration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MedicationAdministrationRepository extends JpaRepository<MedicationAdministration, Long> {

    List<MedicationAdministration> findByPatientIdOrderByAdministeredAtDesc(Long patientId);

    List<MedicationAdministration> findByPrescriptionIdOrderByAdministeredAtDesc(Long prescriptionId);

    List<MedicationAdministration> findByAdministeredAtBetweenOrderByAdministeredAtDesc(LocalDateTime start, LocalDateTime end);

    List<MedicationAdministration> findByPatientIdAndAdministeredAtBetween(Long patientId, LocalDateTime start, LocalDateTime end);
}
