package com.hospital.hpms.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Clean Database Mode:
 * Demonstrative mock data generation has been removed.
 * HPMS runs strictly against the existing persistent PostgreSQL database records.
 */
@Component
@Slf4j
public class DataInitializer implements CommandLineRunner {

    @Override
    public void run(String... args) {
        log.info("HPMS Connected to Persistent PostgreSQL Database: Seed-data logic is disabled. Using existing database records.");
    }
}
