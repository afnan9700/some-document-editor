package com.somedomain.collab_editor.lock;

import com.somedomain.collab_editor.document.Document;
import com.somedomain.collab_editor.auth.User;

import java.time.Instant;

import jakarta.persistence.*;

@Entity
@Table(name = "document_locks")
public class DocumentLock {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User lockedByUser;

    @Column(nullable = false)
    private Instant lockedAt = Instant.now();

    @Column(nullable = true)
    private Instant expiresAt;

    public DocumentLock() {}

    public DocumentLock(Document document, User lockedByUser, Instant expiresAt) {
        this.document = document;
        this.lockedByUser = lockedByUser;
        this.lockedAt = Instant.now();
        this.expiresAt = expiresAt;
    }

    // getters/setters
    public Document getDocument() { return document; }
    public User getLockedByUser() { return lockedByUser; }
    public Instant getLockedAt() { return lockedAt; }
    public Instant getExpiresAt() { return expiresAt; }

    public void setDocument(Document document) { this.document = document; }
    public void setLockedByUser(User lockedByUser) { this.lockedByUser = lockedByUser; }
    public void setLockedAt(Instant lockedAt) { this.lockedAt = lockedAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}
