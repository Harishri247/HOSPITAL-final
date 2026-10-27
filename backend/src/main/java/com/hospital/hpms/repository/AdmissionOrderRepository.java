package com.hospital.hpms.repository;

import com.hospital.hpms.entity.AdmissionOrder;
import com.hospital.hpms.entity.AdmissionOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdmissionOrderRepository extends JpaRepository<AdmissionOrder, Long> {
    List<AdmissionOrder> findByStatusOrderByOrderDateDesc(AdmissionOrderStatus status);
    Optional<AdmissionOrder> findFirstByPatientIdAndStatusOrderByOrderDateDesc(Long patientId, AdmissionOrderStatus status);
    List<AdmissionOrder> findByDoctorIdOrderByOrderDateDesc(Long doctorId);
    List<AdmissionOrder> findByDoctorIdAndStatusOrderByOrderDateDesc(Long doctorId, AdmissionOrderStatus status);
    List<AdmissionOrder> findByPatientIdOrderByOrderDateDesc(Long patientId);
    List<AdmissionOrder> findAllByOrderByOrderDateDesc();

    @Query("SELECT DISTINCT ao FROM AdmissionOrder ao WHERE " +
           "ao.doctorId = :doctorId OR " +
           "EXISTS (SELECT 1 FROM Appointment a WHERE a.patientId = ao.patientId AND a.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM MedicalRecord m WHERE m.patientId = ao.patientId AND m.doctorId = :doctorId) " +
           "ORDER BY ao.orderDate DESC")
    List<AdmissionOrder> findByDoctorOrDoctorPatients(@Param("doctorId") Long doctorId);

    @Query("SELECT DISTINCT ao FROM AdmissionOrder ao WHERE ao.status = :status AND (" +
           "ao.doctorId = :doctorId OR " +
           "EXISTS (SELECT 1 FROM Appointment a WHERE a.patientId = ao.patientId AND a.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM MedicalRecord m WHERE m.patientId = ao.patientId AND m.doctorId = :doctorId)) " +
           "ORDER BY ao.orderDate DESC")
    List<AdmissionOrder> findByStatusAndDoctorOrDoctorPatients(@Param("status") AdmissionOrderStatus status, @Param("doctorId") Long doctorId);
}
