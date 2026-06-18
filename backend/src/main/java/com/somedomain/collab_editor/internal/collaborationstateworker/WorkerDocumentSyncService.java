package com.somedomain.collab_editor.internal.collaborationstateworker;

import com.somedomain.collab_editor.auth.AuthService;
import com.somedomain.collab_editor.document.Document;
import com.somedomain.collab_editor.document.DocumentRepository;
import com.somedomain.collab_editor.lock.LockService;
import com.somedomain.collab_editor.common.exceptions.AppException;
import com.somedomain.collab_editor.common.exceptions.NotFoundException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Service
public class WorkerDocumentSyncService {
    
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private static final Duration DEFAULT_LOCK_TTL = Duration.ofMinutes(5);

    private final WorkerDocumentSyncRepository workerDocumentSyncRepository;
    private final LockService lockService;
    private final DocumentRepository documentRepository;

    public WorkerDocumentSyncService(
        WorkerDocumentSyncRepository workerDocumentSyncRepository,
        LockService lockService,
        DocumentRepository documentRepository) {
        this.workerDocumentSyncRepository = workerDocumentSyncRepository;
        this.lockService = lockService;
        this.documentRepository = documentRepository;
    }

    @Transactional
    public void syncDocument(Long documentId, String newContent, boolean isFinal) {
        if (documentId == null) {
            throw new AppException("documentId is required", 400);
        }
        if (newContent == null) {
            throw new AppException("content is required", 400);
        }

        if (!isFinal) {
            Instant now = Instant.now();
            Instant expiresAt = now.plus(DEFAULT_LOCK_TTL);

            workerDocumentSyncRepository.updateContentAndRefreshCollaborativeLock(
                    documentId,
                    newContent,
                    now,
                    expiresAt
            );

            log.info("Document {} saved and refreshed by collaboration worker node", documentId);
            return;
        }

        lockService.releaseCollaborativeLock(documentId);

        Document doc = documentRepository.findByIdWithContent(documentId)
                .orElseThrow(() -> new NotFoundException("Document not found"));
        doc.setContent(newContent);
        doc.setLastModified(Instant.now());
        documentRepository.save(doc);

        log.info("Document {} finalized and persisted by collaboration worker node", documentId);
    }
}