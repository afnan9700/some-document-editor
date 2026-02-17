package com.somedomain.collab_editor.access;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.somedomain.collab_editor.auth.User;
import com.somedomain.collab_editor.document.Document;

public interface AccessRequestRepository extends JpaRepository<AccessRequest, Long> {
    Optional<AccessRequest> findByDocumentAndRequester(Document doc, User requester);
    List<AccessRequest> findByRequester(User requester);
    List<AccessRequest> findByDocument(Document document);
    void deleteAllByDocument(Document document);
}