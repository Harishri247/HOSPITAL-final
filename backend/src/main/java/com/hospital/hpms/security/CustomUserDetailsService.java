package com.hospital.hpms.security;

import com.hospital.hpms.entity.User;
import com.hospital.hpms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        if (identifier == null || identifier.trim().isEmpty()) {
            throw new UsernameNotFoundException("Identifier cannot be empty");
        }
        String cleanId = identifier.trim();
        // Support login using username, email, staffId, or legacy email identifier (case-insensitive)
        User user = userRepository.findByUsernameIgnoreCase(cleanId)
                .or(() -> userRepository.findByEmailIgnoreCase(cleanId))
                .or(() -> {
                    if (cleanId.contains("@") && !cleanId.toLowerCase().endsWith("@gmail.com")) {
                        String local = cleanId.substring(0, cleanId.indexOf('@')).toLowerCase();
                        return userRepository.findByEmailIgnoreCase(local + "@gmail.com");
                    }
                    return java.util.Optional.empty();
                })
                .or(() -> userRepository.findByStaffIdIgnoreCase(cleanId))
                .or(() -> userRepository.findByPhoneNumber(cleanId))
                .orElseThrow(() -> new UsernameNotFoundException("User not found with identifier: " + cleanId));

        return UserPrincipal.create(user);
    }
}
