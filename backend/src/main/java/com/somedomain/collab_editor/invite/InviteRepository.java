package com.somedomain.collab_editor.invite;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InviteRepository extends JpaRepository<Invite, Long> {
    Optional<Invite> findByToken(String token);

    // convenience to only find non-expired invites:
    Optional<Invite> findByTokenAndExpiresAtAfter(String token, Instant now);

    void deleteAllByDocumentId(Long documentId);
}
