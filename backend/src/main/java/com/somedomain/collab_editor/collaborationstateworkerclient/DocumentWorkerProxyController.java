package com.somedomain.collab_editor.collaborationstateworkerclient;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/collab-session/")
public class DocumentWorkerProxyController {

    public record InitializeDocumentRequest(String content) {}

    private final DocumentWorkerProxyService proxyService;

    public DocumentWorkerProxyController(DocumentWorkerProxyService proxyService) {
        this.proxyService = proxyService;
    }

    @PutMapping("/{documentId}/init")
    public ResponseEntity<byte[]> initializeDocument(@PathVariable Long documentId) {
        return proxyService.initializeDocument(documentId);
    }

    @PutMapping("/{documentId}/sync")
    public ResponseEntity<byte[]> syncDocument(@PathVariable String documentId) {
        return proxyService.syncDocument(documentId);
    }
}