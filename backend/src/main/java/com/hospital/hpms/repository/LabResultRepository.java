package com.hospital.hpms.repository;

import com.hospital.hpms.entity.LabResult;
import com.hospital.hpms.entity.ResultFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LabResultRepository extends JpaRepository<LabResult, Long> {
    Optional<LabResult> findByLabOrderId(Long labOrderId);
    List<LabResult> findByFlag(ResultFlag flag);
}
