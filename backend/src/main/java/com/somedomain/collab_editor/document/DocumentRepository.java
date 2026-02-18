package com.somedomain.collab_editor.document;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.somedomain.collab_editor.auth.User;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByOwner(User owner);
    
    // Custom query to fetch only metadata for documents owned by a user
    @Query("""
        select new DocumentMetaDto(
            d.id, d.title, d.owner.id, d.owner.username, d.createdAt, d.lastModified, null
        )
        from Document d
        where d.owner = :owner
    """)
    List<DocumentMetaDto> findOwnedMetaByOwner(@Param("owner") User owner);
}
