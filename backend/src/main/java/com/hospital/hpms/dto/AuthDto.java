package com.hospital.hpms.dto;

import com.hospital.hpms.entity.RoleType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;

public class AuthDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LoginRequest {
        @NotBlank(message = "Username, email, or staff ID is required")
        private String username;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RegisterRequest {
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        private String username;

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid format")
        @Pattern(regexp = "^[A-Za-z0-9._%+-]+@gmail\\.com$", message = "Email ID must end with @gmail.com")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 6, max = 100, message = "Password must be at least 6 characters")
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
    public static class AuthResponse {
        private String accessToken;
        private String refreshToken;
        @Builder.Default
        private String tokenType = "Bearer";
        private Long id;
        private String username;
        private String email;
        private String fullName;
        private RoleType role;
        private String staffId;
        private Long departmentId;
        private String departmentName;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RefreshTokenRequest {
        @NotBlank(message = "Refresh token is required")
        private String refreshToken;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserProfileResponse {
        private Long id;
        private String username;
        private String email;
        private String fullName;
        private RoleType role;
        private String staffId;
        private Long departmentId;
        private String departmentName;
        private String phoneNumber;
        private boolean active;
        private LocalDateTime createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateProfileRequest {
        @NotBlank(message = "Full name is required")
        private String fullName;
        
        @Pattern(regexp = "^\\d{10}$", message = "Phone number must be exactly 10 digits")
        private String phoneNumber;
        
        @Email(message = "Valid email is required")
        @Pattern(regexp = "^[A-Za-z0-9._%+-]+@gmail\\.com$", message = "Email ID must end with @gmail.com")
        private String email;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PatientActivationRequest {
        @NotBlank(message = "Identifier (Phone number, Patient ID, or Email) is required")
        private String identifier;

        @NotBlank(message = "New password is required")
        @Size(min = 6, max = 100, message = "Password must be at least 6 characters")
        private String newPassword;
    }
}
