package com.somedomain.collab_editor.document;

import com.somedomain.collab_editor.permission.PermissionLevel;
import java.time.Instant;

public class DocumentSummaryDto {
    private Long documentId;
    private String title;
    private Long ownerId;
    private String ownerUsername;
    private Instant lastModified;
    private Integer version;

    // permission for the current user: "OWNER" | "EDITOR" | "VIEWER"
    private String myPermission;

    // // lock info
    // private boolean locked;
    // private Long lockedByUserId;        // null if unlocked
    // private String lockedByUsername;    // null if unlocked
    // private Instant lockExpiresAt;      // null if unlocked

    public DocumentSummaryDto(Long documentId, String title, Long ownerId, 
                              String ownerUsername, Instant lastModified, 
                              Integer version, PermissionLevel levelEnum) {
        this.documentId = documentId;
        this.title = title;
        this.ownerId = ownerId;
        this.ownerUsername = ownerUsername;
        this.lastModified = lastModified;
        this.version = version;
        
        // Convert the Enum to String right here
        this.myPermission = (levelEnum != null) ? levelEnum.name() : null; 
    }

    // Getters & setters
    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

    public String getOwnerUsername() { return ownerUsername; }
    public void setOwnerUsername(String ownerUsername) { this.ownerUsername = ownerUsername; }

    public Instant getLastModified() { return lastModified; }
    public void setLastModified(Instant lastModified) { this.lastModified = lastModified; }

    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }

    public String getMyPermission() { return myPermission; }
    public void setMyPermission(String myPermission) { this.myPermission = myPermission; }

    // public boolean isLocked() { return locked; }
    // public void setLocked(boolean locked) { this.locked = locked; }

    // public Long getLockedByUserId() { return lockedByUserId; }
    // public void setLockedByUserId(Long lockedByUserId) { this.lockedByUserId = lockedByUserId; }

    // public String getLockedByUsername() { return lockedByUsername; }
    // public void setLockedByUsername(String lockedByUsername) { this.lockedByUsername = lockedByUsername; }

    // public Instant getLockExpiresAt() { return lockExpiresAt; }
    // public void setLockExpiresAt(Instant lockExpiresAt) { this.lockExpiresAt = lockExpiresAt; }
}
