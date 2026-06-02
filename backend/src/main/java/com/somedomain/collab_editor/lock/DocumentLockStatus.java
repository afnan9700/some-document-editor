package com.somedomain.collab_editor.lock;

import java.time.Instant;

public record DocumentLockStatus(
        Long documentId,
        LockType lockType,
        Long lockedByUserId,
        String lockedByUsername,
        Instant expiresAt,
        boolean locked,
        boolean lockedByCurrentUser,
        boolean hasEditPermission) { }
