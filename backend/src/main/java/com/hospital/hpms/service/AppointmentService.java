package com.hospital.hpms.service;

import com.hospital.hpms.dto.AppointmentDto.*;
import com.hospital.hpms.entity.AppointmentStatus;

import java.time.LocalDate;
import java.util.List;

public interface AppointmentService {
    AppointmentResponse bookAppointment(AppointmentRequest request, Long currentUserId);
    List<AppointmentResponse> getAppointmentsByPatient(Long patientId);
    List<AppointmentResponse> getAppointmentsByDoctor(Long doctorId);
    AppointmentResponse getAppointmentById(Long id);
    AppointmentResponse updateAppointment(Long id, AppointmentRequest request, Long currentUserId);
    AppointmentResponse updateStatus(Long id, AppointmentStatus status, Long currentUserId);
    void cancelAppointment(Long id, Long currentUserId);
    List<AvailableSlotResponse> getAvailableSlots(Long doctorId, LocalDate date);
    List<AppointmentResponse> filterAppointments(Long doctorId, LocalDate date, AppointmentStatus status);
    long getTotalAppointmentsCount();
    long getTodayAppointmentsCount();
}
