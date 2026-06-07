package com.somedomain.collab_editor.websocketticket;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

// import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

import com.somedomain.collab_editor.auth.User;
// import com.somedomain.collab_editor.document.Document;
// import com.somedomain.collab_editor.document.DocumentRepository;
import com.somedomain.collab_editor.permission.DocumentPermission;
import com.somedomain.collab_editor.permission.DocumentPermissionRepository;
import com.somedomain.collab_editor.permission.PermissionLevel;

@Service
@RequiredArgsConstructor
public class WebSocketTicketService {

    private static final Duration TICKET_TTL = Duration.ofMinutes(1);

    // private final DocumentRepository documentRepository;
    private final DocumentPermissionRepository permissionRepository;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public WebSocketTicketResponse createTicket(Long documentId, User principalUser) {
        // Document document = documentRepository.findById(documentId)
        //         .orElseThrow(() -> new EntityNotFoundException("Document not found"));

        PermissionLevel permissionLevel = resolvePermission(documentId, principalUser.getId());
        if (permissionLevel == null) {
            throw new AccessDeniedException("You do not have access to this document");
        }

        Instant now = Instant.now();
        Instant expiresAt = now.plus(TICKET_TTL);

        String ticket = generateOpaqueTicket();
        WebSocketTicketPayload payload = new WebSocketTicketPayload(
                documentId,
                principalUser.getId(),
                principalUser.getUsername(),
                permissionLevel,
                now,
                expiresAt
        );

        String redisKey = redisKey(ticket);
        String redisValue;
        try {
            redisValue = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize websocket ticket", e);
        }

        // redis call
        Boolean stored = stringRedisTemplate.opsForValue()
                .setIfAbsent(redisKey, redisValue, TICKET_TTL);
        // handle unlikely collision
        if (!Boolean.TRUE.equals(stored)) {
            throw new IllegalStateException("Ticket collision; retry");
        }

        return new WebSocketTicketResponse(ticket, expiresAt);
    }

    private PermissionLevel resolvePermission(Long documentId, Long userId) {
        // if (document.getOwner() != null && document.getOwner().getId().equals(userId)) {
        //     return PermissionLevel.OWNER;
        // }

        return permissionRepository.findByDocument_IdAndUser_Id(documentId, userId)
                .map(DocumentPermission::getLevel)
                .orElse(null);
    }

    private String redisKey(String ticket) {
        return "ws:ticket:" + ticket;
    }

    private String generateOpaqueTicket() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}