package com.somedomain.collab_editor.document;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.somedomain.collab_editor.auth.User;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "documents")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // owner reference to User entity
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false)
    private String title;

    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @JoinColumn(name = "content_id")
    private DocumentContent contentEntity;

    @Version
    private Integer version;

    private Instant createdAt = Instant.now();
    private Instant lastModified = Instant.now();

    public Document() {}

    public Document(User owner, String title, String content) {
        this.owner = owner;
        this.title = title;
        this.createdAt = Instant.now();
        this.lastModified = Instant.now();

        if (content != null) {
            this.contentEntity = new DocumentContent(content);
        }
        else {
            this.contentEntity = new DocumentContent("");
        }
    }

    // Getters and setters
    public Long getId() { return id; }
    public User getOwner() { return owner; }
    public String getTitle() { return title; }
    public Integer getVersion() { return version; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getLastModified() { return lastModified; }
    public DocumentContent getContentEntity() { return contentEntity; }

    public void setId(Long id) { this.id = id; }
    public void setOwner(User owner) { this.owner = owner; }
    public void setTitle(String title) { this.title = title; }
    public void setVersion(Integer version) { this.version = version; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public void setLastModified(Instant lastModified) { this.lastModified = lastModified; }

    // direct access to content through the contentEntity relationship
    public String getContent() {
        return contentEntity == null ? null : contentEntity.getContent();
    }
    // directly set content through the contentEntity relationship
    public void setContent(String text) {
        if (contentEntity == null) {
            contentEntity = new DocumentContent(text);
        } else {
            contentEntity.setContent(text);
        }
    }
}
