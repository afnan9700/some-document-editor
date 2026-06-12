package com.somedomain.collab_editor.internal.documentsyncworker;

import com.somedomain.collab_editor.auth.AuthService;
import com.somedomain.collab_editor.common.exceptions.AppException;

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

    public WorkerDocumentSyncService(WorkerDocumentSyncRepository workerDocumentSyncRepository) {
        this.workerDocumentSyncRepository = workerDocumentSyncRepository;
    }

    @Transactional
    public void syncDocument(Long documentId, String newContent) {
        if (documentId == null) {
            throw new AppException("documentId is required", 400);
        }
        if (newContent == null) {
            throw new AppException("content is required", 400);
        }

        Instant now = Instant.now();
        Instant expiresAt = now.plus(DEFAULT_LOCK_TTL);

        workerDocumentSyncRepository.updateContentAndRefreshCollaborativeLock(
                documentId,
                newContent,
                now,
                expiresAt
        );

        log.info("Document {} saved and refreshed by collaboration worker node", documentId);
    }
}