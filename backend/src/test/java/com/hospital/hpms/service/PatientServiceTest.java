package com.hospital.hpms.service;

import com.hospital.hpms.dto.PatientDto.*;
import com.hospital.hpms.entity.Patient;
import com.hospital.hpms.exception.DuplicatePatientException;
import com.hospital.hpms.exception.InvalidPatientNameException;
import com.hospital.hpms.exception.InvalidPhoneNumberException;
import com.hospital.hpms.exception.PatientNotFoundException;
import com.hospital.hpms.repository.*;
import com.hospital.hpms.service.impl.PatientServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatientServiceTest {

    @Mock
    private PatientRepository patientRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private MedicalRecordRepository medicalRecordRepository;
    @Mock
    private PrescriptionRepository prescriptionRepository;
    @Mock
    private LabOrderRepository labOrderRepository;
    @Mock
    private BillRepository billRepository;
    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private PatientServiceImpl patientService;

    private PatientRequest validRequest;
    private Patient samplePatient;

    @BeforeEach
    void setUp() {
        validRequest = PatientRequest.builder()
                .name("Alex Johnson")
                .dateOfBirth(LocalDate.of(1990, 5, 20))
                .gender("Male")
                .bloodGroup("O+")
                .phoneNumber("9876543210")
                .address("123 Maple Street")
                .status("ACTIVE")
                .build();

        samplePatient = Patient.builder()
                .id(1L)
                .patientNumber("PAT-20260907-0001")
                .name("Alex Johnson")
                .dateOfBirth(LocalDate.of(1990, 5, 20))
                .gender("Male")
                .bloodGroup("O+")
                .phoneNumber("9876543210")
                .registrationDate(LocalDate.now())
                .status("ACTIVE")
                .build();
    }

    @Test
    void testRegisterPatient_Success() {
        when(patientRepository.findByNameIgnoreCaseAndDateOfBirthAndPhoneNumber(any(), any(), any()))
                .thenReturn(Optional.empty());
        when(patientRepository.count()).thenReturn(0L);
        when(patientRepository.save(any(Patient.class))).thenReturn(samplePatient);

        PatientResponse response = patientService.registerPatient(validRequest, 1L);

        assertNotNull(response);
        assertEquals("Alex Johnson", response.getName());
        assertEquals("PAT-20260907-0001", response.getPatientNumber());
        verify(auditLogService, times(1)).log(eq(1L), eq("PATIENT_REGISTERED"), eq("Patient"), any(), any(), any());
    }

    @Test
    void testRegisterPatient_DuplicatePatientThrowsException() {
        when(patientRepository.findByNameIgnoreCaseAndDateOfBirthAndPhoneNumber(any(), any(), any()))
                .thenReturn(Optional.of(samplePatient));

        assertThrows(DuplicatePatientException.class, () -> patientService.registerPatient(validRequest, 1L));
        verify(patientRepository, never()).save(any());
    }

    @Test
    void testRegisterPatient_InvalidPhoneNumberThrowsException() {
        validRequest.setPhoneNumber("12345"); // Invalid length

        assertThrows(InvalidPhoneNumberException.class, () -> patientService.registerPatient(validRequest, 1L));
    }

    @Test
    void testRegisterPatient_InvalidNameWithNumbersThrowsException() {
        validRequest.setName("Alex123 Johnson");

        assertThrows(InvalidPatientNameException.class, () -> patientService.registerPatient(validRequest, 1L));
    }

    @Test
    void testGetPatientById_NotFoundThrowsException() {
        when(patientRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(PatientNotFoundException.class, () -> patientService.getPatientById(999L));
    }
}
