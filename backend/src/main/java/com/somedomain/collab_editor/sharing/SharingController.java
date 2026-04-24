package com.somedomain.collab_editor.sharing;

import com.somedomain.collab_editor.auth.User;
import com.somedomain.collab_editor.util.SecurityUtils;
import com.somedomain.collab_editor.document.DocumentService;
import com.somedomain.collab_editor.permission.PermissionLevel;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.Map;

@RestController
@RequestMapping("/api/sharing")
public class SharingController {

    private final SharingService sharingService;
    private final DocumentService documentService;

    public SharingController(SharingService sharingService, DocumentService documentService) {
        this.sharingService = sharingService;
        this.documentService = documentService;
    }

    record CreateInviteReq(boolean autoApprove, Long expiresInSeconds) {
    }

    @PostMapping("/docs/{docId}/invite")
    public ResponseEntity<?> createInvite(@PathVariable Long docId, @RequestBody CreateInviteReq req) {
        User user = SecurityUtils.getCurrentUser();
        var doc = documentService.getById(docId);
        var invite = sharingService.createInvite(doc, user, req.autoApprove(),
                req.expiresInSeconds() == null ? null : java.time.Instant.now().plusSeconds(req.expiresInSeconds()));
        return ResponseEntity.ok(Map.of("token", invite.getToken()));
    }

    record UseInviteReq(String token) {
    }

    @PostMapping("/invite/use")
    public ResponseEntity<?> useInvite(@RequestBody UseInviteReq req) {
        User user = SecurityUtils.getCurrentUser();
        var result = sharingService.useInvite(req.token(), user);
        return ResponseEntity.ok(Map.of("granted", result.equals("GRANTED")));
    }

    @PostMapping("/requests/{requestId}/process")
    public ResponseEntity<?> processRequest(@PathVariable Long requestId, @RequestParam boolean approve,
            @RequestParam(required = false) String level) {
        User user = SecurityUtils.getCurrentUser();
        PermissionLevel permLevel = level != null && level.equalsIgnoreCase("editor") ? PermissionLevel.EDITOR
                : PermissionLevel.VIEWER;
        sharingService.processRequest(requestId, user, approve, permLevel);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @GetMapping("/requests/for-my-docs")
    public ResponseEntity<?> listPendingRequestsForMyDocs() {
        User user = SecurityUtils.getCurrentUser();
        var requests = sharingService.listPendingRequestsForDocumentOwner(user);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/requests/made-by-me")
    public ResponseEntity<?> listPendingRequestsForMyRequests() {
        User user = SecurityUtils.getCurrentUser();
        var requests = sharingService.listPendingRequestsByRequesterWithDetails(user);
        return ResponseEntity.ok(requests);
    }
}
