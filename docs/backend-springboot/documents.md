# Documents & Document Locks

This document covers how documents, their content and their editing locks are modeled and stored in the backend.

## Documents

The `Document` entity (`src/main/java/com/somedomain/collab_editor/document/Document.java`) represents document **metadata**. A single user can own multiple documents.

Table: `documents`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK, auto-generated |
| `owner_id` | `bigint` | FK → `users`, NOT NULL, lazy |
| `title` | `varchar` | NOT NULL |
| `content_id` | `bigint` | FK → `document_contents` (one-to-one, cascade + orphan removal) |
| `version` | `int` | optimistic-lock `@Version` column |
| `created_at` | `timestamp` | defaults to now |
| `last_modified` | `timestamp` | defaults to now |

## Document content

Document content is **disproportionately large**, so it is stored in a separate table (`document_contents`) that the `Document` references one-to-one.

Table: `document_contents`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK, auto-generated |
| `content` | `text` | the document body |

> **Design note:** `document` and `document_content` use their own distinct primary keys. Using the same primary key for content as the corresponding document was attempted but proved too complicated, so it was dropped.

## DTOs

`DocumentSummaryDto` (`document/DocumentSummaryDto.java`) is used for the frontend **library page** display (i.e. the list of documents a user can see).

## Document locks

Multiple users can have access to the same document. To avoid conflicts, only **one user at a time** may edit a document in non-collaboration mode. This is enforced with document locks.

> **Design note:** Redis would have been more suitable as the lock store, but the locks are currently implemented on PostgreSQL (`document_locks`).

Table: `document_locks`

| Column | Type | Notes |
| --- | --- | --- |
| `document_id` | `bigint` | PK **and** FK → `documents` (`@MapsId`, one-to-one), NOT NULL |
| `lock_type` | `varchar(32)` | enum string, NOT NULL, defaults to `EXCLUSIVE` |
| `user_id` | `bigint` | FK → `users`, nullable (set for exclusive locks) |
| `locked_at` | `timestamp` | NOT NULL, defaults to now |
| `expires_at` | `timestamp` | NOT NULL, lock expiry |

### Lock types (`lock/LockType.java`)

- **`EXCLUSIVE`** — a generic single-user edit lock. Prevents multiple users from writing to the same document at the same time.
- **`COLLABORATIVE`** — not really a lock. It mainly provides feedback that a collaborative session is currently active, so that new users join the existing session instead of creating a new one.

### Lock behaviour

- **Expiry:** locks expire to prevent a document staying locked forever, so locks must be **refreshed periodically**.
- **Lock holder:** exclusive locks record which user currently holds the lock. This is not tracked for collaborative locks (users enter and leave sessions), hence the separate `createSystemCollaborativeLock` method.
- **Mode of acquisition:** `acquireLock` currently makes *two* database calls (read the existing lock, delete it if present, then create a new one). Ideally this would happen in a single call; the same pattern is repeated in several places in the lock service.

## Related docs

- [internal-worker.md](./internal-worker.md) — how collaborative lock-refresh and state persistence is delegated to the state workers.