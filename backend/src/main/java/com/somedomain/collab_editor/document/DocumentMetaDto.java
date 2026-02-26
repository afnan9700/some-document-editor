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
) {
    
    // Secondary constructor for JPA Projection
    public DocumentMetaDto(Long id, String title, Long ownerId, String ownerUsername, Instant createdAt, Instant lastModified) {
        // Calls the primary constructor, explicitly passing null for the permission
        this(id, title, ownerId, ownerUsername, createdAt, lastModified, PermissionLevel.EDITOR); // default to EDITOR for owned documents
    }
}
