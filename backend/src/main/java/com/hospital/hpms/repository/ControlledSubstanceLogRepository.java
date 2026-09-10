package com.hospital.hpms.repository;

import com.hospital.hpms.entity.ControlledSubstanceLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ControlledSubstanceLogRepository extends JpaRepository<ControlledSubstanceLog, Long> {
    List<ControlledSubstanceLog> findAllByOrderByTimestampDesc();
    List<ControlledSubstanceLog> findByMedicineIdOrderByTimestampDesc(Long medicineId);
}
