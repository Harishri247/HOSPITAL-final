package com.hospital.hpms.service;

import com.hospital.hpms.dto.AppointmentDto.*;
import com.hospital.hpms.dto.ConsultationDto.*;
import com.hospital.hpms.dto.DirectBookingDto.*;
import com.hospital.hpms.entity.AppointmentStatus;
import com.hospital.hpms.security.UserPrincipal;

import java.time.LocalDate;
import java.util.List;

public interface AppointmentService {
    AppointmentResponse bookAppointment(AppointmentRequest request, Long currentUserId);
    DirectBookingResponse directOpdBooking(DirectBookingRequest request, Long currentUserId);
    List<AppointmentResponse> getAppointmentsByPatient(Long patientId);
    List<AppointmentResponse> getAppointmentsByDoctor(Long doctorId);
    AppointmentResponse getAppointmentById(Long id);
    AppointmentResponse getAppointmentById(Long id, UserPrincipal principal);
    List<AppointmentResponse> getAppointmentsByPatient(Long patientId, UserPrincipal principal);
    AppointmentResponse updateAppointment(Long id, AppointmentRequest request, Long currentUserId);
    AppointmentResponse updateStatus(Long id, AppointmentStatus status, Long currentUserId);
    void cancelAppointment(Long id, Long currentUserId);
    List<AvailableSlotResponse> getAvailableSlots(Long doctorId, LocalDate date);
    List<AppointmentResponse> filterAppointments(Long doctorId, LocalDate date, AppointmentStatus status);
    List<AppointmentResponse> filterAppointments(Long doctorId, LocalDate date, AppointmentStatus status, UserPrincipal principal);
    long getTotalAppointmentsCount();
    long getTodayAppointmentsCount();
    ConsultationResponse completeConsultation(Long appointmentId, ConsultationRequest request, UserPrincipal principal);
}

