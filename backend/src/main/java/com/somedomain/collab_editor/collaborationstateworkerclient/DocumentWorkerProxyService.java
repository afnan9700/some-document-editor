package com.somedomain.collab_editor.collaborationstateworkerclient;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.somedomain.collab_editor.collaborationstateworkerclient.DocumentWorkerProxyController.InitializeDocumentRequest;
import com.somedomain.collab_editor.document.DocumentRepository;
import com.somedomain.collab_editor.document.Document;
import com.somedomain.collab_editor.lock.LockService;

@Service
public class DocumentWorkerProxyService {

    private final WorkerHttpClient workerHttpClient;
    private final LockService lockService;
    private final DocumentRepository documentRepository;

    public DocumentWorkerProxyService(WorkerHttpClient workerHttpClient, LockService lockService, DocumentRepository documentRepository) {
        this.workerHttpClient = workerHttpClient;
        this.lockService = lockService;
        this.documentRepository = documentRepository;
    }

    // received during a session initialization (the request body contains document content. though its irrelevent to springboot)
    public ResponseEntity<byte[]> initializeDocument(Long documentId) {
        Document document = documentRepository.findByIdWithContent(documentId)
                .orElse(null);

        if (document == null) {
            return ResponseEntity.status(404)
                    .body("{\"error\":\"document_not_found\"}".getBytes());
        }

        String content = document.getContentEntity().getContent();
        InitializeDocumentRequest requestBody = new InitializeDocumentRequest(content);

        ProxyResponse response = workerHttpClient.put(
                String.valueOf(documentId),
                "/internal/workers/documents/" + documentId + "/init",
                requestBody
        );

        // this can be done in a better way so mayeb change it later
        lockService.acquireCollaborativeLock(Long.valueOf(documentId));

        return response.toResponseEntity();
    }

    // received whenever a new client joins
    public ResponseEntity<byte[]> syncDocument(String documentId) {
        ProxyResponse response = workerHttpClient.put(
                documentId,
                "/internal/workers/documents/" + documentId + "/sync"
        );
        return response.toResponseEntity();
    }

}
