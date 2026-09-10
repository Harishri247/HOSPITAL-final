package com.hospital.hpms.repository;

import com.hospital.hpms.entity.Appointment;
import com.hospital.hpms.entity.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatientId(Long patientId);
    List<Appointment> findByDoctorId(Long doctorId);
    List<Appointment> findByDoctorIdAndAppointmentDate(Long doctorId, LocalDate appointmentDate);
    
    boolean existsByDoctorIdAndAppointmentDateAndTimeSlotAndStatusNot(
        Long doctorId, LocalDate appointmentDate, String timeSlot, AppointmentStatus status
    );

    @Query("SELECT a FROM Appointment a WHERE " +
           "(cast(:doctorId as string) IS NULL OR a.doctorId = :doctorId) AND " +
           "(cast(:date as string) IS NULL OR a.appointmentDate = :date) AND " +
           "(cast(:status as string) IS NULL OR a.status = :status) " +
           "ORDER BY a.appointmentDate DESC, a.timeSlot ASC")
    List<Appointment> filterAppointments(
        @Param("doctorId") Long doctorId,
        @Param("date") LocalDate date,
        @Param("status") AppointmentStatus status
    );
    
    long countByStatus(AppointmentStatus status);
}
