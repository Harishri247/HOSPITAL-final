package com.hospital.hpms.exception;

public class AdmissionRequiredException extends RuntimeException {
    public AdmissionRequiredException(String message) {
        super(message);
    }
}
