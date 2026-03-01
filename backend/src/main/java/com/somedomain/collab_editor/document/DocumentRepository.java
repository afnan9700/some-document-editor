package com.somedomain.collab_editor.document;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.somedomain.collab_editor.auth.User;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByOwner(User owner);
    
}
