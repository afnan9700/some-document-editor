package com.somedomain.collab_editor.common;

import java.time.Instant;

// DTO 
public class ApiError {
    private String message; // Error message
    private int status; // HTTP status code
    private Instant timestamp;  // Time of the error occurrence

    public ApiError(String message, int status) {
        this.message = message;
        this.status = status;
        this.timestamp = Instant.now();
    }

    // Getters and Setters
    public String getMessage() { return message; }
    public int getStatus() { return status; }
    public Instant getTimestamp() { return timestamp; }

    public void setMessage(String message) { this.message = message; }
    public void setStatus(int status) { this.status = status; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}

