package com.hospital.hpms.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum Priority {
    LOW,
    MEDIUM,
    HIGH,
    URGENT,
    ROUTINE,
    EMERGENCY;

    @JsonCreator
    public static Priority fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return MEDIUM;
        }
        String clean = value.trim().toUpperCase();
        for (Priority p : values()) {
            if (p.name().equalsIgnoreCase(clean)) {
                return p;
            }
        }
        if ("NORMAL".equalsIgnoreCase(clean) || "STANDARD".equalsIgnoreCase(clean)) {
            return ROUTINE;
        }
        if ("CRITICAL".equalsIgnoreCase(clean) || "IMMEDIATE".equalsIgnoreCase(clean)) {
            return EMERGENCY;
        }
        return MEDIUM;
    }
}

