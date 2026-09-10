package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.AuthDto.*;
import com.hospital.hpms.entity.Department;
import com.hospital.hpms.entity.RoleType;
import com.hospital.hpms.entity.User;
import com.hospital.hpms.exception.DuplicatePatientException;
import com.hospital.hpms.exception.ResourceNotFoundException;
import com.hospital.hpms.exception.UnauthorizedAccessException;
import com.hospital.hpms.repository.DepartmentRepository;
import com.hospital.hpms.repository.UserRepository;
import com.hospital.hpms.security.JwtService;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.AuditLogService;
import com.hospital.hpms.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicatePatientException("Username already exists: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicatePatientException("Email already registered: " + request.getEmail());
        }

        RoleType role = request.getRole() != null ? request.getRole() : RoleType.ROLE_PATIENT;

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(role)
                .staffId(request.getStaffId())
                .departmentId(request.getDepartmentId())
                .phoneNumber(request.getPhoneNumber())
                .active(true)
                .build();

        User savedUser = userRepository.save(user);
        auditLogService.log(savedUser.getId(), "USER_REGISTERED", "User", savedUser.getId(), null, savedUser.getUsername());

        UserPrincipal principal = UserPrincipal.create(savedUser);
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", savedUser.getRole().name());
        extraClaims.put("fullName", savedUser.getFullName());
        extraClaims.put("userId", savedUser.getId());

        String accessToken = jwtService.generateToken(principal, extraClaims);
        String refreshToken = jwtService.generateRefreshToken(principal);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .id(savedUser.getId())
                .username(savedUser.getUsername())
                .email(savedUser.getEmail())
                .fullName(savedUser.getFullName())
                .role(savedUser.getRole())
                .staffId(savedUser.getStaffId())
                .departmentId(savedUser.getDepartmentId())
                .build();
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .or(() -> userRepository.findByEmail(request.getUsername()))
                .or(() -> userRepository.findByStaffId(request.getUsername()))
                .orElseThrow(() -> new ResourceNotFoundException("No account found with username/email/staff ID: " + request.getUsername()));

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getUsername(), request.getPassword())
        );

        UserPrincipal principal = UserPrincipal.create(user);
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", user.getRole().name());
        extraClaims.put("fullName", user.getFullName());
        extraClaims.put("userId", user.getId());

        String accessToken = jwtService.generateToken(principal, extraClaims);
        String refreshToken = jwtService.generateRefreshToken(principal);

        auditLogService.log(user.getId(), "USER_LOGIN", "User", user.getId(), null, "SUCCESS");

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .staffId(user.getStaffId())
                .departmentId(user.getDepartmentId())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        if (!jwtService.validateToken(request.getRefreshToken())) {
            throw new UnauthorizedAccessException("Invalid or expired refresh token");
        }

        String username = jwtService.extractUsername(request.getRefreshToken());
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        UserPrincipal principal = UserPrincipal.create(user);
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", user.getRole().name());
        extraClaims.put("fullName", user.getFullName());
        extraClaims.put("userId", user.getId());

        String newAccessToken = jwtService.generateToken(principal, extraClaims);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(request.getRefreshToken())
                .tokenType("Bearer")
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .staffId(user.getStaffId())
                .departmentId(user.getDepartmentId())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUserProfile(UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String deptName = null;
        if (user.getDepartmentId() != null) {
            deptName = departmentRepository.findById(user.getDepartmentId())
                    .map(Department::getName)
                    .orElse(null);
        }

        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .staffId(user.getStaffId())
                .departmentId(user.getDepartmentId())
                .departmentName(deptName)
                .phoneNumber(user.getPhoneNumber())
                .active(user.isActive())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public UserProfileResponse updateProfile(UserPrincipal principal, UpdateProfileRequest request) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setFullName(request.getFullName());
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getEmail() != null && !request.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new DuplicatePatientException("Email already taken: " + request.getEmail());
            }
            user.setEmail(request.getEmail());
        }

        User updated = userRepository.save(user);
        auditLogService.log(user.getId(), "PROFILE_UPDATED", "User", user.getId(), null, updated.getFullName());
        return getCurrentUserProfile(principal);
    }
}
