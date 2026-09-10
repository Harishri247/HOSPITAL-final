package com.hospital.hpms.exception;

public class InvalidPatientNameException extends RuntimeException {
    public InvalidPatientNameException(String message) {
        super(message);
    }
}
