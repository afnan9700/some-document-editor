package com.somedomain.collab_editor.lock;

import com.somedomain.collab_editor.document.Document;
import com.somedomain.collab_editor.auth.User;
import com.somedomain.collab_editor.common.exceptions.AppException;
import com.somedomain.collab_editor.permission.DocumentPermissionRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.Duration;
import java.util.Optional;


@Service
public class LockService {
    private static final Logger log = LoggerFactory.getLogger(LockService.class);
    private static final Duration DEFAULT_LOCK_TTL = Duration.ofMinutes(5);

    private final DocumentLockRepository lockRepository;
    private final DocumentPermissionRepository permissionRepository;

    public LockService(DocumentLockRepository lockRepository,
                       DocumentPermissionRepository permissionRepository) {
        this.lockRepository = lockRepository;
        this.permissionRepository = permissionRepository;
    }

    @Transactional
    public DocumentLock acquireLock(Document document, User user, Duration ttl, LockType requestedType) {
        if (ttl == null) {
            ttl = DEFAULT_LOCK_TTL;
        }
        if (requestedType == null) {
            requestedType = LockType.EXCLUSIVE;
        }

        Optional<DocumentLock> existing = lockRepository.findByDocument(document);
        if (existing.isPresent()) {
            DocumentLock current = existing.get();

            if (isExpired(current)) {
                lockRepository.delete(current);
                log.info("Removed expired lock for doc {}", document.getId());
                return createLock(document, user, requestedType, ttl);
            }

            return handleLockRequest(document, user, ttl, requestedType, current);
        }

        return createLock(document, user, requestedType, ttl);
    }

    @Transactional
    public DocumentLock switchExclusiveToCollaborative(Document document, User user, Duration ttl) {
        if (ttl == null) {
            ttl = DEFAULT_LOCK_TTL;
        }

        DocumentLock current = lockRepository.findByDocument(document)
                .orElseThrow(() -> new AppException("Document is not locked", 423));

        if (isExpired(current)) {
            lockRepository.delete(current);
            throw new AppException("Document lock has expired", 423);
        }

        if (current.getLockType() != LockType.EXCLUSIVE) {
            throw new AppException("Only exclusive locks can be switched to collaborative", 409);
        }

        if (current.getLockedByUser() == null || !current.getLockedByUser().getId().equals(user.getId())) {
            throw new AppException("Only the exclusive lock holder can switch it", 423);
        }

        current.setLockType(LockType.COLLABORATIVE);
        current.setLockedByUser(null);
        current.setExpiresAt(Instant.now().plus(ttl));

        DocumentLock saved = lockRepository.save(current);
        log.info("User {} switched document {} to collaborative lock", user.getUsername(), document.getId());
        return saved;
    }

    @Transactional
    public void releaseLock(Document document, User user) {
        Optional<DocumentLock> existing = lockRepository.findByDocument(document);
        if (existing.isEmpty()) {
            return;
        }

        DocumentLock current = existing.get();
        if (isExpired(current)) {
            lockRepository.delete(current);
            return;
        }

        if (!permissionRepository.existsByDocumentAndUser(document, user)) {
            throw new AppException("User does not have permission to release this lock", 403);
        }

        lockRepository.delete(current);
        log.info("User {} released lock for document {}", user.getUsername(), document.getId());
    }

    @Transactional
    public DocumentLock refreshLock(Document document, User user, Duration ttl) {
        if (ttl == null) {
            ttl = DEFAULT_LOCK_TTL;
        }

        Optional<DocumentLock> existing = lockRepository.findByDocument(document);
        if (existing.isEmpty()) {
            return createLock(document, user, LockType.EXCLUSIVE, ttl);
        }

        DocumentLock current = existing.get();

        if (isExpired(current)) {
            lockRepository.delete(current);
            log.info("Expired lock on doc {} removed during refresh", document.getId());
            return createLock(document, user, current.getLockType(), ttl);
        }

        if (current.getLockType() == LockType.EXCLUSIVE) {
            if (current.getLockedByUser() == null || !current.getLockedByUser().getId().equals(user.getId())) {
                throw new AppException("Document currently locked by another user", 423);
            }
        } else {
            if (!permissionRepository.existsByDocumentAndUser(document, user)) {
                throw new AppException("User does not have permission to refresh this lock", 403);
            }
        }

        current.setExpiresAt(Instant.now().plus(ttl));
        DocumentLock saved = lockRepository.save(current);
        log.debug("Refreshed lock for doc {} by {}", document.getId(), user.getUsername());
        return saved;
    }

    @Transactional(readOnly = true)
    public Optional<DocumentLockDto> getLock(Document document) {
        Optional<DocumentLockDto> existing = lockRepository.findDtoByDocument(document.getId());
        if (existing.isEmpty()) {
            return Optional.empty();
        }

        DocumentLockDto lock = existing.get();
        if (lock.expiresAt() != null && lock.expiresAt().isBefore(Instant.now())) {
            lockRepository.deleteByDocument(document);
            return Optional.empty();
        }

        return existing;
    }

    private DocumentLock handleLockRequest(Document document, User user, Duration ttl, LockType requestedType, DocumentLock current) {
        if (current.getLockType() == requestedType) {
            if (requestedType == LockType.EXCLUSIVE) {
                if (current.getLockedByUser() == null || !current.getLockedByUser().getId().equals(user.getId())) {
                    throw new AppException("Document currently locked by another user", 423);
                }
            }
            current.setExpiresAt(Instant.now().plus(ttl));
            return lockRepository.save(current);
        }

        if (current.getLockType() == LockType.EXCLUSIVE && requestedType == LockType.COLLABORATIVE) {
            if (current.getLockedByUser() == null || !current.getLockedByUser().getId().equals(user.getId())) {
                throw new AppException("Only the exclusive lock holder can switch it to collaborative", 423);
            }
            current.setLockType(LockType.COLLABORATIVE);
            current.setLockedByUser(null);
            current.setExpiresAt(Instant.now().plus(ttl));
            return lockRepository.save(current);
        }

        throw new AppException("Document is already locked", 423);
    }

    private DocumentLock createLock(Document document, User user, LockType type, Duration ttl) {
        DocumentLock newLock = new DocumentLock();
        newLock.setDocument(document);
        newLock.setLockType(type);
        newLock.setLockedAt(Instant.now());
        newLock.setExpiresAt(Instant.now().plus(ttl));

        if (type == LockType.EXCLUSIVE) {
            newLock.setLockedByUser(user);
        } else {
            newLock.setLockedByUser(null);
        }

        DocumentLock saved = lockRepository.save(newLock);
        log.info("User {} acquired {} lock for document {}", user.getUsername(), type, document.getId());
        return saved;
    }

    private boolean isExpired(DocumentLock lock) {
        return lock.getExpiresAt() != null && lock.getExpiresAt().isBefore(Instant.now());
    }
}