package com.hospital.hpms.exception;

public class BedUnavailableException extends RuntimeException {
    public BedUnavailableException(String message) {
        super(message);
    }
}
