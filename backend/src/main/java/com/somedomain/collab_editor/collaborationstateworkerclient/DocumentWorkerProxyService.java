package com.somedomain.collab_editor.collaborationstateworkerclient;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.somedomain.collab_editor.lock.LockService;

@Service
public class DocumentWorkerProxyService {

    private final WorkerHttpClient workerHttpClient;
    private final LockService lockService;

    public DocumentWorkerProxyService(WorkerHttpClient workerHttpClient, LockService lockService) {
        this.workerHttpClient = workerHttpClient;
        this.lockService = lockService;
    }

    // received during a session initialization (the request body contains document content. though its irrelevent to springboot)
    public ResponseEntity<byte[]> initializeDocument(String documentId, byte[] requestBody) {
        ProxyResponse response = workerHttpClient.put(
                documentId,
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
