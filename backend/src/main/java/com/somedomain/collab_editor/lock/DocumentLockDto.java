package com.somedomain.collab_editor.lock;

import java.time.Instant;

public record DocumentLockDto(
        Long documentId,
        LockType lockType,
        Long lockedByUserId,
        String lockedByUsername,
        Instant expiresAt) {
}