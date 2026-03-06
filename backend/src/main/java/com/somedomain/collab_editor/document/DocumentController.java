package com.somedomain.collab_editor.document;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.time.Instant;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.somedomain.collab_editor.auth.User;
import com.somedomain.collab_editor.lock.LockService;
import com.somedomain.collab_editor.util.SecurityUtils;

@RestController
@RequestMapping("/api/docs")
public class DocumentController {

    private final DocumentService documentService;
    private final LockService lockService;

    public record DocumentResponseDto(Long documentId,
                                      String title,
                                      Long ownerId,
                                      String ownerUsername,
                                      Instant lastModified,
                                      Integer version) {}

    public record CreateDocReq(String title, String content) {}

    public DocumentController(DocumentService documentService, LockService lockService) {
        this.documentService = documentService;
        this.lockService = lockService;
    }

    private DocumentResponseDto toDto(Document doc) {
        // owner is guaranteed non-null since a document always has an owner
        return new DocumentResponseDto(
                doc.getId(),               // -> documentId
                doc.getTitle(),
                doc.getOwner().getId(),
                doc.getOwner().getUsername(),
                doc.getLastModified(),
                doc.getVersion());
    }

    @PostMapping({"", "/"})
    public ResponseEntity<?> create(@RequestBody CreateDocReq req) {
        User user = SecurityUtils.getCurrentUser();
        var doc = documentService.create(user, req.title(), req.content());
        DocumentResponseDto dto = toDto(doc);
        return ResponseEntity.ok(dto);
    }

    @GetMapping({"", "/"})
    public ResponseEntity<?> library() {
        User user = SecurityUtils.getCurrentUser();
        List<DocumentSummaryDto> list = documentService.listAccessibleDocumentsWithPermissionLevel(user);
        return ResponseEntity.ok(list);
    }


    @GetMapping("/{id}")
    public ResponseEntity<?> read(@PathVariable Long id) {
        // Reads should be allowed even if locked by someone else
        var doc = documentService.getById(id);
        return ResponseEntity.ok(doc);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> save(@PathVariable Long id, @RequestBody Map<String,String> body) {
        User user = SecurityUtils.getCurrentUser();
        String content = body.get("content");
        var saved = documentService.saveDocument(id, user, content);
        DocumentResponseDto dto = toDto(saved);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{id}/lock")
    public ResponseEntity<?> acquireLock(@PathVariable Long id, @RequestParam(required=false) Long ttlSeconds) {
        User user = SecurityUtils.getCurrentUser();
        var doc = documentService.getById(id);
        var lock = lockService.acquireLock(doc, user, ttlSeconds == null ? null : Duration.ofSeconds(ttlSeconds));
        return ResponseEntity.ok(lock);
    }

    @PostMapping("/{id}/unlock")
    public ResponseEntity<?> releaseLock(@PathVariable Long id) {
        User user = SecurityUtils.getCurrentUser();
        var doc = documentService.getById(id);
        lockService.releaseLock(doc, user);
        return ResponseEntity.ok(Map.of("status","ok"));
    }

    @PostMapping("/api/docs/{id}/lock/refresh")
    public ResponseEntity<?> refreshLock(@PathVariable Long id, @RequestParam(required=false) Long ttlSeconds) {
        User user = SecurityUtils.getCurrentUser();
        Document doc = documentService.getById(id);
        var lock = lockService.refreshLock(doc, user, ttlSeconds == null ? null : Duration.ofSeconds(ttlSeconds));
        return ResponseEntity.ok(lock);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        User user = SecurityUtils.getCurrentUser();
        documentService.deleteDocument(id, user);
        return ResponseEntity.ok(Map.of("status","deleted"));
    }
}

