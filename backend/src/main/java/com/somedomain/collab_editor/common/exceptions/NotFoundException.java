package com.somedomain.collab_editor.common.exceptions;

public class NotFoundException extends AppException {
    public NotFoundException(String message) {
        super(message, 404);
    }
}
