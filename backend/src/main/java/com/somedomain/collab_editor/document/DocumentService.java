package com.somedomain.collab_editor.document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.somedomain.collab_editor.access.AccessRequestRepository;
import com.somedomain.collab_editor.auth.User;
import com.somedomain.collab_editor.common.exceptions.AppException;
import com.somedomain.collab_editor.common.exceptions.NotFoundException;
import com.somedomain.collab_editor.invite.InviteRepository;
import com.somedomain.collab_editor.lock.DocumentLock;
import com.somedomain.collab_editor.lock.DocumentLockRepository;
import com.somedomain.collab_editor.permission.DocumentPermission;
import com.somedomain.collab_editor.permission.DocumentPermissionRepository;
import com.somedomain.collab_editor.permission.PermissionLevel;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    private final DocumentRepository documentRepository;
    private final DocumentPermissionRepository permissionRepository;
    private final DocumentLockRepository lockRepository;
    private final AccessRequestRepository accessRequestRepository;
    private final InviteRepository inviteRepository;

    public DocumentService(DocumentRepository documentRepository,
                           DocumentPermissionRepository permissionRepository,
                           DocumentLockRepository lockRepository,
                           AccessRequestRepository accessRequestRepository,
                           InviteRepository inviteRepository) {
        this.documentRepository = documentRepository;
        this.permissionRepository = permissionRepository;
        this.lockRepository = lockRepository;
        this.accessRequestRepository = accessRequestRepository;
        this.inviteRepository = inviteRepository;                   
    }

    /** Create a new document owned by user */
    public Document create(User owner, String title, String content) {
        Document doc = new Document();
        doc.setOwner(owner);
        doc.setTitle(title);
        doc.setContent(content == null ? "" : content);
        doc.setCreatedAt(Instant.now());
        doc.setLastModified(Instant.now());
        doc.setVersion(0);
        // doc owner does not need a permission entry in DocumentPermission
        // ownership is determined by doc.owner. owner has all permissions implicitly.
        Document saved = documentRepository.save(doc);
        log.info("Document {} created by user {}", saved.getId(), owner.getUsername());
        return saved;
    }

    // returns all docs owned by the user (not shared)
    public List<Document> listOwned(User owner) {
        return documentRepository.findByOwner(owner);
    }

    // returns all docs shared with the user (not owned)
    // docs where user has a permission entry
    public List<Document> listShared(User user) {
        return permissionRepository.findByUser(user).stream()
                 .map(DocumentPermission::getDocument).toList();
    }

    public Document getById(Long docId) {
        return documentRepository.findById(docId)
            .orElseThrow(() -> new NotFoundException("Document not found"));
    }

    /**
     * Save the document content.
     * Must check optimistic version (the Document entity has @Version),
     * but here we also check lock ownership.
     */
    @Transactional
    public Document saveDocument(Long docId, User user, String newContent) {
        Document doc = getById(docId);

        // check if user has EDIT permission or is owner
        if (!doc.getOwner().getId().equals(user.getId())) {
            var perm = permissionRepository.findByDocumentAndUser(doc, user);
            if (perm.isEmpty() || perm.get().getLevel() != PermissionLevel.EDITOR) {
                throw new AppException("User does not have edit rights", 403);
            }
        }

        // check lock - must be locked by this user or unlocked
        Optional<DocumentLock> maybeLock = lockRepository.findByDocument(doc);
        if (maybeLock.isPresent()) {
            DocumentLock dl = maybeLock.get();
            if (dl.getExpiresAt() != null && dl.getExpiresAt().isBefore(Instant.now())) {
                // expired -> release automatically
                lockRepository.delete(dl);
                log.info("Expired lock on doc {} removed", docId);
            } else if (!dl.getLockedByUser().getId().equals(user.getId())) {
                throw new AppException("Document is locked by another user", 423); // 423 Locked
            }
        } else {
            // Not locked — we enforce that edits must hold the lock. So reject.
            throw new AppException("You must acquire edit lock before saving", 423);
        }

        doc.setContent(newContent);
        doc.setLastModified(Instant.now());
        // version is managed by JPA @Version; save will increment on commit
        Document saved = documentRepository.save(doc);
        log.info("Document {} saved by user {}", docId, user.getUsername());
        return saved;
    }

    @Transactional
    public void deleteDocument(Long docId, User user) {
        Document doc = getById(docId);
        if (!doc.getOwner().getId().equals(user.getId())) {
            throw new AppException("Only owner can delete document", 403);
        }
        lockRepository.deleteByDocument(doc);
        accessRequestRepository.deleteAllByDocument(doc);
        inviteRepository.deleteAllByDocumentId(docId);
        documentRepository.delete(doc);
        log.info("Document {} deleted by owner {}", docId, user.getUsername());
    }

    
    /**
     * Return list of accessible docs (owned + shared) using lightweight metadata DTOs,
     * plus lock status and the permission the current user has (null for owned docs).
     */
    @Transactional(readOnly = true)
    public List<DocumentSummaryDto> listAccessibleDocumentsWithStatus(User currentUser) {
        // 1) fetch owned metadata (your custom query returning DocumentMetaDto)
        List<DocumentMetaDto> ownedMeta = documentRepository.findOwnedMetaByOwner(currentUser);

        // 2) fetch permitted metadata (your custom query returning DocumentMetaDto; there myPermission will be set)
        List<DocumentMetaDto> permittedMeta = permissionRepository.findPermittedMetaByUserId(currentUser.getId());

        // 3) Build map of docId -> DocumentMetaDto, merging owned and permitted 
        Map<Long, DocumentMetaDto> metaById = new LinkedHashMap<>(); // preserve insertion order (owned first)
        if (ownedMeta != null) {
            for (DocumentMetaDto m : ownedMeta) {
                metaById.put(m.id(), m); // owned entries: myPermission will be null (by design)
            }
        }
        if (permittedMeta != null) {
            for (DocumentMetaDto m : permittedMeta) {
                metaById.putIfAbsent(m.id(), m);
            }
        }

        if (metaById.isEmpty()) return Collections.emptyList();

        // 4) Fetch locks in batch by document ids
        List<Long> docIds = new ArrayList<>(metaById.keySet());
        List<DocumentLock> locks = lockRepository.findByDocumentIdIn(docIds);

        // Filter active locks and map by doc id
        Instant now = Instant.now();
        Map<Long, DocumentLock> activeLockByDocId = locks.stream()
            .filter(l -> l.getExpiresAt() == null || l.getExpiresAt().isAfter(now))
            .collect(Collectors.toMap(l -> l.getDocument().getId(), l -> l));

        // 5) Build DocumentSummaryDto list
        List<DocumentSummaryDto> result = new ArrayList<>(metaById.size());
        for (DocumentMetaDto meta : metaById.values()) {
            DocumentSummaryDto dto = new DocumentSummaryDto();
            dto.setDocumentId(meta.id());
            dto.setTitle(meta.title());
            // ownerId not available in DocumentMetaDto; leave null or extend DTO if you need it
            dto.setOwnerId(null);
            dto.setOwnerUsername(meta.ownerUsername());
            dto.setLastModified(meta.lastModified());
            dto.setVersion(null); // not fetched in meta DTO; set null unless you add it to meta query

            // Permission: for owned docs we intentionally leave permission null (owner not in permission table)
            // For permittedMeta entries, DocumentMetaDto.myPermission() contains the PermissionLevel; keep it.
            if (ownedMeta != null && ownedMeta.stream().anyMatch(m -> m.id().equals(meta.id()))) {
                dto.setMyPermission(null); // owner -> leave empty per design
            } else {
                // permitted docs: if permission present in meta, set it; otherwise, default to VIEWER
                var p = meta.myPermission();
                dto.setMyPermission(p == null ? "VIEWER" : p.name());
            }

            DocumentLock lock = activeLockByDocId.get(meta.id());
            if (lock != null) {
                dto.setLocked(true);
                dto.setLockedByUserId(lock.getLockedByUser().getId());
                dto.setLockedByUsername(lock.getLockedByUser().getUsername());
                dto.setLockExpiresAt(lock.getExpiresAt());
            } else {
                dto.setLocked(false);
                dto.setLockedByUserId(null);
                dto.setLockedByUsername(null);
                dto.setLockExpiresAt(null);
            }

            result.add(dto);
        }

        return result;
    }

}

