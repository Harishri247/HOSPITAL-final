package com.hospital.hpms.controller;

import com.hospital.hpms.dto.AuthDto.UpdateProfileRequest;
import com.hospital.hpms.dto.AuthDto.UserProfileResponse;
import com.hospital.hpms.entity.Department;
import com.hospital.hpms.entity.RoleType;
import com.hospital.hpms.entity.User;
import com.hospital.hpms.repository.DepartmentRepository;
import com.hospital.hpms.repository.UserRepository;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(authService.getCurrentUserProfile(principal));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(authService.updateProfile(principal, request));
    }

    @GetMapping("/doctors")
    public ResponseEntity<List<UserProfileResponse>> getDoctors() {
        List<UserProfileResponse> doctors = userRepository.findByRole(RoleType.ROLE_DOCTOR).stream()
                .filter(User::isActive)
                .map(u -> {
                    String deptName = u.getDepartmentId() != null
                            ? departmentRepository.findById(u.getDepartmentId()).map(Department::getName).orElse(null)
                            : null;
                    return UserProfileResponse.builder()
                            .id(u.getId())
                            .username(u.getUsername())
                            .email(u.getEmail())
                            .fullName(u.getFullName())
                            .role(u.getRole())
                            .staffId(u.getStaffId())
                            .departmentId(u.getDepartmentId())
                            .departmentName(deptName)
                            .phoneNumber(u.getPhoneNumber())
                            .active(u.isActive())
                            .createdAt(u.getCreatedAt())
                            .build();
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(doctors);
    }

    @GetMapping("/departments")
    public ResponseEntity<List<Department>> getDepartments() {
        return ResponseEntity.ok(departmentRepository.findAll());
    }
}
