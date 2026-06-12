package com.somedomain.collab_editor.internal.documentsyncworker;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.constraints.NotBlank;

// handles requests from collaboration session worker nodes
@RestController
@RequestMapping("/internal/workers/documents")
public class WorkerDocumentSyncController {

    public record WorkerDocumentSyncRequest(
        @NotBlank String content
    ) { }

    private final WorkerDocumentSyncService workerDocumentSyncService;

    public WorkerDocumentSyncController(WorkerDocumentSyncService workerDocumentSyncService) {
        this.workerDocumentSyncService = workerDocumentSyncService;
    }

    @PutMapping("/{documentId}/sync")
    public ResponseEntity<Void> syncDocument(
            @PathVariable Long documentId,
            @RequestBody WorkerDocumentSyncRequest request
    ) {
        workerDocumentSyncService.syncDocument(documentId, request.content());
        return ResponseEntity.noContent().build();
    }
}