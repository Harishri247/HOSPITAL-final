package com.hospital.hpms.exception;

public class PatientNotFoundException extends ResourceNotFoundException {
    public PatientNotFoundException(String message) {
        super(message);
    }
    public PatientNotFoundException(Long id) {
        super("Patient not found with ID: " + id);
    }
}
