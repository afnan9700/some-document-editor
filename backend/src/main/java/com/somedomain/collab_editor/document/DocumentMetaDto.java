package com.somedomain.collab_editor.document;

import java.time.Instant;

import com.somedomain.collab_editor.permission.PermissionLevel;

public record DocumentMetaDto(
    Long id,
    String title,
    Long ownerId,
    String ownerUsername,
    Instant createdAt,
    Instant lastModified,
    PermissionLevel myPermission
) {}
