# Architecture Overview

This document provides a high-level overview of the **collab-editor** application, focusing on the Spring Boot backend. It is the entry point to the rest of the documentation set.

## Table of Contents

| Document | Topic |
| --- | --- |
| [user-auth.md](./user-auth.md) | Authentication, JWT and the security filter chain |
| [documents.md](./documents.md) | Document and document content persistence, document locks |
| [sharing.md](./sharing.md) | Permissions, invites and access requests |
| [internal-worker.md](./internal-worker.md) | Internal auth, worker routing and the collaboration proxy service |
| [ws-ticket.md](./ws-ticket.md) | Websocket ticket (bootstrap handshake) flow |

---

## System Overview

`collab-editor` is a collaborative document editor. A set of **Angular** frontends talk to a **Spring Boot** backend, which is responsible for the majority of the application logic:

- **Authentication & authorization** — JWT-based auth, role/permission resolution, and a ticket flow that lets frontends authenticate WebSocket connections without leaking credentials into URLs.
- **Document lifecycle** — creating, reading and persisting documents, with the document body stored separately from its metadata because the content is disproportionately large.
- **Concurrency control** — document locking (exclusive and collaborative) so that multiple users can share a document without clobbering each other's edits.
- **Sharing** — granular permission levels, invite links and access-request approval.
- **Collaboration** — proxying document state to and from the `collaboration-state-worker` nodes, including load-balancing decisions based on the document id.

### External systems

- **PostgreSQL** — primary data store for the backend (users, documents, permissions, invites, access requests and locks).
- **Redis** — used by the websocket ticket flow to store a short-lived, opaque ticket alongside its associated user/document/permission context.
- **`collaboration-state-worker`** — a set of nodes that own the live collaborative state for a document during a session. The backend never lets the frontend talk to a worker directly; it always goes through the backend proxy.
- **`ws-service`** — the WebSocket gateway written in Go that frontends connect to for the realtime session.

---

## Main Components

The diagram below shows the Spring Boot backend's major packages and how the frontend and the external services fit around it.

```mermaid
flowchart LR
    subgraph UI["Frontend (Angular)"]
        FE[Document workspace / editor]
    end

    subgraph GW["ws-service (Go WebSocket gateway)"]
        WS[WebSocket hub]
    end

    subgraph BE["Spring Boot Backend"]
        direction TB
        AUTH["auth<br/>JWT, security filters, controllers"]
        DOC["document<br/>metadata + content + controller"]
        LOCK["lock<br/>exclusive / collaborative locks"]
        SHARE["sharing<br/>permissions, invites, access"]
        CTX["collaborationstateworkerclient<br/>routing + proxy"]
        TICKET["websocketticket<br/>WS bootstrap tickets"]
        SECT["config / SecurityConfig<br/>filter chain"]
    end

    subgraph DATA["Data & Workers"]
        PG[("PostgreSQL")]
        RD[("Redis")]
        subgraph WK["collaboration-state-worker nodes"]
            W0[collaboration-state-worker-0]
            W1[collaboration-state-worker-N]
        end
    end

    FE -->|REST + tickets| AUTH
    FE -->|REST| DOC
    FE -->|REST| LOCK
    FE -->|REST| SHARE
    FE -->|REST| CTX
    FE -->|REST| TICKET

    AUTH --> SECT
    DOC --> PG
    LOCK --> PG
    SHARE --> PG
    TICKET --> RD
    TICKET -->|permission check| SHARE

    CTX -->|document id hash routing| W0
    CTX -->|document id hash routing| W1

    FE -->|authenticated ws handshake using ticket| WS
    WS -->|state updates| W0
```

---

## Data Model (ER)

The backend persists its core domain in PostgreSQL. The entities live under
`src/main/java/com/somedomain/collab_editor/`. A summary of the model:

- **`users`** (`auth/User.java`) — application users; implements Spring Security's `UserDetails`.
- **`documents`** (`document/Document.java`) — document metadata; each document belongs to one owner.
- **`document_contents`** (`document/DocumentContent.java`) — the (large) body of a document, held in a separate table.
- **`document_locks`** (`lock/DocumentLock.java`) — an optional, one-to-one per-document lock that gates editing.
- **`document_permissions`** (`permission/DocumentPermission.java`) — grants a user a permission level on a document.
- **`invites`** (`invite/Invite.java`) — shareable invite tokens for a document.
- **`access_requests`** (`access/AccessRequest.java`) — pending requests from users asking for access to a document.

```mermaid
erDiagram
    users {
        bigint id PK
        varchar username UK
        varchar password_hash
        timestamp created_at
    }

    documents {
        bigint id PK
        bigint owner_id FK
        varchar title
        bigint content_id FK
        int version
        timestamp created_at
        timestamp last_modified
    }

    document_contents {
        bigint id PK
        text content
    }

    document_locks {
        bigint document_id PK, FK
        varchar lock_type
        bigint user_id FK
        timestamp locked_at
        timestamp expires_at
    }

    document_permissions {
        bigint id PK
        bigint document_id FK
        bigint user_id FK
        varchar level
        timestamp granted_at
    }

    invites {
        bigint id PK
        varchar token UK
        bigint document_id FK
        bigint created_by FK
        timestamp created_at
        timestamp expires_at
        boolean auto_approve
    }

    access_requests {
        bigint id PK
        bigint document_id FK
        bigint requester_id FK
        timestamp created_at
    }

    users ||--o{ documents : "owns"
    documents ||--|| document_contents : "has content"
    documents ||--o| document_locks : "is locked by"
    users ||--o{ document_locks : "holds"
    users ||--o{ document_permissions : "granted"
    documents ||--o{ document_permissions : "grants"
    users ||--o{ invites : "created by"
    documents ||--o{ invites : "targets"
    users ||--o{ access_requests : "requests"
    documents ||--o{ access_requests : "receives"
```

See [documents.md](./documents.md) and [sharing.md](./sharing.md) for the detailed notes behind each entity.