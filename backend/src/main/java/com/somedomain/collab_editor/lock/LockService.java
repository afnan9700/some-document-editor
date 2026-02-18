package com.somedomain.collab_editor.lock;

import com.somedomain.collab_editor.document.Document;
import com.somedomain.collab_editor.auth.User;
import com.somedomain.collab_editor.common.exceptions.AppException;

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
    private final DocumentLockRepository lockRepository;
    private static final Duration DEFAULT_LOCK_TTL = Duration.ofMinutes(5);
    

    public LockService(DocumentLockRepository lockRepository) {
        this.lockRepository = lockRepository;
    }

    @Transactional
    public DocumentLock acquireLock(Document document, User user, Duration ttl) {
        if (ttl == null) ttl = DEFAULT_LOCK_TTL;

        Optional<DocumentLock> existing = lockRepository.findByDocument(document);
        if (existing.isPresent()) {
            DocumentLock dl = existing.get();
            if (dl.getExpiresAt() != null && dl.getExpiresAt().isBefore(Instant.now())) {
                // expired -> remove and allow
                lockRepository.delete(dl);
                log.info("Removed expired lock for doc {}", document.getId());
            } else {
                if (!dl.getLockedByUser().getId().equals(user.getId())) {
                    throw new AppException("Document currently locked by another user", 423);
                } else {
                    // refresh expiry for same owner
                    dl.setExpiresAt(Instant.now().plus(ttl));
                    DocumentLock saved = lockRepository.save(dl);
                    log.info("Refreshed lock for doc {} by {}", document.getId(), user.getUsername());
                    return saved;
                }
            }
        }

        // create new lock
        DocumentLock newLock = new DocumentLock();
        newLock.setDocument(document);
        newLock.setLockedByUser(user);
        newLock.setLockedAt(Instant.now());
        newLock.setExpiresAt(Instant.now().plus(ttl));
        DocumentLock saved = lockRepository.save(newLock);
        log.info("User {} acquired lock for document {}", user.getUsername(), document.getId());
        return saved;
    }

    @Transactional
    public void releaseLock(Document document, User user) {
        Optional<DocumentLock> existing = lockRepository.findByDocument(document);
        if (existing.isEmpty()) {
            return; // nothing to do
        }
        DocumentLock dl = existing.get();
        // only locker or owner may release (owner check should be done by caller)
        if (!dl.getLockedByUser().getId().equals(user.getId())) {
            throw new AppException("Only lock owner can release lock", 403);
        }
        lockRepository.delete(dl);
        log.info("User {} released lock for document {}", user.getUsername(), document.getId());
    }

    
    /**
     * Refresh the lock expiry for a document for the same user.
     * If the lock is absent or expired, a new lock is created (if not locked by another).
     * Throws AppException if locked by someone else.
     */
    @Transactional
    public DocumentLock refreshLock(Document document, User user, Duration ttl) {
        if (ttl == null) ttl = DEFAULT_LOCK_TTL;

        Optional<DocumentLock> existing = lockRepository.findByDocument(document);
        if (existing.isPresent()) {
            DocumentLock dl = existing.get();
            // expired -> allow to be re-acquired by this user
            if (dl.getExpiresAt() != null && dl.getExpiresAt().isBefore(Instant.now())) {
                lockRepository.delete(dl);
                log.info("Expired lock on doc {} removed during refresh", document.getId());
            } else {
                // If locked by another user, cannot refresh
                if (!dl.getLockedByUser().getId().equals(user.getId())) {
                    throw new AppException("Document currently locked by another user", 423);
                }
                dl.setExpiresAt(Instant.now().plus(ttl));
                DocumentLock saved = lockRepository.save(dl);
                log.debug("Refreshed lock for doc {} by {}", document.getId(), user.getUsername());
                return saved;
            }
        }

        // No active lock, create one
        DocumentLock newLock = new DocumentLock();
        newLock.setDocument(document);
        newLock.setLockedByUser(user);
        newLock.setLockedAt(Instant.now());
        newLock.setExpiresAt(Instant.now().plus(ttl));
        DocumentLock saved = lockRepository.save(newLock);
        log.info("User {} acquired lock for document {} (via refresh)", user.getUsername(), document.getId());
        return saved;
    }

}
