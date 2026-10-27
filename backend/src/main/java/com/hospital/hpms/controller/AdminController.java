package com.hospital.hpms.controller;

import com.hospital.hpms.dto.AdminDto.*;
import com.hospital.hpms.dto.AuthDto.UserProfileResponse;
import com.hospital.hpms.entity.RoleType;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.AdminService;
import com.hospital.hpms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final AuditLogService auditLogService;

    @GetMapping("/analytics")
    public ResponseEntity<AnalyticsResponse> getAnalytics() {
        return ResponseEntity.ok(adminService.getAnalytics());
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLogResponse>> getAuditLogs() {
        return ResponseEntity.ok(auditLogService.getAllLogs());
    }

    @GetMapping("/audit-logs/paged")
    public ResponseEntity<Page<AuditLogResponse>> getAuditLogsPaged(Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getAllLogs(pageable));
    }

    @GetMapping("/system-health")
    public ResponseEntity<SystemHealthResponse> getSystemHealth() {
        return ResponseEntity.ok(adminService.getSystemHealth());
    }

    @PostMapping("/notifications")
    public ResponseEntity<Map<String, String>> broadcastNotification(
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String message = payload.get("message");
        adminService.broadcastNotification(message, principal.getId());
        return ResponseEntity.ok(Map.of("message", "Broadcast notification sent successfully"));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PostMapping("/users")
    public ResponseEntity<UserProfileResponse> createUser(
            @jakarta.validation.Valid @RequestBody com.hospital.hpms.dto.AuthDto.RegisterRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return new ResponseEntity<>(adminService.createUser(request, principal.getId()), org.springframework.http.HttpStatus.CREATED);
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<UserProfileResponse> updateUser(
            @PathVariable Long id,
            @jakarta.validation.Valid @RequestBody UpdateUserRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(adminService.updateUser(id, request, principal.getId()));
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<UserProfileResponse> updateUserRole(
            @PathVariable Long id,
            @RequestParam(name = "role") String role,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        RoleType roleType = RoleType.fromString(role);
        return ResponseEntity.ok(adminService.updateUserRole(id, roleType, principal.getId()));
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<UserProfileResponse> updateUserStatus(
            @PathVariable Long id,
            @RequestParam boolean active,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(adminService.updateUserStatus(id, active, principal.getId()));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, String>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        adminService.deleteUser(id, principal.getId());
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }
}
