package com.somedomain.collab_editor.websocketticket;

import java.time.Instant;

public record WebSocketTicketWithContentResponse(
    String ticket,
    Instant expiresAt,
    String content
) {}