package com.somedomain.collab_editor.sharing;

import com.somedomain.collab_editor.invite.Invite;
import com.somedomain.collab_editor.invite.InviteRepository;
import com.somedomain.collab_editor.access.AccessRequest;
import com.somedomain.collab_editor.access.AccessRequestRepository;
import com.somedomain.collab_editor.permission.DocumentPermission;
import com.somedomain.collab_editor.permission.DocumentPermissionRepository;
import com.somedomain.collab_editor.permission.PermissionLevel;
import com.somedomain.collab_editor.document.Document;
import com.somedomain.collab_editor.auth.User;
import com.somedomain.collab_editor.common.exceptions.AppException;
import com.somedomain.collab_editor.common.exceptions.NotFoundException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;
import java.util.List;

@Service
public class SharingService {

    private static final Logger log = LoggerFactory.getLogger(SharingService.class);

    private final InviteRepository inviteRepository;
    private final AccessRequestRepository requestRepository;
    private final DocumentPermissionRepository permissionRepository;

    public SharingService(InviteRepository inviteRepository,
                          AccessRequestRepository requestRepository,
                          DocumentPermissionRepository permissionRepository) {
        this.inviteRepository = inviteRepository;
        this.requestRepository = requestRepository;
        this.permissionRepository = permissionRepository;
    }

    /** Owner creates an invite token. */
    public Invite createInvite(Document doc, User creator, boolean autoApprove, Instant expiresAt) {
        if (!doc.getOwner().getId().equals(creator.getId())) {
            throw new AppException("Only owner can create invites", 403);
        }
        Invite invite = new Invite();
        invite.setDocument(doc);
        invite.setCreatedBy(creator);
        invite.setToken(UUID.randomUUID().toString());
        invite.setCreatedAt(Instant.now());
        invite.setAutoApprove(autoApprove);
        invite.setExpiresAt(expiresAt == null ? Instant.now().plusSeconds(3 * 3600) : expiresAt);
        Invite saved = inviteRepository.save(invite);
        log.info("Invite {} created for doc {} by {}", saved.getToken(), doc.getId(), creator.getUsername());
        return saved;
    }

    /**
     * User uses invite token. If autoApprove, grant permission instant; else create a pending AccessRequest.
     */
    @Transactional
    public Object useInvite(String token, User requester) {
        Invite invite = inviteRepository.findByToken(token)
            .orElseThrow(() -> new NotFoundException("Invite not found"));

        if (invite.getExpiresAt() != null && invite.getExpiresAt().isBefore(Instant.now())) {
            throw new AppException("Invite expired", 400);
        }

        Document doc = invite.getDocument();
        if (invite.isAutoApprove()) {
            // create permission
            var permOpt = permissionRepository.findByDocumentAndUser(doc, requester);
            if (permOpt.isEmpty()) {
                DocumentPermission perm = new DocumentPermission();
                perm.setDocument(doc);
                perm.setUser(requester);
                perm.setLevel(PermissionLevel.EDITOR); // or default permission
                perm.setGrantedAt(Instant.now());
                permissionRepository.save(perm);
            }
            log.info("User {} auto-granted access to doc {}", requester.getUsername(), doc.getId());
            return "GRANTED";
        } else {
            // create or return existing pending AccessRequest
            var existing = requestRepository.findByDocumentAndRequester(doc, requester);
            if (existing.isPresent()) {
                return existing.get();
            }
            AccessRequest req = new AccessRequest();
            req.setDocument(doc);
            req.setRequester(requester);
            req.setCreatedAt(Instant.now());
            AccessRequest saved = requestRepository.save(req);
            log.info("Access request {} created for doc {} by user {}", saved.getId(), doc.getId(), requester.getUsername());
            return saved;
        }
    }

    @Transactional
    public void processRequest(Long requestId, User processor, boolean approve, PermissionLevel grantedLevel) {
        AccessRequest req = requestRepository.findById(requestId)
            .orElseThrow(() -> new NotFoundException("Request not found"));

        Document doc = req.getDocument();
        if (!doc.getOwner().getId().equals(processor.getId())) {
            throw new AppException("Only owner can process requests", 403);
        }

        if (approve) {
            // grant permission
            DocumentPermission perm = new DocumentPermission();
            perm.setDocument(doc);
            perm.setUser(req.getRequester());
            perm.setLevel(grantedLevel == null ? PermissionLevel.VIEWER : grantedLevel);
            perm.setGrantedAt(Instant.now());
            permissionRepository.save(perm);
            log.info("Request {} approved by {} for user {}", requestId, processor.getUsername(), req.getRequester().getUsername());
        } else {
            log.info("Request {} rejected by {}", requestId, processor.getUsername());
        }

        // delete the request row after processing (approved or rejected)
        requestRepository.delete(req);
    }

    public List<AccessRequest> listPendingRequestsForDocument(Document doc) {
        return requestRepository.findByDocument(doc);
    }

    public List<AccessRequest> listPendingRequestsForUser(User user) {
        return requestRepository.findByRequester(user);
    }

}
