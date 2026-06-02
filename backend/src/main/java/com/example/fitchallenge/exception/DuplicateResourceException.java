package com.example.fitchallenge.exception;

/** Thrown when a resource already exists (e.g. duplicate email on registration). */
public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }
}
