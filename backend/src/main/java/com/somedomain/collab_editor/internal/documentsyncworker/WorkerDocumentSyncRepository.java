package com.somedomain.collab_editor.internal.documentsyncworker;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.sql.Timestamp;

@Repository
public class WorkerDocumentSyncRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public WorkerDocumentSyncRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void updateContentAndRefreshCollaborativeLock(
            Long documentId,
            String newContent,
            Instant lockedAt,
            Instant expiresAt
    ) {
        String sql = """
            WITH updated_content AS (
                UPDATE document_contents dc
                SET content = :content
                FROM documents d
                WHERE d.id = :documentId
                  AND d.content_id = dc.id
                RETURNING dc.id
            ),
            upsert_lock AS (
                INSERT INTO document_locks (
                    document_id,
                    lock_type,
                    user_id,
                    locked_at,
                    expires_at
                )
                VALUES (
                    :documentId,
                    'COLLABORATIVE',
                    NULL,
                    :lockedAt,
                    :expiresAt
                )
                ON CONFLICT (document_id) DO UPDATE
                SET lock_type = EXCLUDED.lock_type,
                    user_id = NULL,
                    locked_at = EXCLUDED.locked_at,
                    expires_at = EXCLUDED.expires_at
                RETURNING document_id
            )
            SELECT 1
            """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("documentId", documentId)
                .addValue("content", newContent)
                .addValue("lockedAt", Timestamp.from(lockedAt))
                .addValue("expiresAt", Timestamp.from(expiresAt));

        jdbcTemplate.queryForObject(sql, params, Integer.class);
    }
}