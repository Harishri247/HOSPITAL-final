package com.hospital.hpms.service;

import com.hospital.hpms.dto.AdminDto.UpdateUserRequest;
import com.hospital.hpms.dto.AuthDto.UserProfileResponse;
import com.hospital.hpms.entity.RoleType;
import com.hospital.hpms.entity.User;
import com.hospital.hpms.exception.InvalidOperationException;
import com.hospital.hpms.repository.*;
import com.hospital.hpms.service.impl.AdminServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private WardBedService wardBedService;
    @Mock
    private BillingService billingService;
    @Mock
    private LabService labService;
    @Mock
    private PrescriptionService prescriptionService;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminServiceImpl adminService;

    private User patientUser;
    private User staffUser;

    @BeforeEach
    void setUp() {
        patientUser = User.builder()
                .id(10L)
                .username("patient_john")
                .email("patient@gmail.com")
                .fullName("John Patient")
                .role(RoleType.ROLE_PATIENT)
                .active(true)
                .build();

        staffUser = User.builder()
                .id(20L)
                .username("nurse_mary")
                .email("nurse@gmail.com")
                .fullName("Mary Nurse")
                .role(RoleType.ROLE_NURSE)
                .active(true)
                .build();
    }

    @Test
    void testUpdateUserRole_PatientToDoctor_ThrowsInvalidOperationException() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(patientUser));

        InvalidOperationException ex = assertThrows(InvalidOperationException.class, () ->
                adminService.updateUserRole(10L, RoleType.ROLE_DOCTOR, 1L));

        assertEquals("Cannot change the role of a patient to any other role", ex.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testUpdateUserRole_PatientToAdmin_ThrowsInvalidOperationException() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(patientUser));

        InvalidOperationException ex = assertThrows(InvalidOperationException.class, () ->
                adminService.updateUserRole(10L, RoleType.ROLE_ADMIN, 1L));

        assertEquals("Cannot change the role of a patient to any other role", ex.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testUpdateUserRole_PatientToPatient_Succeeds() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(patientUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfileResponse res = adminService.updateUserRole(10L, RoleType.ROLE_PATIENT, 1L);

        assertNotNull(res);
        assertEquals(RoleType.ROLE_PATIENT, res.getRole());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void testUpdateUserRole_StaffRoleChange_Succeeds() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(staffUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfileResponse res = adminService.updateUserRole(20L, RoleType.ROLE_DOCTOR, 1L);

        assertNotNull(res);
        assertEquals(RoleType.ROLE_DOCTOR, res.getRole());
        verify(userRepository).save(staffUser);
    }

    @Test
    void testUpdateUser_PatientToDoctor_ThrowsInvalidOperationException() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(patientUser));

        UpdateUserRequest req = new UpdateUserRequest();
        req.setFullName("John Updated");
        req.setUsername("patient_john");
        req.setEmail("patient@gmail.com");
        req.setRole(RoleType.ROLE_DOCTOR);

        InvalidOperationException ex = assertThrows(InvalidOperationException.class, () ->
                adminService.updateUser(10L, req, 1L));

        assertEquals("Cannot change the role of a patient to any other role", ex.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testUpdateUser_PatientKeepingPatientRole_Succeeds() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(patientUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateUserRequest req = new UpdateUserRequest();
        req.setFullName("John Updated");
        req.setUsername("patient_john");
        req.setEmail("patient@gmail.com");
        req.setRole(RoleType.ROLE_PATIENT);

        UserProfileResponse res = adminService.updateUser(10L, req, 1L);

        assertNotNull(res);
        assertEquals(RoleType.ROLE_PATIENT, res.getRole());
        assertEquals("John Updated", res.getFullName());
        verify(userRepository).save(patientUser);
    }

    @Test
    void testUpdateUser_NonGmailDomain_ThrowsIllegalArgumentException() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(staffUser));

        UpdateUserRequest req = new UpdateUserRequest();
        req.setFullName("Mary Updated");
        req.setUsername("nurse_mary");
        req.setEmail("nurse@yahoo.com");
        req.setRole(RoleType.ROLE_NURSE);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                adminService.updateUser(20L, req, 1L));

        assertEquals("Email ID must end with @gmail.com", ex.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }
}
