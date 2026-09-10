package com.hospital.hpms.repository;

import com.hospital.hpms.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    Optional<Patient> findByPatientNumber(String patientNumber);
    Optional<Patient> findByPhoneNumber(String phoneNumber);
    Optional<Patient> findByUserId(Long userId);
    
    // Duplicate detection requirement: Name, Date of Birth, Phone Number
    Optional<Patient> findByNameIgnoreCaseAndDateOfBirthAndPhoneNumber(String name, LocalDate dateOfBirth, String phoneNumber);
    
    @Query("SELECT p FROM Patient p WHERE " +
           "(cast(:query as string) IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.patientNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "p.phoneNumber LIKE CONCAT('%', :query, '%'))")
    Page<Patient> searchPatients(@Param("query") String query, Pageable pageable);

    @Query("SELECT p FROM Patient p WHERE " +
           "(cast(:query as string) IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.patientNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "p.phoneNumber LIKE CONCAT('%', :query, '%'))")
    List<Patient> searchPatientsList(@Param("query") String query);

    @Query("SELECT DISTINCT p FROM Patient p WHERE " +
           "EXISTS (SELECT 1 FROM Appointment a WHERE a.patientId = p.id AND a.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM MedicalRecord m WHERE m.patientId = p.id AND m.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM Prescription pr WHERE pr.patientId = p.id AND pr.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM LabOrder lo WHERE lo.patientId = p.id AND lo.doctorId = :doctorId)")
    List<Patient> findPatientsByDoctorId(@Param("doctorId") Long doctorId);

    @Query("SELECT DISTINCT p FROM Patient p WHERE " +
           "(EXISTS (SELECT 1 FROM Appointment a WHERE a.patientId = p.id AND a.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM MedicalRecord m WHERE m.patientId = p.id AND m.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM Prescription pr WHERE pr.patientId = p.id AND pr.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM LabOrder lo WHERE lo.patientId = p.id AND lo.doctorId = :doctorId))")
    Page<Patient> findPatientsByDoctorId(@Param("doctorId") Long doctorId, Pageable pageable);

    @Query("SELECT DISTINCT p FROM Patient p WHERE " +
           "(EXISTS (SELECT 1 FROM Appointment a WHERE a.patientId = p.id AND a.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM MedicalRecord m WHERE m.patientId = p.id AND m.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM Prescription pr WHERE pr.patientId = p.id AND pr.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM LabOrder lo WHERE lo.patientId = p.id AND lo.doctorId = :doctorId)) AND " +
           "(cast(:query as string) IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.patientNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "p.phoneNumber LIKE CONCAT('%', :query, '%'))")
    List<Patient> searchPatientsByDoctorId(@Param("doctorId") Long doctorId, @Param("query") String query);

    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Patient p WHERE p.id = :patientId AND (" +
           "EXISTS (SELECT 1 FROM Appointment a WHERE a.patientId = p.id AND a.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM MedicalRecord m WHERE m.patientId = p.id AND m.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM Prescription pr WHERE pr.patientId = p.id AND pr.doctorId = :doctorId) OR " +
           "EXISTS (SELECT 1 FROM LabOrder lo WHERE lo.patientId = p.id AND lo.doctorId = :doctorId))")
    boolean isPatientAssignedToDoctor(@Param("patientId") Long patientId, @Param("doctorId") Long doctorId);
}
