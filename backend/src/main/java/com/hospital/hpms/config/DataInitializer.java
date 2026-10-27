package com.hospital.hpms.config;

import com.hospital.hpms.entity.User;
import com.hospital.hpms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking existing user accounts to ensure emails end with @gmail.com...");
        migrateExistingUserEmails();
    }

    public void migrateExistingUserEmails() {
        List<User> users = userRepository.findAll();
        int migratedCount = 0;
        for (User user : users) {
            String email = user.getEmail();
            if (email == null || !email.trim().toLowerCase().endsWith("@gmail.com")) {
                String localPart = (email != null && email.contains("@"))
                        ? email.substring(0, email.indexOf('@')).trim()
                        : (user.getUsername() != null ? user.getUsername().trim() : "user" + user.getId());
                if (localPart.isEmpty()) {
                    localPart = user.getUsername() != null ? user.getUsername().trim() : "user" + user.getId();
                }
                localPart = localPart.replaceAll("[^a-zA-Z0-9._-]", "");
                if (localPart.isEmpty()) {
                    localPart = "user" + user.getId();
                }

                String candidateEmail = (localPart + "@gmail.com").toLowerCase();
                int counter = 1;
                while (userRepository.existsByEmail(candidateEmail) &&
                        !userRepository.findByEmail(candidateEmail).map(u -> u.getId().equals(user.getId())).orElse(false)) {
                    candidateEmail = (localPart + counter + "@gmail.com").toLowerCase();
                    counter++;
                }

                log.info("Migrated existing user {} (ID: {}) email from '{}' to '{}'", user.getUsername(), user.getId(), email, candidateEmail);
                user.setEmail(candidateEmail);
                userRepository.save(user);
                migratedCount++;
            }
        }
        if (migratedCount > 0) {
            log.info("Successfully migrated {} existing user email(s) to @gmail.com", migratedCount);
        } else {
            log.info("All existing user emails already end with @gmail.com.");
        }
    }
}
