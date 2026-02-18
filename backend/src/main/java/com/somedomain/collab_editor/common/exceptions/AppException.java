package com.somedomain.collab_editor.common.exceptions;

public class AppException extends RuntimeException {
    private final int status;   // HTTP status code

    public AppException(String message, int status) {
        super(message);
        this.status = status;
    }

    public int getStatus() { return status; }
}
