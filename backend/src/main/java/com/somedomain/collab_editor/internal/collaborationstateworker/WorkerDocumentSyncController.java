package com.somedomain.collab_editor.internal.collaborationstateworker;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.constraints.NotBlank;
import com.fasterxml.jackson.annotation.JsonProperty;

// handles requests from collaboration session worker nodes
@RestController
@RequestMapping("/internal/workers/documents")
public class WorkerDocumentSyncController {

    public record WorkerDocumentSyncRequest(
        @NotBlank String content,
        @JsonProperty("final") boolean finalSync
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
        workerDocumentSyncService.syncDocument(
            documentId,
            request.content(),
            request.finalSync()
        );
        return ResponseEntity.noContent().build();
    }
}