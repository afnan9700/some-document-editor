package com.somedomain.collab_editor.permission;

import com.somedomain.collab_editor.auth.User;
import com.somedomain.collab_editor.document.Document;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "document_permissions", uniqueConstraints = {
    @UniqueConstraint(name = "uc_doc_user", columnNames = {"document_id","user_id"})
})
public class DocumentPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PermissionLevel level = PermissionLevel.VIEWER;

    @Column(nullable = false)
    private Instant grantedAt = Instant.now();

    public DocumentPermission() {}

    public DocumentPermission(Document document, User user, PermissionLevel level) {
        this.document = document;
        this.user = user;
        this.level = level;
        this.grantedAt = Instant.now();
    }

    // getters/setters
    public Long getId() { return id; }
    public Document getDocument() { return document; }
    public User getUser() { return user; }
    public PermissionLevel getLevel() { return level; }
    public Instant getGrantedAt() { return grantedAt; }

    public void setDocument(Document document) { this.document = document; }
    public void setUser(User user) { this.user = user; }
    public void setLevel(PermissionLevel level) { this.level = level; }
    public void setGrantedAt(Instant grantedAt) { this.grantedAt = grantedAt; }
}
