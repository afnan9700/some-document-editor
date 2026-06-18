package com.somedomain.collab_editor.document;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

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
import com.somedomain.collab_editor.lock.LockType;
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
    @Transactional
    public Document create(User owner, String title, String content) {
        Document doc = new Document();
        doc.setOwner(owner);
        doc.setTitle(title);
        doc.setContent(content == null ? "" : content);
        doc.setCreatedAt(Instant.now());
        doc.setLastModified(Instant.now());
        doc.setVersion(0);

        Document saved = documentRepository.save(doc);
        permissionRepository.save(new DocumentPermission(saved, owner, PermissionLevel.OWNER));

        log.info("Document {} created by user {}", saved.getId(), owner.getUsername());
        return saved;
    }

    public boolean canUserEdit(Document doc, User user) {
        if (doc.getOwner().getId().equals(user.getId())) {
            return true;
        }

        var perm = permissionRepository.findByDocumentAndUser(doc, user);
        return perm.isPresent() && perm.get().getLevel() == PermissionLevel.EDITOR;
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
        return documentRepository.findByIdWithContent(docId)
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

        if (!canUserEdit(doc, user)) {
            throw new AppException("User does not have edit rights", 403);
        }

        Optional<DocumentLock> maybeLock = lockRepository.findByDocument(doc);
        if (maybeLock.isEmpty()) {
            throw new AppException("You must acquire edit lock before saving", 423);
        }

        DocumentLock lock = maybeLock.get();
        if (lock.getExpiresAt() != null && lock.getExpiresAt().isBefore(Instant.now())) {
            lockRepository.delete(lock);
            throw new AppException("You must acquire edit lock before saving", 423);
        }

        if (lock.getLockType() == LockType.EXCLUSIVE) {
            if (lock.getLockedByUser() == null || !lock.getLockedByUser().getId().equals(user.getId())) {
                throw new AppException("Document is locked by another user", 423);
            }
        }

        doc.setContent(newContent);
        doc.setLastModified(Instant.now());

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
        permissionRepository.deleteByDocument(doc);
        documentRepository.delete(doc);

        log.info("Document {} deleted by owner {}", docId, user.getUsername());
    }

    /**
     * Return list of accessible docs (owned + shared)
     */
    @Transactional(readOnly = true)
    public List<DocumentSummaryDto> listAccessibleDocumentsWithPermissionLevel(User currentUser) {
        return permissionRepository.findPermittedDocuments(currentUser.getId());
    }

    @Transactional(readOnly = true)
    public DocumentSummaryWithContentDto getDocumentSummaryWithContentByDocumentAndUser(Long documentId,
            Long userId) {
        return permissionRepository.getDocumentSummaryWithContentByDocumentAndUser(documentId, userId);
    }

}
