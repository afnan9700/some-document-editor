package com.somedomain.collab_editor.collaborationstateworkerclient;

import java.nio.charset.StandardCharsets;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.somedomain.collab_editor.document.DocumentRepository;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.somedomain.collab_editor.document.Document;
import com.somedomain.collab_editor.lock.LockService;

@Service
public class DocumentWorkerProxyService {

    private final WorkerHttpClient workerHttpClient;
    private final LockService lockService;
    private final DocumentRepository documentRepository;
    private ObjectMapper objectMapper;

    public record InitializeDocumentRequest(String content) {}

    public DocumentWorkerProxyService(WorkerHttpClient workerHttpClient, LockService lockService, DocumentRepository documentRepository, ObjectMapper objectMapper) {
        this.workerHttpClient = workerHttpClient;
        this.lockService = lockService;
        this.documentRepository = documentRepository;
        this.objectMapper = objectMapper;
    }

    
    public ResponseEntity<byte[]> initializeDocument(Long documentId) {
        Document document = documentRepository.findByIdWithContent(documentId)
                .orElse(null);

        if (document == null) {
            return ResponseEntity.status(404)
                    .body("{\"error\":\"document_not_found\"}".getBytes(StandardCharsets.UTF_8));
        }

        String content = document.getContentEntity().getContent();
        InitializeDocumentRequest requestBody = new InitializeDocumentRequest(content);

        ProxyResponse response = workerHttpClient.put(
                String.valueOf(documentId),
                "/internal/workers/documents/" + documentId + "/init",
                requestBody
        );

        ResponseEntity<byte[]> workerResponse = response.toResponseEntity();

        try {
            JsonNode workerJson = null;
            byte[] workerBody = workerResponse.getBody();

            if (workerBody != null && workerBody.length > 0) {
                workerJson = objectMapper.readTree(workerBody);
            }

            ObjectNode finalBody = objectMapper.createObjectNode();

            if (workerJson != null && workerJson.isObject()) {
                finalBody.setAll((ObjectNode) workerJson);
            }

            finalBody.put("content", content);

            byte[] finalBytes = objectMapper.writeValueAsBytes(finalBody);


            lockService.acquireCollaborativeLock(Long.valueOf(documentId));

            return ResponseEntity.status(workerResponse.getStatusCode())
                    .headers(workerResponse.getHeaders())
                    .body(finalBytes);

        } catch (Exception e) {
            System.out.println(workerResponse);
            System.out.println(e);
            // Fallback if something goes wrong while merging JSON
            return ResponseEntity.status(500)
                    .body("{\"error\":\"failed_to_build_response\"}".getBytes(StandardCharsets.UTF_8));
        }
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
