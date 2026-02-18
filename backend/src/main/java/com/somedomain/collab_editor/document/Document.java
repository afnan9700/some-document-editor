package com.somedomain.collab_editor.document;

import com.somedomain.collab_editor.auth.User;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import java.time.Instant;

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

    @Column(columnDefinition = "text")
    private String content;

    @Version
    private Integer version;

    private Instant createdAt = Instant.now();
    private Instant lastModified = Instant.now();

    public Document() {}

    public Document(User owner, String title, String content) {
        this.owner = owner;
        this.title = title;
        this.content = content;
        this.createdAt = Instant.now();
        this.lastModified = Instant.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public User getOwner() { return owner; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public Integer getVersion() { return version; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getLastModified() { return lastModified; }

    public void setId(Long id) { this.id = id; }
    public void setOwner(User owner) { this.owner = owner; }
    public void setTitle(String title) { this.title = title; }
    public void setContent(String content) { this.content = content; }
    public void setVersion(Integer version) { this.version = version; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public void setLastModified(Instant lastModified) { this.lastModified = lastModified; }
}
