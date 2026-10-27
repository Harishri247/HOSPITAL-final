package com.hospital.hpms.service;

import com.hospital.hpms.dto.AdminDto.*;
import com.hospital.hpms.dto.AuthDto.RegisterRequest;
import com.hospital.hpms.dto.AuthDto.UserProfileResponse;
import com.hospital.hpms.entity.RoleType;

import java.util.List;

public interface AdminService {
    AnalyticsResponse getAnalytics();
    SystemHealthResponse getSystemHealth();
    void broadcastNotification(String message, Long senderId);
    List<UserProfileResponse> getAllUsers();
    UserProfileResponse createUser(RegisterRequest request, Long adminId);
    UserProfileResponse updateUser(Long userId, UpdateUserRequest request, Long adminId);
    UserProfileResponse updateUserRole(Long userId, RoleType role, Long adminId);
    UserProfileResponse updateUserStatus(Long userId, boolean active, Long adminId);
    void deleteUser(Long userId, Long adminId);
}
