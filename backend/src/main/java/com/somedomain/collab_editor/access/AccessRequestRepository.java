package com.somedomain.collab_editor.access;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.somedomain.collab_editor.auth.User;
import com.somedomain.collab_editor.document.Document;

public interface AccessRequestRepository extends JpaRepository<AccessRequest, Long> {
    Optional<AccessRequest> findByDocumentAndRequester(Document doc, User requester);
    List<AccessRequest> findByRequester(User requester);
    List<AccessRequest> findByDocument(Document document);
    void deleteAllByDocument(Document document);

    // get all access requests for documents owned by the specified user
    // includes the username of the requester and the document title
    @Query("SELECT new com.somedomain.collab_editor.access.AccessRequestDto(ar.id, ar.document.title, ar.document.owner.username, ar.requester.username) " +
           "FROM AccessRequest ar " +
           "WHERE ar.document.owner = :owner")
    List<AccessRequestDto> findRequestsForDocumentOwner(@Param("owner") User owner);

    // get all access requests for documents requested by the specified user
    // includes the document title and the username of the document owner
    @Query("SELECT new com.somedomain.collab_editor.access.AccessRequestDto(ar.id, ar.document.title, ar.document.owner.username, ar.requester.username) " +
           "FROM AccessRequest ar " +
           "WHERE ar.requester = :requester")
    List<AccessRequestDto> findRequestsByRequesterWithDetails(@Param("requester") User requester);
}