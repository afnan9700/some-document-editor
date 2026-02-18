package com.somedomain.collab_editor.common.exceptions;

public class UserAlreadyExistsException extends AppException {
    public UserAlreadyExistsException(String username) {
        super("Username '" + username + "' is already taken", 409);
    }
}