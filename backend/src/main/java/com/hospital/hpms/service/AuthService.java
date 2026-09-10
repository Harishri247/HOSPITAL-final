package com.hospital.hpms.service;

import com.hospital.hpms.dto.AuthDto.*;
import com.hospital.hpms.security.UserPrincipal;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse refreshToken(RefreshTokenRequest request);
    UserProfileResponse getCurrentUserProfile(UserPrincipal principal);
    UserProfileResponse updateProfile(UserPrincipal principal, UpdateProfileRequest request);
}
