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

@Entity
@Table(name = "document_locks")
public class DocumentLock {

    // 1. Define a basic serializable ID for JPA context tracking
    @Id
    private Long id;

    // 2. Changed to @OneToOne because a document mathematically has only one lock
    // 3. Use @MapsId to bind the primary key directly to this foreign key
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId 
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

    // --- Domain Getters and Setters ---
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Document getDocument() { return document; }
    public User getLockedByUser() { return lockedByUser; }
    public Instant getLockedAt() { return lockedAt; }
    public Instant getExpiresAt() { return expiresAt; }

    public void setDocument(Document document) { this.document = document; }
    public void setLockedByUser(User lockedByUser) { this.lockedByUser = lockedByUser; }
    public void setLockedAt(Instant lockedAt) { this.lockedAt = lockedAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}