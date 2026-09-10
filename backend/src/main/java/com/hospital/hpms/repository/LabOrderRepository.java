package com.hospital.hpms.repository;

import com.hospital.hpms.entity.LabOrder;
import com.hospital.hpms.entity.LabOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LabOrderRepository extends JpaRepository<LabOrder, Long> {
    List<LabOrder> findByPatientId(Long patientId);
    List<LabOrder> findByDoctorId(Long doctorId);
    List<LabOrder> findByStatus(LabOrderStatus status);
    long countByStatus(LabOrderStatus status);
}
