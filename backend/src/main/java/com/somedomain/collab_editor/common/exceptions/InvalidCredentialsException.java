package com.somedomain.collab_editor.common.exceptions;

public class InvalidCredentialsException extends AppException {
    public InvalidCredentialsException() {
        super("Invalid username or password", 401);
    }
}