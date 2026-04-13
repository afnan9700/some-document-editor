package com.somedomain.collab_editor.lock;

import java.time.Instant;

public record DocumentLockDto(Long documentId, String username, Instant expiresAt) {

}
