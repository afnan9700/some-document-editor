package com.somedomain.collab_editor.permission;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.somedomain.collab_editor.auth.User;
import com.somedomain.collab_editor.document.Document;
import com.somedomain.collab_editor.document.DocumentSummaryDto;

public interface DocumentPermissionRepository extends JpaRepository<DocumentPermission, Long> {
    Optional<DocumentPermission> findByDocumentAndUser(Document document, User user);
    List<DocumentPermission> findByUser(User user);
    List<DocumentPermission> findByDocument(Document document);
    boolean existsByDocumentAndUser(Document document, User user);

    // custom query to fetch permissions with document metadata for a user
    @Query("""
        select new com.somedomain.collab_editor.document.DocumentSummaryDto(
            d.id, d.title, o.id, o.username, d.lastModified, d.version, p.level
        )
        from DocumentPermission p
        join p.document d
        join d.owner o
        where p.user.id = :userId
    """)
    List<DocumentSummaryDto> findPermittedDocuments(@Param("userId") Long userId);

}
