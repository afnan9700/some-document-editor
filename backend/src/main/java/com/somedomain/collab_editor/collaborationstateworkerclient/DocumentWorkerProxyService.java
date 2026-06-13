package com.somedomain.collab_editor.collaborationstateworkerclient;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class DocumentWorkerProxyService {

    private final WorkerHttpClient workerHttpClient;

    public DocumentWorkerProxyService(WorkerHttpClient workerHttpClient) {
        this.workerHttpClient = workerHttpClient;
    }

    // received during a session initialization (the request body contains document content. though its irrelevent to springboot)
    public ResponseEntity<byte[]> initializeDocument(String documentId, byte[] requestBody) {
        ProxyResponse response = workerHttpClient.put(
                documentId,
                "/internal/workers/documents/" + documentId + "/init",
                requestBody
        );
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
