package com.somedomain.collab_editor.websocketticket;

import java.time.Instant;

public record WebSocketTicketResponse(
    String ticket,
    Instant expiresAt
) {}