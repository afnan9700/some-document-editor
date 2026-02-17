package com.somedomain.collab_editor.lock;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.somedomain.collab_editor.document.Document;

public interface DocumentLockRepository extends JpaRepository<DocumentLock, Document> {
    Optional<DocumentLock> findByDocument(Document document);
    void deleteByDocument(Document document);
    
    @Query("select l from DocumentLock l where l.document.id in :ids")
    List<DocumentLock> findByDocumentIdIn(List<Long> ids);
}
