package com.hospital.hpms.service;

import com.hospital.hpms.dto.AppointmentDto.*;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.AppointmentConflictException;
import com.hospital.hpms.repository.*;
import com.hospital.hpms.service.impl.AppointmentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceTest {

    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AppointmentServiceImpl appointmentService;

    private AppointmentRequest request;
    private Patient patient;
    private User doctor;
    private Appointment appointment;

    @BeforeEach
    void setUp() {
        request = AppointmentRequest.builder()
                .patientId(1L)
                .doctorId(2L)
                .appointmentDate(LocalDate.now().plusDays(1))
                .timeSlot("10:00 - 10:30")
                .type(AppointmentType.OPD)
                .notes("Follow up")
                .build();

        patient = Patient.builder()
                .id(1L)
                .patientNumber("PAT-20260907-0001")
                .name("Alex Johnson")
                .build();

        doctor = User.builder()
                .id(2L)
                .fullName("Dr. Sarah Smith")
                .role(RoleType.ROLE_DOCTOR)
                .build();

        appointment = Appointment.builder()
                .id(10L)
                .patientId(1L)
                .doctorId(2L)
                .appointmentDate(LocalDate.now().plusDays(1))
                .timeSlot("10:00 - 10:30")
                .type(AppointmentType.OPD)
                .status(AppointmentStatus.CONFIRMED)
                .queueNumber(1)
                .build();
    }

    @Test
    void testBookAppointment_Success() {
        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(userRepository.findById(2L)).thenReturn(Optional.of(doctor));
        when(appointmentRepository.existsByDoctorIdAndAppointmentDateAndTimeSlotAndStatusNot(any(), any(), any(), any()))
                .thenReturn(false);
        when(appointmentRepository.findByDoctorIdAndAppointmentDate(any(), any()))
                .thenReturn(Collections.emptyList());
        when(appointmentRepository.save(any(Appointment.class))).thenReturn(appointment);

        AppointmentResponse response = appointmentService.bookAppointment(request, 1L);

        assertNotNull(response);
        assertEquals(AppointmentStatus.CONFIRMED, response.getStatus());
        assertEquals("Alex Johnson", response.getPatientName());
        assertEquals("Dr. Sarah Smith", response.getDoctorName());
    }

    @Test
    void testBookAppointment_ConflictThrowsException() {
        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(userRepository.findById(2L)).thenReturn(Optional.of(doctor));
        when(appointmentRepository.existsByDoctorIdAndAppointmentDateAndTimeSlotAndStatusNot(eq(2L), any(), eq("10:00 - 10:30"), any()))
                .thenReturn(true);

        assertThrows(AppointmentConflictException.class, () -> appointmentService.bookAppointment(request, 1L));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    void testUpdateStatus_Confirmed_TriggersNotifications() {
        Appointment scheduledAppt = Appointment.builder()
                .id(10L)
                .patientId(1L)
                .doctorId(2L)
                .appointmentDate(LocalDate.now().plusDays(1))
                .timeSlot("10:00 - 10:30")
                .type(AppointmentType.OPD)
                .status(AppointmentStatus.SCHEDULED)
                .build();

        patient.setUserId(101L);

        when(appointmentRepository.findById(10L)).thenReturn(Optional.of(scheduledAppt));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(i -> i.getArgument(0));
        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(userRepository.findById(2L)).thenReturn(Optional.of(doctor));

        AppointmentResponse response = appointmentService.updateStatus(10L, AppointmentStatus.CONFIRMED, 1L);

        assertEquals(AppointmentStatus.CONFIRMED, response.getStatus());
        // Verify doctor notification
        verify(notificationService).sendNotification(
                eq(2L),
                contains("Appointment confirmed: Alex Johnson"),
                eq(NotificationType.APPOINTMENT_CONFIRMED),
                eq(Priority.MEDIUM)
        );
        // Verify patient notification
        verify(notificationService).sendNotification(
                eq(101L),
                contains("is confirmed"),
                eq(NotificationType.APPOINTMENT_CONFIRMED),
                eq(Priority.MEDIUM)
        );
    }

    @Test
    void testUpdateStatus_Cancelled_TriggersDoctorNotification() {
        Appointment confirmedAppt = Appointment.builder()
                .id(10L)
                .patientId(1L)
                .doctorId(2L)
                .appointmentDate(LocalDate.now().plusDays(1))
                .timeSlot("10:00 - 10:30")
                .type(AppointmentType.OPD)
                .status(AppointmentStatus.CONFIRMED)
                .build();

        when(appointmentRepository.findById(10L)).thenReturn(Optional.of(confirmedAppt));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(i -> i.getArgument(0));
        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(userRepository.findById(2L)).thenReturn(Optional.of(doctor));

        AppointmentResponse response = appointmentService.updateStatus(10L, AppointmentStatus.CANCELLED, 1L);

        assertEquals(AppointmentStatus.CANCELLED, response.getStatus());
        verify(notificationService).sendNotification(
                eq(2L),
                contains("Appointment cancelled: Alex Johnson"),
                eq(NotificationType.APPOINTMENT_CANCELLED),
                eq(Priority.MEDIUM)
        );
    }

    @Test
    void testUpdateStatus_NoShow_TriggersDoctorNotification() {
        Appointment confirmedAppt = Appointment.builder()
                .id(10L)
                .patientId(1L)
                .doctorId(2L)
                .appointmentDate(LocalDate.now().plusDays(1))
                .timeSlot("10:00 - 10:30")
                .type(AppointmentType.OPD)
                .status(AppointmentStatus.CONFIRMED)
                .build();

        when(appointmentRepository.findById(10L)).thenReturn(Optional.of(confirmedAppt));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(i -> i.getArgument(0));
        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(userRepository.findById(2L)).thenReturn(Optional.of(doctor));

        AppointmentResponse response = appointmentService.updateStatus(10L, AppointmentStatus.NO_SHOW, 1L);

        assertEquals(AppointmentStatus.NO_SHOW, response.getStatus());
        verify(notificationService).sendNotification(
                eq(2L),
                contains("Appointment marked as No-Show: Alex Johnson"),
                eq(NotificationType.APPOINTMENT_NO_SHOW),
                eq(Priority.MEDIUM)
        );
    }
}
