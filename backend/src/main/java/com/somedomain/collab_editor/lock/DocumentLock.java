package com.somedomain.collab_editor.lock;

import java.time.Instant;

import com.somedomain.collab_editor.auth.User;
import com.somedomain.collab_editor.document.Document;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

@Entity
@Table(name = "document_locks")
public class DocumentLock {

    @Id
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Enumerated(EnumType.STRING)
    @Column(name = "lock_type", nullable = false, length = 32)
    private LockType lockType = LockType.EXCLUSIVE;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "user_id", nullable = true)
    private User lockedByUser;

    @Column(nullable = false)
    private Instant lockedAt = Instant.now();

    @Column(nullable = false)
    private Instant expiresAt;

    public DocumentLock() {
    }

    public DocumentLock(Document document, User lockedByUser, LockType lockType, Instant expiresAt) {
        this.document = document;
        this.lockedByUser = lockedByUser;
        this.lockType = lockType;
        this.lockedAt = Instant.now();
        this.expiresAt = expiresAt;
    }

    public Long getId() {
        return id;
    }

    public Document getDocument() {
        return document;
    }

    public void setDocument(Document document) {
        this.document = document;
    }

    public LockType getLockType() {
        return lockType;
    }

    public void setLockType(LockType lockType) {
        this.lockType = lockType;
    }

    public User getLockedByUser() {
        return lockedByUser;
    }

    public void setLockedByUser(User lockedByUser) {
        this.lockedByUser = lockedByUser;
    }

    public Instant getLockedAt() {
        return lockedAt;
    }

    public void setLockedAt(Instant lockedAt) {
        this.lockedAt = lockedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
}