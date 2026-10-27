package com.hospital.hpms.repository;

import com.hospital.hpms.entity.DispensingStatus;
import com.hospital.hpms.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    List<Prescription> findByPatientIdOrderByPrescriptionDateDesc(Long patientId);
    List<Prescription> findByMedicalRecordId(Long medicalRecordId);
    List<Prescription> findByPatientIdAndDoctorIdAndPrescriptionDate(Long patientId, Long doctorId, java.time.LocalDate prescriptionDate);
    List<Prescription> findByDoctorId(Long doctorId);
    List<Prescription> findByDoctorIdOrderByPrescriptionDateDesc(Long doctorId);
    List<Prescription> findByDispensingStatus(DispensingStatus dispensingStatus);
    List<Prescription> findByDispensingStatusOrderByPrescriptionDateDesc(DispensingStatus dispensingStatus);
    List<Prescription> findAllByOrderByPrescriptionDateDesc();
    long countByDispensingStatus(DispensingStatus dispensingStatus);

    @Query("SELECT DISTINCT pr FROM Prescription pr WHERE " +
           "pr.doctorId = :doctorId OR " +
           "EXISTS (SELECT 1 FROM Appointment a WHERE a.patientId = pr.patientId AND a.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM MedicalRecord m WHERE m.patientId = pr.patientId AND m.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM LabOrder lo WHERE lo.patientId = pr.patientId AND lo.doctorId = :doctorId) " +
           "ORDER BY pr.prescriptionDate DESC, pr.id DESC")
    List<Prescription> findByDoctorOrDoctorPatients(@Param("doctorId") Long doctorId);

    @Query("SELECT DISTINCT pr FROM Prescription pr WHERE pr.dispensingStatus = :status AND (" +
           "pr.doctorId = :doctorId OR " +
           "EXISTS (SELECT 1 FROM Appointment a WHERE a.patientId = pr.patientId AND a.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM MedicalRecord m WHERE m.patientId = pr.patientId AND m.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM LabOrder lo WHERE lo.patientId = pr.patientId AND lo.doctorId = :doctorId)) " +
           "ORDER BY pr.prescriptionDate DESC, pr.id DESC")
    List<Prescription> findByDispensingStatusAndDoctorOrDoctorPatients(@Param("status") DispensingStatus status, @Param("doctorId") Long doctorId);
}

