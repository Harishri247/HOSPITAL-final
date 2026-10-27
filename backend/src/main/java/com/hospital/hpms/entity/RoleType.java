package com.hospital.hpms.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum RoleType {
    ROLE_ADMIN,
    ROLE_DOCTOR,
    ROLE_NURSE,
    ROLE_PHARMACIST,
    ROLE_RECEPTIONIST,
    ROLE_LAB_TECHNICIAN,
    ROLE_PATIENT,
    ROLE_GUEST;

    @JsonCreator
    public static RoleType fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        String normalized = value.trim().toUpperCase();
        if (!normalized.startsWith("ROLE_")) {
            normalized = "ROLE_" + normalized;
        }
        for (RoleType r : RoleType.values()) {
            if (r.name().equalsIgnoreCase(normalized)) {
                return r;
            }
        }
        throw new IllegalArgumentException("Invalid RoleType: " + value + ". Valid roles: ADMIN, DOCTOR, NURSE, PHARMACIST, RECEPTIONIST, LAB_TECHNICIAN, PATIENT");
    }
}
