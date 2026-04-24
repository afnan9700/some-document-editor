package com.somedomain.collab_editor.access;

public record AccessRequestDto(
        Long id,
        String documentTitle,
        String ownerUsername,
        String requesterUsername) {
}
