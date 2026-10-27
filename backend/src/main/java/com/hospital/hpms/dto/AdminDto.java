package com.hospital.hpms.dto;

import com.hospital.hpms.entity.RoleType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class AdminDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateUserRequest {
        @NotBlank(message = "Username is required")
        private String username;

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid format")
        @Pattern(regexp = "^[A-Za-z0-9._%+-]+@gmail\\.com$", message = "Email ID must end with @gmail.com")
        private String email;

        private String password;

        @NotBlank(message = "Full name is required")
        private String fullName;

        @NotNull(message = "Role is required")
        private RoleType role;

        private String staffId;
        private Long departmentId;
        private String phoneNumber;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AnalyticsResponse {
        private long totalPatients;
        private long totalDoctors;
        private long totalStaff;
        private long totalAppointments;
        private long todayAppointments;
        private long occupiedBeds;
        private long totalBeds;
        private double bedOccupancyPercentage;
        private BigDecimal totalRevenue;
        private BigDecimal outstandingBalance;
        private long pendingLabTests;
        private long pendingPrescriptions;
        private Map<String, Long> appointmentStats;
        private Map<String, Long> departmentStats;
        private List<RecentActivity> recentActivities;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RecentActivity {
        private String title;
        private String description;
        private String time;
        private String type;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AuditLogResponse {
        private Long id;
        private Long userId;
        private String username;
        private String action;
        private String entityType;
        private Long entityId;
        private String oldValue;
        private String newValue;
        private LocalDateTime timestamp;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SystemHealthResponse {
        private String status;
        private String database;
        private long activeSessions;
        private long totalUsers;
        private String version;
        private String uptime;
    }
}
