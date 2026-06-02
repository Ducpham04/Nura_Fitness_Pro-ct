package com.example.fitchallenge.exception;

/** Thrown when an external dependency (AI service, payment gateway) is unavailable. */
public class ExternalServiceException extends RuntimeException {
    public ExternalServiceException(String message) {
        super(message);
    }
    public ExternalServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
