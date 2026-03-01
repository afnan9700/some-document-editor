package com.somedomain.collab_editor.document;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "document_contents")
public class DocumentContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "text")
    private String content;

    // constructors/getters/setters...
    public DocumentContent() {}
    public DocumentContent(String content) {
        this.content = content;
    }

    public Long getId() { return id; }
    public String getContent() { return content; }

    public void setId(Long id) { this.id = id; }
    public void setContent(String content) { this.content = content; }
}
