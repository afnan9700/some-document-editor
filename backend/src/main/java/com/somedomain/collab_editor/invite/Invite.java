package com.somedomain.collab_editor.invite;

import com.somedomain.collab_editor.document.Document;
import com.somedomain.collab_editor.auth.User;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "invites", indexes = {
    @Index(columnList = "token", name = "idx_invite_token")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Invite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // invite token (unique)
    @Column(nullable = false, unique = true)
    private String token;

    // which document this invite is for
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    // Creator of the invite (usually the owner)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    // expiry instant
    private Instant expiresAt = Instant.now().plusSeconds(3 * 3600); // default 3 hours

    // If true, validating the invite auto-approves access (skips access request creation)
    private boolean autoApprove = false;

    public Invite() {}

    public Invite(String token, Document document, User createdBy, Instant expiresAt, boolean autoApprove) {
        this.token = token;
        this.document = document;
        this.createdBy = createdBy;
        this.expiresAt = expiresAt;
        this.autoApprove = autoApprove;
        this.createdAt = Instant.now();
    }

    // getters / setters
    public Long getId() { return id; }
    public String getToken() { return token; }
    public Document getDocument() { return document; }
    public User getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isAutoApprove() { return autoApprove; }

    public void setId(Long id) { this.id = id; }
    public void setToken(String token) { this.token = token; }
    public void setDocument(Document document) { this.document = document; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public void setAutoApprove(boolean autoApprove) { this.autoApprove = autoApprove; }
}
