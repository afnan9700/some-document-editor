package com.somedomain.collab_editor.document;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.somedomain.collab_editor.auth.User;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByOwner(User owner);

    @Query("SELECT d FROM Document d JOIN FETCH d.contentEntity WHERE d.id = :id")
    Optional<Document> findByIdWithContent(Long id);
}
