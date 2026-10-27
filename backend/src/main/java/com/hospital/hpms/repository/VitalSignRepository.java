package com.hospital.hpms.repository;

import com.hospital.hpms.entity.VitalSign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VitalSignRepository extends JpaRepository<VitalSign, Long> {

    List<VitalSign> findByPatientIdOrderByRecordedAtDesc(Long patientId);

    Optional<VitalSign> findFirstByPatientIdOrderByRecordedAtDesc(Long patientId);

    List<VitalSign> findByIsAlertTrueAndAlertAcknowledgedFalseOrderByRecordedAtDesc();

    List<VitalSign> findByRecordedAtBetweenOrderByRecordedAtDesc(LocalDateTime start, LocalDateTime end);

    long countByIsAlertTrueAndAlertAcknowledgedFalse();
}
