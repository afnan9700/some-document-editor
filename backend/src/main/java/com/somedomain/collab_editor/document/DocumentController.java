package com.somedomain.collab_editor.document;

import com.somedomain.collab_editor.auth.User;
import com.somedomain.collab_editor.util.SecurityUtils;
import com.somedomain.collab_editor.lock.LockService;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.time.Duration;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/docs")
public class DocumentController {

    private final DocumentService documentService;
    private final LockService lockService;

    public DocumentController(DocumentService documentService, LockService lockService) {
        this.documentService = documentService;
        this.lockService = lockService;
    }

    public record CreateDocReq(String title, String content) {}

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateDocReq req) {
        User user = SecurityUtils.getCurrentUser();
        var doc = documentService.create(user, req.title(), req.content());
        return ResponseEntity.ok(doc);
    }

    @GetMapping
    public ResponseEntity<?> library() {
        User user = SecurityUtils.getCurrentUser();
        List<DocumentSummaryDto> list = documentService.listAccessibleDocumentsWithStatus(user);
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
        return ResponseEntity.ok(saved);
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
