package com.somedomain.collab_editor.websocketticket;

import java.time.Instant;
import com.somedomain.collab_editor.permission.PermissionLevel;

public record WebSocketTicketPayload(
    Long documentId,
    Long userId,
    PermissionLevel permissionLevel,
    Instant issuedAt,
    Instant expiresAt
) {}