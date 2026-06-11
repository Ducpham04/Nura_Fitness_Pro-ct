package com.example.fitchallenge.exception;

/**
 * Ném khi user đã hết credit AI trong chu kỳ hiện tại.
 * GlobalExceptionHandler bắt và trả HTTP 429.
 */
public class QuotaExceededException extends RuntimeException {
    public QuotaExceededException(String message) {
        super(message);
    }
}
