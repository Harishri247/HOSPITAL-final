package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.AdminDto.*;
import com.hospital.hpms.dto.AuthDto.RegisterRequest;
import com.hospital.hpms.dto.AuthDto.UserProfileResponse;
import com.hospital.hpms.entity.*;
import com.hospital.hpms.exception.InvalidOperationException;
import com.hospital.hpms.exception.ResourceNotFoundException;
import com.hospital.hpms.repository.*;
import com.hospital.hpms.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.management.ManagementFactory;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final WardBedService wardBedService;
    private final BillingService billingService;
    private final LabService labService;
    private final PrescriptionService prescriptionService;
    private final DepartmentRepository departmentRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public AnalyticsResponse getAnalytics() {
        long totalPatients = patientRepository.count();
        long totalDoctors = userRepository.countByRole(RoleType.ROLE_DOCTOR);
        long totalStaff = userRepository.count() - totalDoctors - userRepository.countByRole(RoleType.ROLE_PATIENT);
        long totalAppointments = appointmentRepository.count();
        long todayAppointments = appointmentRepository.filterAppointments(null, LocalDate.now(), null).size();

        long totalBeds = wardBedService.getTotalBeds();
        long occupiedBeds = wardBedService.getOccupiedBeds();
        double occupancyRate = wardBedService.getBedOccupancyRate();

        BigDecimal revenue = billingService.getTotalRevenue();
        BigDecimal outstanding = billingService.getOutstandingBalance();

        long pendingLabs = labService.getPendingOrdersCount();
        long pendingPrescriptions = prescriptionService.getPendingPrescriptionsCount();

        // Appointment breakdown by status
        Map<String, Long> appStats = new HashMap<>();
        for (AppointmentStatus status : AppointmentStatus.values()) {
            appStats.put(status.name(), appointmentRepository.countByStatus(status));
        }

        // Department breakdown
        Map<String, Long> deptStats = new HashMap<>();
        for (Department dept : departmentRepository.findAll()) {
            long count = userRepository.findByDepartmentId(dept.getId()).size();
            deptStats.put(dept.getName(), count);
        }

        // Recent audit activities
        List<RecentActivity> activities = auditLogRepository.findAllByOrderByTimestampDesc().stream()
                .limit(8)
                .map(a -> RecentActivity.builder()
                        .title(a.getAction())
                        .description(a.getEntityType() + " #" + (a.getEntityId() != null ? a.getEntityId() : "") + " " + (a.getNewValue() != null ? a.getNewValue() : ""))
                        .time(a.getTimestamp().toString().replace('T', ' ').substring(0, 16))
                        .type(a.getEntityType())
                        .build())
                .collect(Collectors.toList());

        return AnalyticsResponse.builder()
                .totalPatients(totalPatients)
                .totalDoctors(totalDoctors)
                .totalStaff(totalStaff)
                .totalAppointments(totalAppointments)
                .todayAppointments(todayAppointments)
                .totalBeds(totalBeds)
                .occupiedBeds(occupiedBeds)
                .bedOccupancyPercentage(Math.round(occupancyRate * 10.0) / 10.0)
                .totalRevenue(revenue)
                .outstandingBalance(outstanding)
                .pendingLabTests(pendingLabs)
                .pendingPrescriptions(pendingPrescriptions)
                .appointmentStats(appStats)
                .departmentStats(deptStats)
                .recentActivities(activities)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public SystemHealthResponse getSystemHealth() {
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
        long hours = uptimeMs / (1000 * 60 * 60);
        long minutes = (uptimeMs % (1000 * 60 * 60)) / (1000 * 60);

        return SystemHealthResponse.builder()
                .status("UP")
                .database("HEALTHY (Connected)")
                .activeSessions(userRepository.count())
                .totalUsers(userRepository.count())
                .version("1.0.0-SPRING-BOOT-3.3.4")
                .uptime(hours + "h " + minutes + "m")
                .build();
    }

    @Override
    @Transactional
    public void broadcastNotification(String message, Long senderId) {
        List<User> allUsers = userRepository.findAll();
        for (User u : allUsers) {
            notificationService.sendNotification(u.getId(), message, NotificationType.SYSTEM, Priority.HIGH);
        }
        auditLogService.log(senderId, "SYSTEM_BROADCAST", "System", null, null, message);
    }

    @Override
    @Transactional
    public List<UserProfileResponse> getAllUsers() {
        Map<Long, String> deptMap = departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getId, Department::getName));

        List<User> users = userRepository.findAll();
        for (User u : users) {
            String email = u.getEmail();
            if (email == null || !email.trim().toLowerCase().endsWith("@gmail.com")) {
                String localPart = (email != null && email.contains("@"))
                        ? email.substring(0, email.indexOf('@')).trim()
                        : (u.getUsername() != null ? u.getUsername().trim() : "user" + u.getId());
                if (localPart.isEmpty()) {
                    localPart = u.getUsername() != null ? u.getUsername().trim() : "user" + u.getId();
                }
                localPart = localPart.replaceAll("[^a-zA-Z0-9._-]", "");
                if (localPart.isEmpty()) {
                    localPart = "user" + u.getId();
                }

                String candidateEmail = (localPart + "@gmail.com").toLowerCase();
                int counter = 1;
                while (userRepository.existsByEmail(candidateEmail) &&
                        !userRepository.findByEmail(candidateEmail).map(existing -> existing.getId().equals(u.getId())).orElse(false)) {
                    candidateEmail = (localPart + counter + "@gmail.com").toLowerCase();
                    counter++;
                }

                u.setEmail(candidateEmail);
                userRepository.save(u);
            }
        }

        return users.stream()
                .map(u -> UserProfileResponse.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .email(u.getEmail())
                        .fullName(u.getFullName())
                        .role(u.getRole())
                        .staffId(u.getStaffId())
                        .departmentId(u.getDepartmentId())
                        .departmentName(u.getDepartmentId() != null ? deptMap.get(u.getDepartmentId()) : null)
                        .phoneNumber(u.getPhoneNumber())
                        .active(u.isActive())
                        .createdAt(u.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserProfileResponse createUser(RegisterRequest request, Long adminId) {
        if (request.getEmail() == null || !request.getEmail().trim().toLowerCase().endsWith("@gmail.com")) {
            throw new IllegalArgumentException("Email ID must end with @gmail.com");
        }
        if (userRepository.existsByUsername(request.getUsername().trim())) {
            throw new IllegalArgumentException("Username already exists: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail().trim())) {
            throw new IllegalArgumentException("Email already registered: " + request.getEmail());
        }
        if (request.getStaffId() != null && !request.getStaffId().trim().isEmpty()) {
            if (userRepository.existsByStaffId(request.getStaffId().trim())) {
                throw new IllegalArgumentException("Staff ID already in use: " + request.getStaffId());
            }
        }

        RoleType role = request.getRole() != null ? request.getRole() : RoleType.ROLE_DOCTOR;

        User user = User.builder()
                .username(request.getUsername().trim())
                .email(request.getEmail().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .role(role)
                .staffId(request.getStaffId() != null && !request.getStaffId().trim().isEmpty() ? request.getStaffId().trim() : null)
                .departmentId(request.getDepartmentId())
                .phoneNumber(request.getPhoneNumber() != null && !request.getPhoneNumber().trim().isEmpty() ? request.getPhoneNumber().trim() : null)
                .active(true)
                .build();

        User saved = userRepository.save(user);
        auditLogService.log(adminId, "USER_CREATED", "User", saved.getId(), null, saved.getUsername() + " (" + saved.getRole() + ")");

        String deptName = saved.getDepartmentId() != null
                ? departmentRepository.findById(saved.getDepartmentId()).map(Department::getName).orElse(null)
                : null;

        return UserProfileResponse.builder()
                .id(saved.getId())
                .username(saved.getUsername())
                .email(saved.getEmail())
                .fullName(saved.getFullName())
                .role(saved.getRole())
                .staffId(saved.getStaffId())
                .departmentId(saved.getDepartmentId())
                .departmentName(deptName)
                .phoneNumber(saved.getPhoneNumber())
                .active(saved.isActive())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public UserProfileResponse updateUser(Long userId, UpdateUserRequest request, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (request.getEmail() == null || !request.getEmail().trim().toLowerCase().endsWith("@gmail.com")) {
            throw new IllegalArgumentException("Email ID must end with @gmail.com");
        }
        if (!user.getUsername().equalsIgnoreCase(request.getUsername().trim()) && userRepository.existsByUsername(request.getUsername().trim())) {
            throw new IllegalArgumentException("Username already exists: " + request.getUsername());
        }
        if (!user.getEmail().equalsIgnoreCase(request.getEmail().trim()) && userRepository.existsByEmail(request.getEmail().trim())) {
            throw new IllegalArgumentException("Email already registered: " + request.getEmail());
        }
        if (request.getStaffId() != null && !request.getStaffId().trim().isEmpty()) {
            Optional<User> existingStaff = userRepository.findByStaffId(request.getStaffId().trim());
            if (existingStaff.isPresent() && !existingStaff.get().getId().equals(userId)) {
                throw new IllegalArgumentException("Staff ID already in use: " + request.getStaffId());
            }
        }

        user.setFullName(request.getFullName().trim());
        user.setUsername(request.getUsername().trim());
        user.setEmail(request.getEmail().trim());
        if (request.getRole() != null) {
            if (user.getRole() == RoleType.ROLE_PATIENT && request.getRole() != RoleType.ROLE_PATIENT) {
                throw new InvalidOperationException("Cannot change the role of a patient to any other role");
            }
            user.setRole(request.getRole());
        }
        user.setStaffId(request.getStaffId() != null && !request.getStaffId().trim().isEmpty() ? request.getStaffId().trim() : null);
        user.setDepartmentId(request.getDepartmentId());
        user.setPhoneNumber(request.getPhoneNumber() != null && !request.getPhoneNumber().trim().isEmpty() ? request.getPhoneNumber().trim() : null);

        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        User saved = userRepository.save(user);
        auditLogService.log(adminId, "USER_UPDATED", "User", saved.getId(), null, saved.getUsername() + " (" + saved.getRole() + ")");

        String deptName = saved.getDepartmentId() != null
                ? departmentRepository.findById(saved.getDepartmentId()).map(Department::getName).orElse(null)
                : null;

        return UserProfileResponse.builder()
                .id(saved.getId())
                .username(saved.getUsername())
                .email(saved.getEmail())
                .fullName(saved.getFullName())
                .role(saved.getRole())
                .staffId(saved.getStaffId())
                .departmentId(saved.getDepartmentId())
                .departmentName(deptName)
                .phoneNumber(saved.getPhoneNumber())
                .active(saved.isActive())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public UserProfileResponse updateUserRole(Long userId, RoleType role, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (user.getRole() == RoleType.ROLE_PATIENT && role != RoleType.ROLE_PATIENT) {
            throw new InvalidOperationException("Cannot change the role of a patient to any other role");
        }

        RoleType oldRole = user.getRole();
        user.setRole(role);
        User saved = userRepository.save(user);

        auditLogService.log(adminId, "USER_ROLE_CHANGED", "User", userId, oldRole.name(), role.name());

        return UserProfileResponse.builder()
                .id(saved.getId())
                .username(saved.getUsername())
                .email(saved.getEmail())
                .fullName(saved.getFullName())
                .role(saved.getRole())
                .staffId(saved.getStaffId())
                .departmentId(saved.getDepartmentId())
                .phoneNumber(saved.getPhoneNumber())
                .active(saved.isActive())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public UserProfileResponse updateUserStatus(Long userId, boolean active, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        boolean oldStatus = user.isActive();
        user.setActive(active);
        User saved = userRepository.save(user);

        auditLogService.log(adminId, "USER_STATUS_CHANGED", "User", userId, String.valueOf(oldStatus), String.valueOf(active));

        return UserProfileResponse.builder()
                .id(saved.getId())
                .username(saved.getUsername())
                .email(saved.getEmail())
                .fullName(saved.getFullName())
                .role(saved.getRole())
                .staffId(saved.getStaffId())
                .departmentId(saved.getDepartmentId())
                .phoneNumber(saved.getPhoneNumber())
                .active(saved.isActive())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public void deleteUser(Long userId, Long adminId) {
        if (userId.equals(adminId)) {
            throw new IllegalArgumentException("Cannot delete the active administrator account.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        userRepository.delete(user);
        auditLogService.log(adminId, "USER_DELETED", "User", userId, user.getUsername(), "Staff account @" + user.getUsername() + " removed by administrator");
    }
}
