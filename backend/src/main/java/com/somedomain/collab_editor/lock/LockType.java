package com.somedomain.collab_editor.lock;

public enum LockType {
    EXCLUSIVE,
    COLLABORATIVE;

    public static LockType fromRequest(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("lockType is required");
        }
        return LockType.valueOf(value.trim().toUpperCase());
    }
}