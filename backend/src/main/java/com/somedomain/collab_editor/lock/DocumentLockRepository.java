package com.somedomain.collab_editor.lock;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.somedomain.collab_editor.document.Document;

public interface DocumentLockRepository extends JpaRepository<DocumentLock, Long> {
    
    Optional<DocumentLock> findByDocument(Document document);
    
    void deleteByDocument(Document document);
    
    // Ensure @Param is used for robust parameter binding when compiling with the -parameters flag off
    @Query("select l from DocumentLock l where l.document.id in :ids")
    List<DocumentLock> findByDocumentIdIn(@Param("ids") List<Long> ids);
}