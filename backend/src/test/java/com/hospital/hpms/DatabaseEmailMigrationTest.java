package com.hospital.hpms;

import org.junit.jupiter.api.Test;

import java.sql.*;
import java.util.*;

public class DatabaseEmailMigrationTest {

    @Test
    void migrateAllUserEmailsToGmail() {
        String url = "jdbc:postgresql://localhost:5432/hospital_db";
        String user = "postgres";
        String pass = "2334";

        System.out.println("Connecting to database: " + url);
        try (Connection conn = DriverManager.getConnection(url, user, pass)) {
            System.out.println("Successfully connected to PostgreSQL database.");

            // 1. Fetch all users
            List<Map<String, Object>> users = new ArrayList<>();
            Set<String> existingEmails = new HashSet<>();

            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT id, username, email FROM users ORDER BY id ASC")) {
                while (rs.next()) {
                    long id = rs.getLong("id");
                    String username = rs.getString("username");
                    String email = rs.getString("email");
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", id);
                    map.put("username", username);
                    map.put("email", email);
                    users.add(map);
                    if (email != null) {
                        existingEmails.add(email.trim().toLowerCase());
                    }
                }
            }

            System.out.println("Total users found in database: " + users.size());

            int updatedCount = 0;
            String updateSql = "UPDATE users SET email = ? WHERE id = ?";
            try (PreparedStatement pstmt = conn.prepareStatement(updateSql)) {
                for (Map<String, Object> u : users) {
                    long id = (Long) u.get("id");
                    String username = (String) u.get("username");
                    String email = (String) u.get("email");

                    if (email == null || !email.trim().toLowerCase().endsWith("@gmail.com")) {
                        String localPart;
                        if (email != null && email.contains("@")) {
                            localPart = email.substring(0, email.indexOf('@')).trim();
                        } else {
                            localPart = username != null ? username.trim() : "user" + id;
                        }
                        localPart = localPart.replaceAll("[^a-zA-Z0-9._-]", "");
                        if (localPart.isEmpty()) {
                            localPart = "user" + id;
                        }

                        String candidate = (localPart + "@gmail.com").toLowerCase();
                        int counter = 1;
                        while (existingEmails.contains(candidate)) {
                            candidate = (localPart + counter + "@gmail.com").toLowerCase();
                            counter++;
                        }

                        existingEmails.remove(email != null ? email.trim().toLowerCase() : null);
                        existingEmails.add(candidate);

                        pstmt.setString(1, candidate);
                        pstmt.setLong(2, id);
                        pstmt.executeUpdate();

                        System.out.println("Migrated User ID " + id + " (@" + username + "): '" + email + "' -> '" + candidate + "'");
                        updatedCount++;
                    } else {
                        System.out.println("User ID " + id + " (@" + username + ") already has @gmail.com: " + email);
                    }
                }
            }

            System.out.println("Migration complete! Total user emails updated to @gmail.com: " + updatedCount);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    @Test
    void printCredentials() {
        String url = "jdbc:postgresql://localhost:5432/hospital_db";
        String user = "postgres";
        String pass = "2334";

        org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = 
            new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();

        String[] testPasswords = {
            "Admin@123", "Doctor@123", "Nurse@123", "Recept@123", "Pharm@123", "Patient@123", "Kishore@123",
            "Lab@123", "Labtech@123", "LabTech@123", "Lab@1234", "Labtech@1234", "Alex@123", "Sam@123", "Samantha@123",
            "Diana@123", "diana123", "Diana@1234", "nurse@123", "John@123", "john123", "John@1234", "Watson@123",
            "Hospital@123", "Hpms@123", "123456", "12345678", "admin", "password", "password123", "Pass@1234", "Secret@123"
        };

        try (Connection conn = DriverManager.getConnection(url, user, pass);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT id, username, email, role, full_name, password_hash FROM users ORDER BY id ASC")) {
            System.out.println("=== USER CREDENTIALS DUMP ===");
            while (rs.next()) {
                String uName = rs.getString("username");
                String email = rs.getString("email");
                String role = rs.getString("role");
                String name = rs.getString("full_name");
                String hash = rs.getString("password_hash");

                String matchedPassword = "UNKNOWN";
                for (String tp : testPasswords) {
                    if (encoder.matches(tp, hash)) {
                        matchedPassword = tp;
                        break;
                    }
                }
                if ("UNKNOWN".equals(matchedPassword)) {
                    System.out.println("DEBUG UNKNOWN: " + uName + " -> hash: " + hash);
                }
                System.out.println(String.format("Role: %-15s | Username: %-15s | Email: %-25s | Name: %-20s | Password: %s",
                        role, uName, email, name, matchedPassword));
            }
            System.out.println("=============================");
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
