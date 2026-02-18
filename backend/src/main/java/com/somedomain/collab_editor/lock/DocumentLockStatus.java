package com.somedomain.collab_editor.lock;

import java.time.Instant;

public class DocumentLockStatus {
    private Long documentId;
    private Long lockedByUserId;       // null if unlocked
    private String lockedByUsername;
    private Instant expiresAt;        // null if unlocked
    private boolean locked;
    private boolean lockedByCurrentUser;
    private boolean hasEditPermission; // current user has edit permission on the doc

    public DocumentLockStatus() {}

    // getters & setters
    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }
    public Long getLockedByUserId() { return lockedByUserId; }
    public void setLockedByUserId(Long lockedByUserId) { this.lockedByUserId = lockedByUserId; }
    public String getLockedByUsername() { return lockedByUsername; }
    public void setLockedByUsername(String lockedByUsername) { this.lockedByUsername = lockedByUsername; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public boolean isLocked() { return locked; }
    public void setLocked(boolean locked) { this.locked = locked; }
    public boolean isLockedByCurrentUser() { return lockedByCurrentUser; }
    public void setLockedByCurrentUser(boolean lockedByCurrentUser) { this.lockedByCurrentUser = lockedByCurrentUser; }
    public boolean isHasEditPermission() { return hasEditPermission; }
    public void setHasEditPermission(boolean hasEditPermission) { this.hasEditPermission = hasEditPermission; }
}
