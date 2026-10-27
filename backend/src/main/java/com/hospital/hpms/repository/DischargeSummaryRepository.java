package com.hospital.hpms.repository;

import com.hospital.hpms.entity.DischargeStatus;
import com.hospital.hpms.entity.DischargeSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DischargeSummaryRepository extends JpaRepository<DischargeSummary, Long> {
    Optional<DischargeSummary> findByAdmissionOrderId(Long admissionOrderId);
    List<DischargeSummary> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<DischargeSummary> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
    List<DischargeSummary> findByStatusOrderByCreatedAtDesc(DischargeStatus status);
    boolean existsByAdmissionOrderIdAndIsSignedTrue(Long admissionOrderId);
    boolean existsByAdmissionOrderIdAndBillingClearedTrue(Long admissionOrderId);
}
